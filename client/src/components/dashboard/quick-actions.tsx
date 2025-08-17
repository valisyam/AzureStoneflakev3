import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, AlertCircle, Clock, FileText, Users, Search, Package, Upload } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { RFQ } from "@shared/schema";

export default function QuickActions() {
  const { user } = useAuth();
  // Get pending quotes count for notification badge
  const { data: rfqs } = useQuery<RFQ[]>({
    queryKey: ["/api/rfqs"],
  });

  // Get quotes and orders for status-based actions
  const { data: quotes } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const pendingQuotesCount = quotes?.filter(quote => quote.status === 'pending').length || 0;
  const activeOrdersCount = orders?.filter(order => order.orderStatus !== 'delivered').length || 0;
  const newRfqsCount = rfqs?.filter(rfq => rfq.status === 'submitted').length || 0;
  const acceptedQuotesNeedingPO = quotes?.filter(quote => quote.status === 'accepted' && !quote.purchaseOrderUrl).length || 0;

  // Different quick actions for customers vs admins
  if (user?.isAdmin) {
    return (
      <Card className="rounded-2xl shadow-sm border border-gray-100 mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Admin Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/customers" className="flex items-center p-6 bg-gradient-to-r from-teal-primary to-teal-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
              <Users className="text-xl mr-3 h-5 w-5" />
              <span className="font-medium">Manage Customers</span>
            </Link>
            <Link href="/admin/search" className="flex items-center p-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
              <Search className="text-xl mr-3 h-5 w-5" />
              <span className="font-medium">Search Customers</span>
            </Link>
            <Link href="/admin/reports" className="flex items-center p-6 bg-gradient-to-r from-purple-500 to-purple-800 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
              <FileText className="text-xl mr-3 h-5 w-5" />
              <span className="font-medium">View Reports</span>
            </Link>
            <Link href="/admin/manual-creation" className="flex items-center p-6 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
              <Plus className="text-xl mr-3 h-5 w-5" />
              <span className="font-medium">Create Quote/Order</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Customer quick actions - more action-oriented and status-focused
  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100 mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Primary action - always visible and first */}
          <Link href="/rfq" className="flex items-center p-6 bg-gradient-to-r from-teal-primary to-teal-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
            <Plus className="text-xl mr-3 h-5 w-5" />
            <span className="font-medium">Submit New RFQ</span>
          </Link>

          {/* RFQs Page - second */}
          <Link href="/rfqs" className="flex items-center p-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
            <FileText className="text-xl mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">RFQs</div>
              <div className="text-xs opacity-80">Active & History</div>
            </div>
          </Link>

          {/* Orders Page - third */}
          <Link href="/orders" className="flex items-center p-6 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
            <Package className="text-xl mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Orders</div>
              <div className="text-xs opacity-80">Active & History</div>
            </div>
          </Link>

          {/* Status-based actions with notifications */}
          {acceptedQuotesNeedingPO > 0 && (
            <Link href="/quotes" className="flex items-center p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px] relative">
              <Upload className="text-xl mr-3 h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-medium">Upload Purchase Order</span>
                <span className="text-xs opacity-90">{acceptedQuotesNeedingPO} awaiting PO</span>
              </div>
              <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs bg-yellow-500 hover:bg-yellow-600 border-2 border-white rounded-full">
                {acceptedQuotesNeedingPO}
              </Badge>
            </Link>
          )}
          {pendingQuotesCount > 0 && (
            <Link href="/quotes" className="flex items-center p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px] relative">
              <AlertCircle className="text-xl mr-3 h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-medium">Review Quotes</span>
                <span className="text-xs opacity-90">{pendingQuotesCount} pending</span>
              </div>
              <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 border-2 border-white rounded-full">
                {pendingQuotesCount}
              </Badge>
            </Link>
          )}

          {activeOrdersCount > 0 && (
            <Link href="/orders" className="flex items-center p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px] relative">
              <Package className="text-xl mr-3 h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-medium">Track Orders</span>
                <span className="text-xs opacity-90">{activeOrdersCount} active</span>
              </div>
              {activeOrdersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center text-xs bg-blue-600 hover:bg-blue-700 border-2 border-white rounded-full">
                  {activeOrdersCount}
                </Badge>
              )}
            </Link>
          )}

          {/* View Activity - moved to fourth position */}
          <Link href="/history" className="flex items-center p-6 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 w-full justify-start min-h-[80px]">
            <TrendingUp className="text-xl mr-3 h-5 w-5" />
            <span className="font-medium">View Activity</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
