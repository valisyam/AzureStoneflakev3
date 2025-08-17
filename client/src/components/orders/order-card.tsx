import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ElegantOrderTracking from "@/components/customer/elegant-order-tracking";
import OrderDetailsModal from "@/components/customer/order-details-modal";
import { Eye, Download, FileText } from "lucide-react";
import { SalesOrder, RFQ } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface OrderCardProps {
  order: SalesOrder & { rfq: RFQ; quote?: any };
  isExpanded?: boolean;
}

export default function OrderCard({ order, isExpanded = false }: OrderCardProps) {
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
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
      // Get the original RFQ files
      const response = await fetch(`/api/rfqs/${order.rfqId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch RFQ details');
      }
      
      const rfqData = await response.json();
      const files = rfqData.files || [];
      
      if (files.length === 0) {
        toast({
          title: "No Files Available",
          description: "No files are available for download with this order.",
          variant: "destructive",
        });
        return;
      }
      
      // Download each file
      for (const file of files) {
        try {
          const fileResponse = await fetch(`/api/files/${file.id}/download`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (fileResponse.ok) {
            const blob = await fileResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        } catch (error) {
          console.error(`Failed to download ${file.fileName}:`, error);
        }
      }
      
      toast({
        title: "Download Started",
        description: `Started downloading ${files.length} file(s)`,
      });
    } catch (error) {
      console.error('Download files error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download project files",
        variant: "destructive",
      });
    }
  };

  if (isExpanded) {
    return (
      <div className="space-y-4">
        {/* Order tracking display */}
        <ElegantOrderTracking
          currentStatus={order.orderStatus || 'pending'}
          projectName={order.rfq.projectName}
          orderDate={order.orderDate ? order.orderDate.toString() : new Date().toISOString()}
          estimatedCompletion={order.estimatedCompletion ? order.estimatedCompletion.toString() : undefined}
          trackingNumber={order.trackingNumber ?? undefined}
          shippingCarrier={order.shippingCarrier ?? undefined}
          invoiceUrl={order.invoiceUrl ?? undefined}
          orderId={order.id}
          order={order}
        />

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-white rounded-xl border border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Quantity</p>
            <p className="font-semibold text-gray-900">{order.rfq.quantity} PCS</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Material Grade</p>
            <p className="font-semibold text-gray-900">{order.rfq.materialGrade || 'Standard'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Finishing</p>
            <p className="font-semibold text-gray-900">{order.rfq.finishing || 'As machined'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quote Number</p>
            <p className="font-semibold text-gray-900">
              {order.quoteId ? `#${order.quoteId.slice(0, 8)}` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Order Value</p>
            <p className="font-semibold text-gray-900">
              ${order.amount ? parseFloat(order.amount).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            className="flex items-center px-4 py-2 bg-teal-primary text-white hover:bg-teal-700"
            onClick={() => setShowDetailsDialog(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center px-4 py-2"
            onClick={handleDownloadFiles}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Files
          </Button>
          {/* Show invoice button only if order is in packing stage or later and invoice exists */}
          {order.invoiceUrl && (order.orderStatus === 'packing' || order.orderStatus === 'shipped' || order.orderStatus === 'delivered') && (
            <Button 
              variant="outline" 
              className="flex items-center px-4 py-2"
              onClick={() => order.invoiceUrl && window.open(order.invoiceUrl, '_blank')}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Invoice
            </Button>
          )}
        </div>
        
        <OrderDetailsModal 
          order={order}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      </div>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Order {order.orderNumber || `#${order.id.slice(0, 12)}`}</h3>
            <p className="text-gray-600">{order.rfq.projectName}</p>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
          <div className="mt-4 lg:mt-0">
            <Badge 
              className={`${getStatusColor(order.orderStatus || 'pending')} px-3 py-1 rounded-full text-sm font-medium`}
            >
              {getStatusDisplay(order.orderStatus || 'pending')}
            </Badge>
          </div>
        </div>

        <ElegantOrderTracking
          currentStatus={order.orderStatus || 'pending'}
          projectName={order.rfq.projectName}
          orderDate={order.orderDate ? order.orderDate.toString() : new Date().toISOString()}
          estimatedCompletion={order.estimatedCompletion ? order.estimatedCompletion.toString() : undefined}
          trackingNumber={order.trackingNumber ?? undefined}
          shippingCarrier={order.shippingCarrier ?? undefined}
          invoiceUrl={order.invoiceUrl ?? undefined}
          orderId={order.id}
          order={order}
        />

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl mb-6">
          <div>
            <p className="text-sm text-gray-600">Quantity</p>
            <p className="font-semibold text-gray-900">{order.rfq.quantity} PCS</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Material</p>
            <p className="font-semibold text-gray-900">{order.rfq.material}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Quote Number</p>
            <p className="font-semibold text-gray-900">
              {order.quoteId ? `#${order.quoteId.slice(0, 8)}` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Order Value</p>
            <p className="font-semibold text-gray-900">
              ${order.amount ? parseFloat(order.amount).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button className="flex items-center px-4 py-2 bg-teal-primary text-white hover:bg-teal-700">
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
          <Button variant="outline" className="flex items-center px-4 py-2">
            <Download className="mr-2 h-4 w-4" />
            Download Files
          </Button>
          {/* Show invoice button only if order is in packing stage or later and invoice exists */}
          {order.invoiceUrl && (order.orderStatus === 'packing' || order.orderStatus === 'shipped' || order.orderStatus === 'delivered') && (
            <Button 
              variant="outline" 
              className="flex items-center px-4 py-2"
              onClick={() => window.open(order.invoiceUrl, '_blank')}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Invoice
            </Button>
          )}
        </div>

        <OrderDetailsModal 
          order={order}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      </CardContent>
    </Card>
  );
}
