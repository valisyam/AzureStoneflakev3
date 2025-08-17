import { queryClient } from "./queryClient";

export function refreshUserData() {
  // Invalidate the auth cache to force a fresh fetch
  queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
}