export interface DashboardStats {
  activeRfqs: number;
  activeOrders: number;
  pendingQuotes: number;
  totalSpent: number;
}

export interface AdminStats {
  newRfqs: number;
  pendingReview: number;
  quotedToday: number;
  monthlyRevenue: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  isAdmin: boolean;
  role: 'customer' | 'supplier' | 'admin';
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  company?: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  requiresPasswordReset?: boolean;
  userId?: string;
}
