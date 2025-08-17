import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser } from "@/types";

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: Infinity,
  });

  const logout = () => {
    localStorage.removeItem('stoneflake_token');
    queryClient.clear(); // Clear all cached data
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    logout,
  };
}
