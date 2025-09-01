import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  FileText,
  MessageSquare,
  Package,
  Users,
  Building2,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import SupplierLayout from "../../components/layout/SupplierLayout";

interface SupplierStats {
  pendingRfqs: number;
  submittedQuotes: number;
  acceptedQuotes: number;
  unreadNotifications: number;
}

export default function SupplierDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<SupplierStats>({
    queryKey: ["/api/supplier/dashboard/stats"],
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/supplier/notifications"],
  });

  const { data: recentRfqs = [] } = useQuery({
    queryKey: ["/api/supplier/rfqs"],
  });

  if (isLoading) {
    return (
      <SupplierLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SupplierLayout>
    );
  }

  // Filter notifications for new RFQs - only show unread notifications
  const newRfqNotifications = (notifications as any[]).filter(
    (notification: any) => {
      return notification.type === "rfq_assignment" && !notification.isRead;
    },
  );

  return (
    <SupplierLayout>
      <div className="space-y-6">
        {/* Enhanced Header with Company Name */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {(user as any)?.companyName || 
                   (user as any)?.companyNameInput || 
                   "Your Company"}
                </h1>
                <p className="text-lg text-blue-100">Supplier Dashboard</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {(user as any)?.customerNumber || "V0000"}
                  </span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-200" />
                  <span className="text-sm font-medium">
                    Active Partnership
                  </span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-200" />
                  <span className="text-sm font-medium">Verified Supplier</span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* New RFQ Alerts */}
        {newRfqNotifications.length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-orange-800 flex items-center">
                <Bell className="h-5 w-5 mr-2 text-orange-600" />
                🔔 New Quote Requests ({newRfqNotifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {newRfqNotifications.slice(0, 3).map((notification: any) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg shadow-sm"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <Link href="/supplier/rfqs">
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        View RFQ
                      </Button>
                    </Link>
                  </div>
                ))}
                {newRfqNotifications.length > 3 && (
                  <div className="text-center pt-2">
                    <Link href="/supplier/rfqs">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        View All {newRfqNotifications.length} New RFQs
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending RFQs
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {stats?.pendingRfqs || 0}
              </div>
              <p className="text-xs text-gray-500">Awaiting your quote</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Submitted Quotes
              </CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.submittedQuotes || 0}
              </div>
              <p className="text-xs text-gray-500">Under review</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:border-green-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Accepted Quotes
              </CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.acceptedQuotes || 0}
              </div>
              <p className="text-xs text-gray-500">Converted to orders</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Notifications
              </CardTitle>
              <Bell className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {stats?.unreadNotifications || 0}
              </div>
              <p className="text-xs text-gray-500">Unread messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-gray-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/supplier/rfqs">
                <Button className="w-full h-16 bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 text-white shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <FileText className="h-6 w-6 mx-auto mb-1" />
                    <div>View RFQs</div>
                  </div>
                </Button>
              </Link>

              <Link href="/supplier/quotes">
                <Button className="w-full h-16 bg-gradient-to-r from-slate-600 to-blue-700 hover:from-slate-700 hover:to-blue-800 text-white shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <Package className="h-6 w-6 mx-auto mb-1" />
                    <div>My Quotes</div>
                  </div>
                </Button>
              </Link>

              <Link href="/supplier/profile">
                <Button className="w-full h-16 bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-1" />
                    <div>Update Profile</div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Benefits & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-slate-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Why Choose S-Hub?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Direct Access to Quality Projects
                    </h4>
                    <p className="text-sm text-gray-600">
                      Get connected with verified manufacturers seeking your
                      expertise
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-slate-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Streamlined Quote Process
                    </h4>
                    <p className="text-sm text-gray-600">
                      Submit quotes quickly with our intuitive interface and
                      file management
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Performance Incentives
                    </h4>
                    <p className="text-sm text-gray-600">
                      Higher completion rates unlock priority access to premium
                      RFQs
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Expand Your Network
                    </h4>
                    <p className="text-sm text-gray-600">
                      Connect with leading manufacturers across diverse
                      industries
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Secure Payments
                    </h4>
                    <p className="text-sm text-gray-600">
                      Reliable payment processing with transparent terms and
                      conditions
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Real-time Communication
                    </h4>
                    <p className="text-sm text-gray-600">
                      Direct messaging system for efficient project coordination
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance & Earnings Tracker */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Performance & Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">$0</div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-xs text-amber-600 mt-1">
                  Complete your first order to start earning
                </p>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">0%</div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-xs text-amber-600 mt-1">
                  Build your reputation with successful deliveries
                </p>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">Starter</div>
                <p className="text-sm text-gray-600">Supplier Level</p>
                <p className="text-xs text-amber-600 mt-1">
                  Complete 5 orders to reach Pro level
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent RFQs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent RFQ Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {(recentRfqs as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(recentRfqs as any[]).slice(0, 5).map((rfq: any) => (
                    <div
                      key={rfq.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{rfq.rfq.projectName}</h4>
                        <p className="text-sm text-gray-500">
                          {rfq.rfq.material}
                        </p>
                      </div>
                      <Badge
                        variant={
                          rfq.status === "assigned" ? "default" : "secondary"
                        }
                      >
                        {rfq.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No RFQs assigned yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {(notifications as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(notifications as any[])
                    .slice(0, 5)
                    .map((notification: any) => (
                      <div
                        key={notification.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg"
                      >
                        <MessageSquare className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-sm">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No notifications
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SupplierLayout>
  );
}
