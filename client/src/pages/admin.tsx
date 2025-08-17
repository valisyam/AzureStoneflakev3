import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/AdminLayout";
import RFQTable from "@/components/admin/rfq-table";
import OrderTracking from "@/components/admin/order-tracking";
import ArchivedOrders from "@/components/admin/archived-orders";
import QualityCheckNotifications from "@/components/admin/quality-check-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Inbox, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  Archive, 
  Building2, 
  Hash, 
  Send, 
  Users, 
  BarChart3, 
  FileText, 
  Package, 
  TrendingUp,
  Quote,
  UserCheck,
  Factory,
  Plus,
  ArrowRight
} from "lucide-react";
import { AdminStats } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
    }
  }, [user, authLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/dashboard/stats"],
    enabled: user?.isAdmin,
  });

  // Show loading or redirect if not admin
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "New RFQs",
      value: stats?.newRfqs || 0,
      icon: Inbox,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      description: "Awaiting review",
    },
    {
      title: "Pending Review",
      value: stats?.pendingReview || 0,
      icon: Clock,
      bgColor: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
      description: "Need attention",
    },
    {
      title: "Quoted Today",
      value: stats?.quotedToday || 0,
      icon: CheckCircle,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
      description: "Completed today",
    },
    {
      title: "Revenue (MTD)",
      value: stats ? `$${stats.monthlyRevenue.toLocaleString()}` : "$0",
      icon: DollarSign,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
      description: "This month",
    },
  ];

  const quickActions = [
    {
      title: "Create Quote",
      description: "Create new quote for customer",
      href: "/admin/create-quote",
      icon: Plus,
      color: "bg-blue-500"
    },
    {
      title: "Customer Management",
      description: "Manage customer accounts",
      href: "/admin/customers", 
      icon: Users,
      color: "bg-green-500"
    },
    {
      title: "Supplier Management",
      description: "Manage supplier relationships",
      href: "/admin/supplier-management",
      icon: UserCheck,
      color: "bg-purple-500"
    },
    {
      title: "Purchase Orders",
      description: "Manage purchase orders",
      href: "/admin/purchase-orders",
      icon: Package,
      color: "bg-orange-500"
    }
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of business operations and key metrics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <div className="flex items-baseline">
                        <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${action.color} text-white`}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-500">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent RFQs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Recent RFQs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RFQTable limit={5} />
              <div className="mt-4">
                <Link href="/admin/customers">
                  <Button variant="outline" size="sm" className="w-full">
                    View All RFQs
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quality Check Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Quality Checks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QualityCheckNotifications />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}