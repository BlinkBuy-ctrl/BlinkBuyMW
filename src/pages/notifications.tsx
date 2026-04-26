import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    let mounted = true;
    loadNotifications(mounted);

    // Realtime — new notifications
    const channel = supabase
      .channel("notifications:" + user.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (mounted) setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user]);

  const loadNotifications = async (mounted: boolean) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (mounted) setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from("notifications")
      .update({ read: true })
      .eq("user_id", user!.id)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      booking: "📅", message: "💬", review: "⭐",
      job_application: "📋", payment: "💰",
      new_listing: "🆕", new_service: "🔧",
      new_item: "🛍️", system: "🔔", welcome: "👋",
    };
    return icons[type] || "🔔";
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={48} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-bold mb-1 text-foreground">No notifications yet</h3>
          <p className="text-muted-foreground text-sm">Bookings, messages and new listings will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div key={notif.id}
              className={`bg-card border rounded-xl p-4 flex items-start gap-3 transition-all ${!notif.read ? "border-primary/30 bg-primary/5" : "border-card-border"}`}>
              <div className="text-xl shrink-0">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{notif.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{notif.body || notif.message}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {getTimeAgo(notif.created_at)}
                    </span>
                    {!notif.read && (
                      <button onClick={() => markRead(notif.id)}
                        className="p-1 hover:bg-muted rounded transition-all">
                        <Check size={12} className="text-primary" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
