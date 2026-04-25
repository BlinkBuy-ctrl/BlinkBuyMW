import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MessageCircle, Send, ArrowLeft, Search, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

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

  // ── Load conversations ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    const load = async () => {
      try {
        // Select both participants explicitly so we can resolve "the other user"
        // without ambiguity regardless of whether current user is user1 or user2.
        const { data, error } = await supabase
          .from("conversations")
          .select(`
            *,
            user1:profiles!conversations_user1_id_fkey(*),
            user2:profiles!conversations_user2_id_fkey(*),
            messages(id, content, sender_id, read, created_at)
          `)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Attach derived helpers: `other`, `lastMessage`, `unreadCount`
        const enriched = (data ?? []).map((conv: any) => {
          const other = conv.user1?.id === user.id ? conv.user2 : conv.user1;
          const sorted = [...(conv.messages ?? [])].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const lastMessage = sorted[0] ?? null;
          const unreadCount = (conv.messages ?? []).filter(
            (m: any) => !m.read && m.sender_id !== user.id
          ).length;
          return { ...conv, other, lastMessage, unreadCount };
        });

        setConversations(enriched);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // ── Load messages when conversation selected ────────────────────────────────
  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv]);

  // ── Realtime: new messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConv || !user) return;

    const channel = supabase
      .channel(`conv:${selectedConv.id}`, { config: { presence: { key: user.id } } })
      // New message inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            return exists ? prev : [...prev, payload.new];
          });
        }
      )
      // Presence: track who is typing
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const otherId = selectedConv.other?.id;
        if (!otherId) return;
        const otherPresence = state[otherId];
        const isTyping = Array.isArray(otherPresence) && otherPresence.some((p) => p.typing);
        setOtherIsTyping(isTyping);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setOtherIsTyping(false);
    };
  }, [selectedConv, user]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherIsTyping]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const loadMessages = async (convId: string) => {
    try {
      const data = await api.get(`/conversations/${convId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv || sending) return;
    setSending(true);
    const text = newMsg;
    setNewMsg("");
    try {
      const msg = await api.post(`/conversations/${selectedConv.id}/messages`, { content: text });
      setMessages((prev) => [...prev, msg]);
    } catch (e) {
      console.error(e);
      setNewMsg(text);
    } finally {
      setSending(false);
    }
  };

  // Broadcast typing presence on the active channel
  const handleTyping = (value: string) => {
    setNewMsg(value);
    if (!selectedConv || !user) return;

    // We need a reference to the active channel — look it up from supabase internals
    const channelName = `conv:${selectedConv.id}`;
    const ch = supabase.channel(channelName);

    ch.track({ typing: true });

    // Clear typing after 2 s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      ch.track({ typing: false });
    }, 2000);
  };

  const filteredConvs = conversations.filter((c) =>
    !search || c.other?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-120px)]">
      <div className="flex h-full bg-card border border-card-border rounded-2xl overflow-hidden shadow-lg">

        {/* ── Sidebar: conversation list ─────────────────────────────────── */}
        <div className={`${selectedConv ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 border-r border-border`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-black text-base mb-3">Messages</h2>
            <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2">
              <Search size={13} className="text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle size={32} className="text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Book a service to start chatting</p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const { other, lastMessage, unreadCount } = conv;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted transition-all text-left border-b border-border/50 ${
                      selectedConv?.id === conv.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      {other?.profile_photo ? (
                        <img
                          src={other.profile_photo}
                          alt={other.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {other?.name?.charAt(0) ?? "?"}
                        </div>
                      )}
                      {other?.is_online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{other?.name ?? "Unknown"}</span>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(lastMessage.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{lastMessage.content}</p>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                        {unreadCount}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ─────────────────────────────────────────────────── */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            {(() => {
              const { other } = selectedConv;
              return (
                <div className="flex items-center gap-3 p-4 border-b border-border">
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="sm:hidden text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="relative">
                    {other?.profile_photo ? (
                      <img
                        src={other.profile_photo}
                        alt={other.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {other?.name?.charAt(0)}
                      </div>
                    )}
                    {other?.is_online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{other?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {otherIsTyping ? (
                        <span className="text-primary animate-pulse">typing…</span>
                      ) : other?.is_online ? (
                        "Online"
                      ) : (
                        "Offline"
                      )}
                    </div>
                  </div>
                  {other?.phone && (
                    <a
                      href={`tel:${other.phone}`}
                      className="p-2 hover:bg-muted rounded-lg transition-all"
                    >
                      <Phone size={16} className="text-muted-foreground" />
                    </a>
                  )}
                </div>
              );
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                // API returns camelCase (senderId) but realtime returns snake_case (sender_id)
                const isMine = (msg.senderId ?? msg.sender_id) === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-xs mt-1 ${
                          isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.createdAt ?? msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator bubble */}
              {otherIsTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground px-3 py-2 rounded-2xl rounded-bl-none text-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim() || sending}
                  className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle size={48} className="text-muted-foreground mx-auto mb-3 opacity-30" />
              <h3 className="font-bold text-muted-foreground">Select a conversation</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
