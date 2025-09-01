import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package2, TrendingUp } from "lucide-react";
import { SalesOrder, RFQ } from "@shared/schema";

export default function OrderProgress() {
  const { data: orders, isLoading } = useQuery<(SalesOrder & { rfq: RFQ })[]>({
    queryKey: ["/api/orders"],
  });

  const getProgressPercentage = (status: string | null) => {
    switch (status) {
      case "pending": return 12.5;
      case "material_procurement": return 25;
      case "manufacturing": return 50;
      case "finishing": return 62.5;
      case "quality_check": return 75;
      case "packing": return 87.5;
      case "shipped": return 95;
      case "delivered": return 100;
      default: return 0;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "pending": return "bg-blue-100 text-blue-800";
      case "material_procurement": return "bg-orange-100 text-orange-800";
      case "manufacturing": return "bg-purple-100 text-purple-800";
      case "finishing": return "bg-indigo-100 text-indigo-800";
      case "quality_check": return "bg-pink-100 text-pink-800";
      case "packing": return "bg-yellow-100 text-yellow-800";
      case "shipped": return "bg-green-100 text-green-800";
      case "delivered": return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string | null) => {
    switch (status) {
      case "pending": return "Order Confirmed";
      case "material_procurement": return "Material Procurement";
      case "manufacturing": return "Manufacturing";
      case "finishing": return "Finishing";
      case "quality_check": return "Quality Check";
      case "packing": return "Packing";
      case "shipped": return "Shipped";
      case "delivered": return "Delivered";
      default: return "Unknown";
    }
  };

  // Get top 3 most recent orders
  const recentOrders = orders?.slice(0, 3) || [];

  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Package2 className="h-5 w-5 text-teal-600" />
          Order Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-6">
            {recentOrders.map((order) => {
              const progress = getProgressPercentage(order.orderStatus);
              return (
                <div key={order.id} className="space-y-3 p-4 bg-gradient-to-r from-gray-50 to-teal-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {order.rfq.projectName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Order {order.orderNumber || `#${order.id.slice(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-teal-600">
                        {progress}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Complete
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress 
                      value={progress} 
                      className="h-2 bg-gray-200"
                    />
                    <div className="flex justify-between items-center">
                      <Badge className={`${getStatusColor(order.orderStatus)} text-xs px-2 py-1`}>
                        {getStatusDisplay(order.orderStatus)}
                      </Badge>
                      {progress < 100 && (
                        <div className="flex items-center text-xs text-teal-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          In Progress
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No active orders</h3>
            <p className="text-sm text-gray-500">Submit an RFQ to start your first order</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}