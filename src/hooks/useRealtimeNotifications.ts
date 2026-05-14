import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface RealtimeCounts {
  notifications: number;
  messages: number;
}

type CountSetter = (updater: (prev: RealtimeCounts) => RealtimeCounts) => void;

// Toast labels per notification type
const NOTIF_LABELS: Record<string, string> = {
  booking:     "📅 New booking request",
  message:     "💬 New message",
  job_apply:   "📋 New job application",
  review:      "⭐ New review received",
  system:      "🔔 New notification",
};

export function useRealtimeNotifications(
  userId: string | null | undefined,
  setCounts: CountSetter
) {
  const { toast } = useToast();
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const cleanup = useCallback(() => {
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];
  }, []);

  useEffect(() => {
    if (!userId) return;

    // ── Channel 1: notifications table ──────────────────────────────
    const notifChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          // Increment badge
          setCounts(prev => ({ ...prev, notifications: prev.notifications + 1 }));
          // Toast
          const label = NOTIF_LABELS[row?.type] ?? NOTIF_LABELS.system;
          toast({
            title: label,
            description: row?.message ?? "",
            duration: 4000,
          });
        }
      )
      .subscribe();

    // ── Channel 2: messages table (conversations this user is in) ───
    // We filter on receiver_id OR check conversation membership via
    // a broad channel + client-side filter to avoid complex RLS issues
    const msgChannel = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const row = payload.new as any;
          // Only count if sender is NOT this user
          if (row?.sender_id === userId) return;

          // Verify this message belongs to a conversation the user is in
          const { data } = await supabase
            .from("conversations")
            .select("id")
            .eq("id", row.conversation_id)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .maybeSingle();

          if (!data) return; // not our conversation

          setCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
          toast({
            title: "💬 New message",
            description: row?.content?.slice(0, 60) ?? "",
            duration: 3500,
          });
        }
      )
      .subscribe();

    channelsRef.current = [notifChannel, msgChannel];

    return cleanup;
  }, [userId, setCounts, toast, cleanup]);
}
