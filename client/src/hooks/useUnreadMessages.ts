import { useQuery } from "@tanstack/react-query";

export function useUnreadMessages() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
  };
}