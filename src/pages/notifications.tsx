import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    const load = async () => {
      try {
        const data = await api.get("/notifications");
        setNotifications(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e: any) {
      console.error(e);
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read", {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e: any) {
      console.error(e);
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      booking: "📅",
      message: "💬",
      review: "⭐",
      job_application: "📋",
      payment: "💰",
      system: "🔔",
    };
    return icons[type] || "🔔";
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Notifications</h1>
          {unreadCount > 0 && <p className="text-muted-foreground text-sm">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
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
          <h3 className="text-lg font-bold mb-1">No notifications yet</h3>
          <p className="text-muted-foreground text-sm">When you get bookings or messages, they'll appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`bg-card border rounded-xl p-4 flex items-start gap-3 transition-all ${!notif.read ? "border-primary/30 bg-primary/5" : "border-card-border"}`}
            >
              <div className="text-xl shrink-0">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{notif.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{notif.body || notif.message}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{getTimeAgo(notif.createdAt)}</span>
                    {!notif.read && (
                      <button onClick={() => markRead(notif.id)} className="p-1 hover:bg-muted rounded transition-all">
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
