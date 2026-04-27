import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Send, ArrowLeft, Search, Phone, Shield, CheckCheck, Mic, Paperclip, Smile } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "otechy8@gmail.com";

async function getAdminId(): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .single();
  return data?.id ?? null;
}

async function getOrCreateConversation(userId: string, adminId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(user1_id.eq.${userId},user2_id.eq.${adminId}),and(user1_id.eq.${adminId},user2_id.eq.${userId})`)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user1_id: userId, user2_id: adminId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("messages").insert({
    conversation_id: created.id,
    sender_id: adminId,
    content: "👋 Welcome to BlinkBuy! I'm the Otechy Help Center. Need help? Want to send payment proof or report an issue? Just message me here anytime!",
  });
  return created.id;
}

function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ name, photo, size = 40, isAdmin }: { name?: string; photo?: string; size?: number; isAdmin?: boolean }) {
  const colors = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (isAdmin) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Shield size={size * 0.42} color="white" />
    </div>
  );
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: size * 0.38, flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConversations = async () => {
    if (!user) return;
    try {
      // Timeout to prevent hanging on slow connections
      const adminId = await Promise.race([
        getAdminId(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (adminId && adminId !== user.id) {
        await Promise.race([
          getOrCreateConversation(user.id, adminId),
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
      }
      const { data, error } = await supabase
        .from("conversations")
        .select(`*, user1:profiles!conversations_user1_id_fkey(*), user2:profiles!conversations_user2_id_fkey(*), messages(id, content, sender_id, read, created_at)`)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const enriched = (data ?? []).map((conv: any) => {
        const other = conv.user1?.id === user.id ? conv.user2 : conv.user1;
        const isHelpCenter = other?.email === ADMIN_EMAIL;
        const sorted = [...(conv.messages ?? [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { ...conv, other, lastMessage: sorted[0] ?? null, unreadCount: (conv.messages ?? []).filter((m: any) => !m.read && m.sender_id !== user.id).length, isHelpCenter };
      });
      enriched.sort((a: any, b: any) => { if (a.isHelpCenter) return -1; if (b.isHelpCenter) return 1; return 0; });
      setConversations(enriched);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    loadConversations();
  }, [user]);

  useEffect(() => { if (selectedConv) loadMessages(selectedConv.id); }, [selectedConv]);

  // Realtime: messages in open chat
  useEffect(() => {
    if (!selectedConv || !user) return;
    const channel = supabase
      .channel(`conv:${selectedConv.id}`, { config: { presence: { key: user.id } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConv.id}` }, (payload) => {
        setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const otherId = selectedConv.other?.id;
        if (!otherId) return;
        const op = state[otherId];
        setOtherIsTyping(Array.isArray(op) && op.some((p) => p.typing));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); setOtherIsTyping(false); };
  }, [selectedConv, user]);

  // Realtime: sidebar refresh
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`user-convs:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => { if (!selectedConv) return; messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, otherIsTyping, selectedConv]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages(data ?? []);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv || sending || !user) return;
    setSending(true);
    const text = newMsg;
    setNewMsg("");
    try {
      const { data, error } = await supabase.from("messages").insert({ conversation_id: selectedConv.id, sender_id: user.id, content: text }).select().single();
      if (error) throw error;
      setMessages((prev) => [...prev, data]);
    } catch (e) { setNewMsg(text); } finally { setSending(false); }
  };

  const handleTyping = (value: string) => {
    setNewMsg(value);
    if (!selectedConv || !user) return;
    const ch = supabase.channel(`conv:${selectedConv.id}`);
    ch.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => ch.track({ typing: false }), 2000);
  };

  const filteredConvs = conversations.filter((c) =>
    !search || c.other?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.isHelpCenter && "otechy help center".includes(search.toLowerCase()))
  );

  const getDisplayName = (conv: any) => conv.isHelpCenter ? "Otechy Help Center" : (conv.other?.name ?? "Unknown");

  if (!user) return null;

  // Group messages by date
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg) => {
    const d = new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === d) last.msgs.push(msg);
    else groupedMessages.push({ date: d, msgs: [msg] });
  });

  return (
    <div style={{ display: "flex", height: "calc(100dvh - 64px)", background: "#0f1117", fontFamily: "'SF Pro Display', -apple-system, sans-serif", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: selectedConv ? "0" : "100%",
        maxWidth: "360px",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "#13161f",
        transition: "width 0.25s ease",
        overflow: "hidden",
        flexShrink: 0,
        ...(typeof window !== "undefined" && window.innerWidth >= 640 ? { width: "360px", display: "flex" } : {}),
      }}
        className="sm:flex sm:w-80"
      >
        {/* Header */}
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Messages</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(37,99,235,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
            </div>
          </div>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "9px 12px" }}>
            <Search size={14} color="rgba(255,255,255,0.35)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, "::placeholder": { color: "rgba(255,255,255,0.3)" } } as any}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 8, width: "60%" }} />
                  <div style={{ height: 10, background: "rgba(255,255,255,0.04)", borderRadius: 6, width: "40%" }} />
                </div>
              </div>
            ))
          ) : filteredConvs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 10, opacity: 0.4 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <p style={{ fontSize: 14, fontWeight: 600 }}>No conversations yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Book a service to start chatting</p>
            </div>
          ) : filteredConvs.map((conv) => {
            const isActive = selectedConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 16px", background: isActive ? "rgba(37,99,235,0.12)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                  borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Avatar name={getDisplayName(conv)} photo={conv.other?.profile_photo} size={48} isAdmin={conv.isHelpCenter} />
                  {(conv.isHelpCenter || conv.other?.is_online) && (
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", border: "2px solid #13161f" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                      {conv.isHelpCenter ? "🛡️ " : ""}{getDisplayName(conv)}
                    </span>
                    {conv.lastMessage && (
                      <span style={{ fontSize: 11, color: conv.unreadCount > 0 ? "#2563eb" : "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        {timeAgo(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                      {conv.lastMessage?.content ?? (conv.isHelpCenter ? "Tap to chat with support" : "No messages yet")}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat Area ── */}
      {selectedConv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f1117", minWidth: 0 }}>

          {/* Chat header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            background: "rgba(19,22,31,0.95)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button onClick={() => setSelectedConv(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", display: "flex", alignItems: "center", padding: 4 }} className="sm:hidden">
              <ArrowLeft size={20} />
            </button>
            <div style={{ position: "relative" }}>
              <Avatar name={getDisplayName(selectedConv)} photo={selectedConv.other?.profile_photo} size={40} isAdmin={selectedConv.isHelpCenter} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #13161f" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {selectedConv.isHelpCenter ? "🛡️ Otechy Help Center" : getDisplayName(selectedConv)}
              </div>
              <div style={{ fontSize: 12 }}>
                {otherIsTyping ? (
                  <span style={{ color: "#2563eb" }}>typing…</span>
                ) : selectedConv.isHelpCenter ? (
                  <span style={{ color: "#22c55e" }}>Official Support · Always active</span>
                ) : selectedConv.other?.is_online ? (
                  <span style={{ color: "#22c55e" }}>Online</span>
                ) : (
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>Offline</span>
                )}
              </div>
            </div>
            {!selectedConv.isHelpCenter && selectedConv.other?.phone && (
              <a href={`tel:${selectedConv.other.phone}`} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", textDecoration: "none" }}>
                <Phone size={16} />
              </a>
            )}
          </div>

          {/* Messages area */}
          <div
            style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 2,
              backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.03) 0%, transparent 60%)",
            }}
          >
            {groupedMessages.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 12px" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>{date}</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>

                {msgs.map((msg: any, i: number) => {
                  const isMine = msg.sender_id === user.id;
                  const prevMine = i > 0 && msgs[i - 1].sender_id === msg.sender_id;
                  const nextMine = i < msgs.length - 1 && msgs[i + 1].sender_id === msg.sender_id;

                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: nextMine ? 2 : 8, alignItems: "flex-end", gap: 6 }}>
                      {!isMine && !nextMine && (
                        <Avatar name={getDisplayName(selectedConv)} photo={selectedConv.other?.profile_photo} size={28} isAdmin={selectedConv.isHelpCenter} />
                      )}
                      {!isMine && nextMine && <div style={{ width: 28, flexShrink: 0 }} />}

                      <div style={{
                        maxWidth: "72%",
                        padding: "9px 13px",
                        borderRadius: isMine
                          ? `18px 18px ${nextMine ? "18px" : "4px"} 18px`
                          : `18px 18px 18px ${nextMine ? "18px" : "4px"}`,
                        background: isMine
                          ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                          : "rgba(255,255,255,0.07)",
                        backdropFilter: "blur(10px)",
                        boxShadow: isMine ? "0 2px 12px rgba(37,99,235,0.3)" : "none",
                        wordBreak: "break-word",
                      }}>
                        <p style={{ fontSize: 14, color: "#fff", margin: 0, lineHeight: 1.45 }}>{msg.content}</p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: isMine ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)" }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMine && <CheckCheck size={12} color="rgba(255,255,255,0.55)" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {otherIsTyping && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 8 }}>
                <Avatar name={getDisplayName(selectedConv)} photo={selectedConv.other?.profile_photo} size={28} isAdmin={selectedConv.isHelpCenter} />
                <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.07)", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.5)", display: "inline-block", animation: `bounce 1.2s ${delay}ms infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: "10px 12px",
            paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
            background: "rgba(19,22,31,0.97)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Smile size={18} />
            </button>

            <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", borderRadius: 22, padding: "0 14px", border: "1px solid rgba(255,255,255,0.08)", transition: "border-color 0.2s" }}>
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                value={newMsg}
                onChange={(e) => handleTyping(e.target.value)}
                onFocus={() => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 350)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={selectedConv.isHelpCenter ? "Message Otechy Help Center…" : "Message…"}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, padding: "11px 0", minWidth: 0 }}
              />
              {!newMsg && (
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 4 }}>
                  <Paperclip size={16} />
                </button>
              )}
            </div>

            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: "50%", border: "none", cursor: newMsg.trim() ? "pointer" : "default",
                background: newMsg.trim() ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all 0.2s", boxShadow: newMsg.trim() ? "0 2px 12px rgba(37,99,235,0.4)" : "none",
                transform: newMsg.trim() ? "scale(1.05)" : "scale(1)",
              }}
            >
              {newMsg.trim()
                ? <Send size={16} color="white" style={{ transform: "translateX(1px)" }} />
                : <Mic size={16} color="rgba(255,255,255,0.3)" />
              }
            </button>
          </div>
        </div>
      ) : (
        /* Empty state — desktop only */
        <div className="hidden sm:flex" style={{ flex: 1, alignItems: "center", justifyContent: "center", background: "#0f1117" }}>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(37,99,235,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(37,99,235,0.6)" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>Select a conversation</p>
            <p style={{ fontSize: 13, marginTop: 6, color: "rgba(255,255,255,0.15)" }}>Choose from your messages on the left</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input::placeholder { color: rgba(255,255,255,0.28); }
        button:active { opacity: 0.8; }
      `}</style>
    </div>
  );
}
