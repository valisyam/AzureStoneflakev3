import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { 
  Menu, 
  X, 
  Home, 
  FileText, 
  Package, 
  MessageSquare, 
  User,
  Bell,
  Settings,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import stoneflakeLogo from "@assets/Stoneflake_LOGO_EmblemWhitetransparent-01_1753819131039.png";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadMessages();

  // Fetch user profile to get company name
  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Request Quote", href: "/rfq", icon: FileText },
    { name: "My Requests", href: "/rfqs", icon: FileText },
    { name: "My Quotes", href: "/quotes", icon: Package },
    { name: "My Orders", href: "/orders", icon: Package },
    { name: "Order History", href: "/history", icon: Package },
    { name: "Messages", href: "/messages", icon: MessageSquare },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-teal-100 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-teal-800 via-slate-800 to-teal-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/20 flex-shrink-0">
          <Link href="/">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white/20 rounded-xl">
                <img src={stoneflakeLogo} alt="Stoneflake" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif', fontWeight: '700', letterSpacing: '0.05em' }}>S-HUB</h1>
                <p className="text-xs text-teal-200">Customer Portal</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation - Fixed, no scrolling */}
        <nav className="flex-1 p-4 space-y-2 overflow-hidden">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} onClick={() => setIsSidebarOpen(false)}>
                <div className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-white/20 text-white shadow-lg" 
                    : "text-teal-200 hover:text-white hover:bg-white/10"
                )}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                  {item.name === "Messages" && unreadCount > 0 && (
                    <div className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section - Always visible at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-white/20">
          <div className="text-white text-sm mb-3">
            <div className="font-medium">Welcome,</div>
            <div className="text-teal-200 font-medium">{user?.name || 'Customer'}</div>
            {profile?.companyName && (
              <div className="text-teal-300 text-xs mt-1 opacity-90">{profile.companyName}</div>
            )}
            {user?.userNumber && (
              <div className="text-teal-400 text-xs mt-1 opacity-80">User ID: {user.userNumber}</div>
            )}
          </div>
          <Button
            onClick={logout}
            variant="outline"
            size="sm"
            className="w-full bg-red-600 text-white border-red-500 hover:bg-red-700 hover:border-red-600 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-teal-600 via-slate-600 to-teal-700 border-b border-teal-300/20 sticky top-0 z-30 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-white hover:text-teal-100"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Header Title - Dynamic based on current page */}
              <div className="flex-1 lg:flex lg:items-center lg:justify-center">
                <h2 className="text-lg font-semibold text-white lg:text-xl">
                  {navigation.find(item => item.href === location)?.name || 'Customer Portal'}
                </h2>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-white hover:text-teal-100">
                  <Bell className="h-5 w-5" />
                </Button>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="text-white hover:text-teal-100">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}