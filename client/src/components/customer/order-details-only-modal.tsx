import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { SalesOrder, RFQ } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import ShipmentTracking from "@/components/shared/shipment-tracking";

interface OrderDetailsOnlyModalProps {
  order: SalesOrder & { rfq: RFQ; quote?: any };
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailsOnlyModal({ order, isOpen, onClose }: OrderDetailsOnlyModalProps) {
  const { toast } = useToast();

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

  const handleDownloadFiles = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}/files/download-all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order files');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Order-${order.orderNumber || order.id.slice(0, 8)}-AllFiles.zip`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({
        title: "Files Downloaded",
        description: "All order files downloaded as ZIP archive",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download order files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}/invoice/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Invoice not available');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({
        title: "Invoice Downloaded",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Invoice not available or download failed",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Order Details - {order.rfq.projectName}</span>
            <span className="text-sm font-mono text-gray-500">{order.orderNumber || `#${order.id.slice(0, 8)}`}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Order Number</label>
              <p className="text-sm font-mono">{order.orderNumber || `#${order.id.slice(0, 8)}`}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Quote Number</label>
              <p className="text-sm font-mono">
                {order.quote?.quoteNumber || (order.quoteId ? `#${order.quoteId.slice(0, 8)}` : 'N/A')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Status</label>
              <Badge className={`${getStatusColor(order.orderStatus || 'pending')} mt-1`}>
                {getStatusDisplay(order.orderStatus || 'pending')}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Order Date</label>
              <p className="text-sm">
                {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Material</label>
              <p className="text-sm">{order.rfq.material}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Quantity</label>
              <p className="text-sm">
                {order.rfq?.quantity || order.quantity} PCS ordered
                <span className="block text-xs text-gray-500 mt-1">
                  {order.quantityShipped || 0} shipped
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tolerance</label>
              <p className="text-sm">{order.rfq.tolerance || 'Standard'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Finishing</label>
              <p className="text-sm">{order.rfq.finishing || 'Standard'}</p>
            </div>
            {order.trackingNumber && (
              <div>
                <label className="text-sm font-medium text-gray-500">Tracking Number</label>
                <p className="text-sm font-mono">{order.trackingNumber}</p>
              </div>
            )}
            {order.shippingCarrier && (
              <div>
                <label className="text-sm font-medium text-gray-500">Shipping Carrier</label>
                <p className="text-sm">{order.shippingCarrier}</p>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-3 block">Order Information</label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Amount</p>
                  <p className="text-lg font-bold text-green-700">
                    ${order.quote?.amount || order.totalAmount || 'TBD'} {order.quote?.currency || 'USD'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p className="text-sm text-gray-900">
                    {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
              </div>
              {order.notes && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-500">Order Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Notes */}
          {order.rfq.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">Project Notes</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{order.rfq.notes}</p>
              </div>
            </div>
          )}

          {/* Shipment Tracking - Show if order has been shipped or has partial shipments */}
          {(order.orderStatus === 'shipped' || order.orderStatus === 'delivered' || (order.quantityShipped && order.quantityShipped > 0)) && (
            <ShipmentTracking 
              orderId={order.id}
              isAdmin={false}
              totalQuantity={order.quantity}
              quantityShipped={order.quantityShipped || 0}
              quantityRemaining={order.quantityRemaining || order.quantity}
            />
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleDownloadFiles}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download All Files (ZIP)</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}