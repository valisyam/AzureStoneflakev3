import { ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  FileText, 
  Package, 
  MessageSquare, 
  User, 
  LogOut,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import stoneflakeLogo from "@assets/Stoneflake_LOGO_EmblemWhitetransparent-01_1753819131039.png";

interface SupplierLayoutProps {
  children: ReactNode;
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { unreadCount } = useUnreadMessages();
  
  // Get notifications for pending RFQ count
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/supplier/notifications'],
  });
  
  // Count unread RFQ assignment notifications
  const pendingRfqCount = (notifications as any[]).filter(
    (notification: any) => notification.type === 'rfq_assignment' && !notification.isRead
  ).length;

  const navigation = [
    { name: 'Dashboard', href: '/supplier/dashboard', icon: LayoutDashboard },
    { name: 'RFQs', href: '/supplier/rfqs', icon: FileText },
    { name: 'My Quotes', href: '/supplier/quotes', icon: Package },
    { name: 'Purchase Orders', href: '/supplier/purchase-orders', icon: FileText },
    { name: 'Messages', href: '/supplier/messages', icon: MessageSquare },
    { name: 'Profile', href: '/supplier/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-blue-800 via-slate-800 to-blue-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/20 flex-shrink-0">
          <Link href="/supplier/dashboard">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-white/20 rounded-xl">
                <img src={stoneflakeLogo} alt="Stoneflake" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif', fontWeight: '700', letterSpacing: '0.05em' }}>S-HUB</h1>
                <p className="text-xs text-blue-200">by Stoneflake</p>
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
                    : "text-blue-200 hover:text-white hover:bg-white/10"
                )}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.name === 'RFQs' && pendingRfqCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 px-2 text-xs">
                      {pendingRfqCount}
                    </Badge>
                  )}
                  {item.name === 'Messages' && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 px-2 text-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
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
            <div className="text-blue-200">{user?.name || 'User'}</div>
            {(user as any)?.userNumber && (
              <div className="text-blue-300 text-xs">User #{(user as any).userNumber}</div>
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

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-blue-600 via-slate-600 to-blue-700 border-b border-blue-300/20 sticky top-0 z-30 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-white hover:text-blue-100"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Header Title - Company Branding */}
              <div className="flex-1 lg:flex lg:items-center lg:justify-center">
                <h2 className="text-lg font-semibold text-white lg:text-xl">
                  Stoneflake Manufacturing Inc
                </h2>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-white hover:text-blue-100">
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}