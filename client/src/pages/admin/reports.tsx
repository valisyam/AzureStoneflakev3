import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  Users,
  Calendar,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportData {
  overview: {
    totalCustomers: number;
    totalRfqs: number;
    totalOrders: number;
    totalRevenue: number;
  };
  trends: {
    rfqsThisMonth: number;
    rfqsLastMonth: number;
    ordersThisMonth: number;
    ordersLastMonth: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    company?: string;
    totalSpent: number;
    orderCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'rfq' | 'order' | 'quote';
    customer: string;
    description: string;
    date: string;
    amount?: number;
  }>;
}

export default function AdminReports() {
  const { user } = useAuth();

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/admin/reports"],
    enabled: user?.isAdmin,
  });

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

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return "text-green-600";
    if (current < previous) return "text-red-600";
    return "text-gray-600";
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'rfq': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'order': return <ShoppingCart className="h-4 w-4 text-green-500" />;
      case 'quote': return <DollarSign className="h-4 w-4 text-purple-500" />;
      default: return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <AdminLayout>
      
      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Business Reports</h2>
          <p className="text-gray-600 mt-2">Analytics and insights for your manufacturing business</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-96 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        ) : reportData ? (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="text-blue-500 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.overview.totalCustomers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <FileText className="text-yellow-500 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total RFQs</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.overview.totalRfqs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <ShoppingCart className="text-green-500 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{reportData.overview.totalOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <DollarSign className="text-purple-500 h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">${reportData.overview.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Customers */}
              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Top Customers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportData.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-teal-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          {customer.company && (
                            <p className="text-sm text-gray-500">{customer.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${customer.totalSpent.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{customer.orderCount} orders</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="rounded-2xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="mr-3">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.customer}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 text-gray-400 mr-1" />
                          <p className="text-xs text-gray-500">{activity.date}</p>
                        </div>
                      </div>
                      {activity.amount && (
                        <div className="text-right">
                          <p className="font-bold text-gray-900">${activity.amount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="rounded-2xl shadow-sm border border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500 text-center">
                Reports will be available once you have customers and orders.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </AdminLayout>
  );
}