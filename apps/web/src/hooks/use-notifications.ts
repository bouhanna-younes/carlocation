"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { mapNotification, type Notification } from "@/lib/mappers";
import type { NotificationRow } from "@/lib/supabase/database.types";

/**
 * Unified notifications hook — replaces the duplicated query/realtime
 * logic previously scattered across sidebar.tsx and topbar.tsx.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<NotificationRow[]>();
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapNotification);
    },
  });

  const unreadCount = (query.data ?? []).filter((n) => !n.isRead).length;
  const unreadNotifications = (query.data ?? []).filter((n) => !n.isRead).slice(0, 8);
  const recentNotifications = (query.data ?? []).slice(0, 10);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true } as never)
        .eq("is_read", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: query.data ?? [],
    unreadCount,
    unreadNotifications,
    recentNotifications,
    isLoading: query.isLoading,
    error: query.error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
