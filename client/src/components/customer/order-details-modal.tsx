import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SalesOrder, RFQ } from "@shared/schema";
import { extractDisplayId } from "@shared/utils";

interface OrderDetailsModalProps {
  order: SalesOrder & { rfq: RFQ; quote?: any };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailsModal({ order, open, onOpenChange }: OrderDetailsModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "material_procurement":
        return "bg-orange-100 text-orange-800";
      case "manufacturing":
        return "bg-purple-100 text-purple-800";
      case "finishing":
        return "bg-indigo-100 text-indigo-800";
      case "quality_check":
        return "bg-pink-100 text-pink-800";
      case "packing":
        return "bg-yellow-100 text-yellow-800";
      case "shipped":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending":
        return "Order Confirmed";
      case "material_procurement":
        return "Material Procurement";
      case "manufacturing":
        return "Manufacturing";
      case "finishing":
        return "Finishing";
      case "quality_check":
        return "Quality Check";
      case "packing":
        return "Packing";
      case "shipped":
        return "Shipped";
      case "delivered":
        return "Delivered";
      default:
        return status.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details {order.orderNumber || extractDisplayId(order)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Project Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Project Name:</span>
                  <p className="font-medium">{order.rfq.projectName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Material:</span>
                  <p className="font-medium">{order.rfq.material}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Material Grade:</span>
                  <p className="font-medium">{order.rfq.materialGrade || 'Standard'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <p className="font-medium">{order.rfq.quantity} PCS</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Finish:</span>
                  <p className="font-medium">{order.rfq.finishing || 'Standard'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Quote Number:</span>
                  <p className="font-medium font-mono">
                    {order.quote?.quoteNumber || (order.quoteId ? `#${order.quoteId.slice(0, 8)}` : 'N/A')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Order Date:</span>
                  <p className="font-medium">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Order Value:</span>
                  <p className="font-medium text-green-700">
                    ${order.amount ? parseFloat(order.amount).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={`${getStatusColor(order.orderStatus || 'pending')} px-2 py-1 rounded-full`}>
                    {getStatusDisplay(order.orderStatus || 'pending')}
                  </Badge>
                </div>
                {order.trackingNumber && (
                  <div>
                    <span className="text-sm text-gray-600">Tracking Number:</span>
                    <p className="font-medium font-mono">{order.trackingNumber}</p>
                  </div>
                )}
                {order.shippingCarrier && (
                  <div>
                    <span className="text-sm text-gray-600">Shipping Carrier:</span>
                    <p className="font-medium">{order.shippingCarrier}</p>
                  </div>
                )}
                {order.estimatedCompletion && (
                  <div>
                    <span className="text-sm text-gray-600">Estimated Completion:</span>
                    <p className="font-medium">{new Date(order.estimatedCompletion).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Project Notes */}
          {order.rfq.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Notes</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{order.rfq.notes}</p>
            </div>
          )}

          {/* Order Notes */}
          {order.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Notes</h3>
              <p className="text-gray-700 bg-orange-50 p-4 rounded-lg border border-orange-200">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}