import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Package, User, Calendar, Archive, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OrderStatus = 
  | "pending"
  | "material_procurement"
  | "manufacturing"
  | "finishing"
  | "quality_check"
  | "packing"
  | "shipped"
  | "delivered";

interface ArchivedOrder {
  id: string;
  userId: string;
  rfqId: string;
  quoteId: string;
  orderNumber?: string;
  orderStatus: OrderStatus;
  paymentStatus: 'paid' | 'unpaid';
  isArchived: boolean;
  orderDate: string;
  archivedAt: string;
  estimatedCompletion?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  invoiceUrl?: string;
  user: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  rfq: {
    id: string;
    projectName: string;
    material: string;
    quantity: number;
  };
}

const getStatusLabel = (status: OrderStatus) => {
  const statusLabels = {
    pending: "Order Confirmed",
    material_procurement: "Material Procurement",
    manufacturing: "Manufacturing",
    finishing: "Finishing",
    quality_check: "Quality Check",
    packing: "Packing",
    shipped: "Shipped",
    delivered: "Delivered",
  };
  return statusLabels[status];
};

const getStatusColor = (status: OrderStatus) => {
  const statusColors = {
    pending: "bg-blue-100 text-blue-800 border-blue-200",
    material_procurement: "bg-yellow-100 text-yellow-800 border-yellow-200",
    manufacturing: "bg-orange-100 text-orange-800 border-orange-200",
    finishing: "bg-purple-100 text-purple-800 border-purple-200",
    quality_check: "bg-indigo-100 text-indigo-800 border-indigo-200",
    packing: "bg-pink-100 text-pink-800 border-pink-200",
    shipped: "bg-green-100 text-green-800 border-green-200",
    delivered: "bg-teal-100 text-teal-800 border-teal-200",
  };
  return statusColors[status];
};

export default function ArchivedOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: archivedOrders, isLoading } = useQuery<ArchivedOrder[]>({
    queryKey: ["/api/admin/orders/archived"],
  });

  const reopenOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('PATCH', `/api/admin/orders/${orderId}/reopen`);
    },
    onSuccess: (data, orderId) => {
      toast({
        title: "Order Reopened",
        description: "The order has been moved back to active orders.",
      });
      
      // Invalidate both archived and active orders queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reopen order",
        variant: "destructive",
      });
    },
  });

  const handleReopenOrder = (orderId: string) => {
    reopenOrderMutation.mutate(orderId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Archive className="h-5 w-5" />
            <span>Archived Orders</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading archived orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Archive className="h-5 w-5" />
          <span>Archived Orders</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!archivedOrders || archivedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Archived Orders</h3>
            <p className="text-gray-500">Orders will appear here after payment is confirmed and they are archived.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
                <div>Order ID</div>
                <div>Customer</div>
                <div>Company</div>
                <div>Project</div>
                <div>Status</div>
                <div>Payment</div>
                <div>Archived Date</div>
                <div>Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {archivedOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-8 gap-4 items-center">
                    {/* Order ID */}
                    <div className="text-sm font-mono text-gray-900">
                      {order.orderNumber || `${order.id.substring(0, 8)}...`}
                    </div>

                    {/* Customer */}
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{order.user.name}</div>
                      <div className="text-gray-500">{order.user.email}</div>
                    </div>

                    {/* Company */}
                    <div className="text-sm text-gray-900">
                      {order.user.company || 'N/A'}
                    </div>

                    {/* Project */}
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{order.rfq.projectName}</div>
                      <div className="text-gray-500">{order.rfq.material} • Qty: {order.rfq.quantity}</div>
                    </div>

                    {/* Status */}
                    <div>
                      <Badge variant="outline" className={getStatusColor(order.orderStatus)}>
                        {getStatusLabel(order.orderStatus)}
                      </Badge>
                    </div>

                    {/* Payment Status */}
                    <div>
                      <Badge 
                        variant="outline" 
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        Paid
                      </Badge>
                    </div>

                    {/* Archived Date */}
                    <div className="text-sm text-gray-900">
                      {format(new Date(order.archivedAt), 'MMM dd, yyyy')}
                    </div>

                    {/* Actions */}
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() => handleReopenOrder(order.id)}
                        disabled={reopenOrderMutation.isPending}
                      >
                        {reopenOrderMutation.isPending ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                            Reopening...
                          </div>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reopen
                          </>
                        )}
                      </Button>
                      {order.invoiceUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => window.open(order.invoiceUrl, '_blank')}
                        >
                          View Invoice
                        </Button>
                      )}
                      {order.trackingNumber && (
                        <div className="text-xs text-gray-500 mt-1">
                          {order.shippingCarrier && `${order.shippingCarrier}: `}
                          {order.trackingNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Details Summary */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Ordered: {format(new Date(order.orderDate), 'MMM dd, yyyy')}
                      </span>
                      {order.trackingNumber && (
                        <span className="flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          Tracking: {order.trackingNumber}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Archive className="h-4 w-4 mr-1" />
                        Archived: {format(new Date(order.archivedAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}