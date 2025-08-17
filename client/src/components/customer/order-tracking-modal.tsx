import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ElegantOrderTracking from "@/components/customer/elegant-order-tracking";  
import { SalesOrder, RFQ } from "@shared/schema";
import ShipmentTracking from "@/components/shared/shipment-tracking";

interface OrderTrackingModalProps {
  order: SalesOrder & { rfq: RFQ; quote?: any };
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderTrackingModal({ order, isOpen, onClose }: OrderTrackingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Order Tracking - {order.rfq.projectName}</span>
            <span className="text-sm font-mono text-gray-500">{order.orderNumber || `#${order.id.slice(0, 8)}`}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Material:</span>
                <p className="font-medium">{order.rfq.material}</p>
              </div>
              <div>
                <span className="text-gray-500">Quantity:</span>
                <p className="font-medium">
                  {order.quantity} PCS
                  {order.quantityShipped && order.quantityShipped > 0 && (
                    <span className="block text-xs text-gray-600 mt-1">
                      {order.quantityShipped} shipped, {Math.max(0, order.quantity - (order.quantityShipped || 0))} remaining
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Order Date:</span>
                <p className="font-medium">
                  {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Quote #:</span>
                <p className="font-medium font-mono">
                  {order.quote?.quoteNumber || (order.quoteId ? `#${order.quoteId.slice(0, 8)}` : 'N/A')}
                </p>
              </div>
            </div>
          </div>

          {/* Tracking Component */}
          <div className="animate-in fade-in-0 duration-500 delay-150">
            <ElegantOrderTracking 
              currentStatus={order.orderStatus as any}
              projectName={order.rfq.projectName}
              orderDate={order.orderDate ? new Date(order.orderDate).toISOString() : ''}
              estimatedCompletion={order.estimatedCompletion ? new Date(order.estimatedCompletion).toISOString() : undefined}
              trackingNumber={order.trackingNumber || undefined}
              shippingCarrier={order.shippingCarrier || undefined}
              invoiceUrl={order.invoiceUrl || undefined}
              orderId={order.id}
              order={order}
            />
          </div>

          {/* Detailed Shipment Tracking */}
          {(order.orderStatus === 'shipped' || order.orderStatus === 'delivered' || (order.quantityShipped && order.quantityShipped > 0)) && (
            <div className="animate-in fade-in-0 duration-500 delay-300">
              <ShipmentTracking 
                orderId={order.id}
                isAdmin={false}
                totalQuantity={order.quantity}
                quantityShipped={order.quantityShipped || 0}
                quantityRemaining={Math.max(0, order.quantity - (order.quantityShipped || 0))}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}