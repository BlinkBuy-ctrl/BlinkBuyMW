import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MessageCircle, Send, ArrowLeft, Search, Phone, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

// otechy8@gmail.com Supabase Auth UUID — update if it changes
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
  // Check existing
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${adminId}),and(user1_id.eq.${adminId},user2_id.eq.${userId})`
    )
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user1_id: userId, user2_id: adminId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Send welcome message from admin
  await supabase.from("messages").insert({
    conversation_id: created.id,
    sender_id: adminId,
    content: "👋 Welcome to BlinkBuy! I'm the Otechy Help Center. Need help? Want to send payment proof or report an issue? Just message me here anytime!",
  });

  return created.id;
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

  // Load conversations + ensure Help Center chat exists
  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    const load = async () => {
      try {
        // Ensure Help Center conversation exists
        const adminId = await getAdminId();
        if (adminId && adminId !== user.id) {
          await getOrCreateConversation(user.id, adminId);
        }

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

        const enriched = (data ?? []).map((conv: any) => {
          const other = conv.user1?.id === user.id ? conv.user2 : conv.user1;
          const isHelpCenter = other?.email === ADMIN_EMAIL;
          const sorted = [...(conv.messages ?? [])].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const lastMessage = sorted[0] ?? null;
          const unreadCount = (conv.messages ?? []).filter(
            (m: any) => !m.read && m.sender_id !== user.id
          ).length;
          return { ...conv, other, lastMessage, unreadCount, isHelpCenter };
        });

        // Sort: Help Center first
        enriched.sort((a: any, b: any) => {
          if (a.isHelpCenter) return -1;
          if (b.isHelpCenter) return 1;
          return 0;
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

  // Load messages when conversation selected
  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv]);

  // Realtime: new messages
  useEffect(() => {
    if (!selectedConv || !user) return;
    const channel = supabase
      .channel(`conv:${selectedConv.id}`, { config: { presence: { key: user.id } } })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === payload.new.id);
          return exists ? prev : [...prev, payload.new];
        });
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const otherId = selectedConv.other?.id;
        if (!otherId) return;
        const otherPresence = state[otherId];
        const isTyping = Array.isArray(otherPresence) && otherPresence.some((p) => p.typing);
        setOtherIsTyping(isTyping);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); setOtherIsTyping(false); };
  }, [selectedConv, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherIsTyping]);

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv || sending || !user) return;
    setSending(true);
    const text = newMsg;
    setNewMsg("");
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: selectedConv.id, sender_id: user.id, content: text })
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => [...prev, data]);
    } catch (e) {
      console.error(e);
      setNewMsg(text);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setNewMsg(value);
    if (!selectedConv || !user) return;
    const ch = supabase.channel(`conv:${selectedConv.id}`);
    ch.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { ch.track({ typing: false }); }, 2000);
  };

  const filteredConvs = conversations.filter((c) =>
    !search || c.other?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.isHelpCenter && "otechy help center".includes(search.toLowerCase()))
  );

  const getDisplayName = (conv: any) => {
    if (conv.isHelpCenter) return "🛡️ Otechy Help Center";
    return conv.other?.name ?? "Unknown";
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-120px)]">
      <div className="flex h-full bg-card border border-card-border rounded-2xl overflow-hidden shadow-lg">

        {/* Sidebar */}
        <div className={`${selectedConv ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 border-r border-border`}>
          <div className="p-4 border-b border-border">
            <h2 className="font-black text-base mb-3">Messages</h2>
            <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2">
              <Search size={13} className="text-muted-foreground" />
              <input
                type="text" value={search}
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
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageCircle size={32} className="text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Book a service to start chatting</p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const { lastMessage, unreadCount } = conv;
                const displayName = getDisplayName(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted transition-all text-left border-b border-border/50 ${selectedConv?.id === conv.id ? "bg-muted" : ""}`}
                  >
                    <div className="relative shrink-0">
                      {conv.isHelpCenter ? (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <Shield size={18} className="text-white" />
                        </div>
                      ) : conv.other?.profile_photo ? (
                        <img src={conv.other.profile_photo} alt={conv.other.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {conv.other?.name?.charAt(0) ?? "?"}
                        </div>
                      )}
                      {!conv.isHelpCenter && conv.other?.is_online && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                      {conv.isHelpCenter && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{displayName}</span>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(lastMessage.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      {lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{lastMessage.content}</p>
                      )}
                      {conv.isHelpCenter && !lastMessage && (
                        <p className="text-xs text-primary truncate">Tap to chat with support</p>
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

        {/* Chat area */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <button onClick={() => setSelectedConv(null)} className="sm:hidden text-muted-foreground hover:text-foreground">
                <ArrowLeft size={18} />
              </button>
              <div className="relative">
                {selectedConv.isHelpCenter ? (
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                    <Shield size={16} className="text-white" />
                  </div>
                ) : selectedConv.other?.profile_photo ? (
                  <img src={selectedConv.other.profile_photo} alt={selectedConv.other.name} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {selectedConv.other?.name?.charAt(0)}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{getDisplayName(selectedConv)}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedConv.isHelpCenter ? (
                    <span className="text-green-600">Official Support</span>
                  ) : otherIsTyping ? (
                    <span className="text-primary animate-pulse">typing…</span>
                  ) : selectedConv.other?.is_online ? "Online" : "Offline"}
                </div>
              </div>
              {!selectedConv.isHelpCenter && selectedConv.other?.phone && (
                <a href={`tel:${selectedConv.other.phone}`} className="p-2 hover:bg-muted rounded-lg transition-all">
                  <Phone size={16} className="text-muted-foreground" />
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"}`}>
                      {msg.content}
                      <div className={`text-xs mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  type="text" value={newMsg}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={selectedConv.isHelpCenter ? "Message Otechy Help Center..." : "Type a message..."}
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