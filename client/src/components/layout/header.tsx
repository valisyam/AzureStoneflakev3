import { useAuth } from "@/hooks/useAuth";
import { removeAuthToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import stoneflakeLogo from "@assets/Stoneflake_LOGO_EmblemWhitetransparent-01_1753819131039.png";

export default function Header() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Force refresh user data to get updated company info
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, [queryClient]);

  const handleLogout = () => {
    removeAuthToken();
    // Force a full page reload to clear all state and redirect to landing
    window.location.href = "/";
  };

  const handleNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    const homePath = getHomePath();
    navigate(homePath);
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleNavigateToPage = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    // Scroll to top for dashboard navigation
    if (href === "/") {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  };

  // Get home path based on user role
  const getHomePath = () => {
    if (user?.isAdmin && user.email === 'vineeth@stone-flake.com') {
      return "/admin";
    } else if (user?.role === 'supplier') {
      return "/supplier";
    }
    return "/";
  };

  // Main header navigation - keep only essential items
  const mainNavItems = [
    { href: getHomePath(), label: "Home", active: location === getHomePath(), key: "home" },
    ...(user?.role === 'customer' ? [
      { href: "/rfq", label: "Submit RFQ", active: location === "/rfq", key: "rfq" },
    ] : []),
    ...(user?.isAdmin && user.email === 'vineeth@stone-flake.com' ? [
      { href: "/admin", label: "Admin Portal", active: location.startsWith("/admin"), key: "admin" }
    ] : []),
    ...(user?.role === 'supplier' ? [
      { href: "/supplier", label: "Supplier Portal", active: location.startsWith("/supplier"), key: "supplier" }
    ] : []),
  ];

  // All navigation items for mobile menu
  const allNavItems = [
    { href: "/", label: "Dashboard", active: location === "/" },
    { href: "/rfq", label: "Submit RFQ", active: location === "/rfq" },
    { href: "/rfqs", label: "My RFQs", active: location === "/rfqs" },
    { href: "/orders", label: "Orders", active: location === "/orders" },
    { href: "/quotes", label: "Quotes", active: location === "/quotes" },
    { href: "/history", label: "History", active: location === "/history" },
    ...(user?.isAdmin && user.email === 'vineeth@stone-flake.com' ? [
      { href: "/admin", label: "Admin", active: location === "/admin" },
      { href: "/admin/customers", label: "Customers", active: location === "/admin/customers" },
      { href: "/admin/companies", label: "Companies & Customer Numbers", active: location === "/admin/companies" },
      { href: "/admin/rfq-assignments", label: "RFQ Assignments", active: location === "/admin/rfq-assignments" },
      { href: "/admin/supplier-quotes", label: "Supplier Quotes", active: location === "/admin/supplier-quotes" },
      { href: "/admin/supplier-management", label: "Supplier Management", active: location === "/admin/supplier-management" }
    ] : []),
  ];

  return (
    <>
      <header className="bg-gradient-to-r from-teal-500 to-blue-600 border-b border-gray-200 sticky top-0 z-50 shadow-lg">
        <div className="px-6">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Logo */}
            <div onClick={handleNavigateHome} className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/20">
                <div className="flex items-center space-x-2">
                  <img src={stoneflakeLogo} alt="Stoneflake" className="h-12 w-12" />
                  <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-white leading-tight" style={{ fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif', fontWeight: '700', letterSpacing: '0.05em' }}>S-HUB</h1>
                    <p className="text-xs text-white/80 leading-tight">by Stoneflake</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {mainNavItems.map((item) => (
                <span 
                  key={item.key || item.href} 
                  onClick={handleNavigateToPage(item.href)}
                  className={`px-4 py-3 text-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    item.active 
                      ? "text-white font-semibold" 
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </nav>

            {/* Right side - User Profile & Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="lg"
                className="lg:hidden text-white hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </Button>
              
              {/* User profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 text-white hover:bg-white/10 px-2 py-2">
                    <div className="flex flex-col items-end min-w-0 hidden sm:block">
                      <div className="text-white font-medium text-base truncate max-w-[180px] leading-tight">{user?.name}</div>
                      <div className="text-white/70 text-sm truncate max-w-[180px] leading-tight">{user?.company || user?.email}</div>
                    </div>
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-white/20 text-white text-lg">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 shadow-lg sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <nav className="grid grid-cols-2 gap-2">
              {allNavItems.map((item) => (
                <span
                  key={item.href}
                  onClick={(e) => {
                    handleNavigateToPage(item.href)(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors cursor-pointer text-center ${
                    item.active
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
