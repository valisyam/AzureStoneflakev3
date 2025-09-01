import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Package, Factory, Sparkles, Shield, PackageX, Truck, Clock } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  projectName: string;
  material: string | null;
  quantity: number | null;
  totalAmount: string;
  deliveryDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
}

interface PurchaseOrderTrackingModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function PurchaseOrderTrackingModal({ 
  purchaseOrder, 
  isOpen, 
  onClose 
}: PurchaseOrderTrackingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(purchaseOrder.status);

  const stages = [
    { key: "pending", label: "Order Received", icon: CheckCircle },
    { key: "accepted", label: "Order Accepted", icon: CheckCircle },
    { key: "material_procurement", label: "Material Procurement", icon: Package },
    { key: "manufacturing", label: "Manufacturing", icon: Factory },
    { key: "finishing", label: "Finishing", icon: Sparkles },
    { key: "quality_check", label: "Quality Check", icon: Shield },
    { key: "packing", label: "Packing", icon: PackageX },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.key === selectedStatus);
  };

  const currentStageIndex = getCurrentStageIndex();
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const progress = currentStageIndex >= 0 
        ? ((currentStageIndex + 1) / stages.length) * 100 
        : 0;
      setProgressWidth(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStageIndex, stages.length]);

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return "completed";
    if (index === currentStageIndex) {
      if (selectedStatus === "delivered") return "completed";
      return "current";
    }
    return "upcoming";
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest('PATCH', `/api/supplier/purchase-orders/${purchaseOrder.id}/status`, {
        status: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/purchase-orders'] });
      toast({
        title: "Status Updated",
        description: "Purchase order status updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    updateStatusMutation.mutate(selectedStatus);
  };

  const getStatusColor = (stageStatus: string) => {
    switch (stageStatus) {
      case "completed":
        return "bg-green-500 text-white";
      case "current":
        return "bg-purple-600 text-white";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  const canUpdateTo = (stageKey: string) => {
    const stageIndex = stages.findIndex(s => s.key === stageKey);
    const currentIndex = stages.findIndex(s => s.key === purchaseOrder.status);
    
    // Can't go backwards from delivered
    if (purchaseOrder.status === 'delivered') return false;
    
    // Can decline only from pending
    if (stageKey === 'declined') return purchaseOrder.status === 'pending';
    
    // Can accept only from pending
    if (stageKey === 'accepted') return purchaseOrder.status === 'pending';
    
    // For other statuses, allow suppliers to jump to any forward stage
    // Remove sequential restriction - suppliers can skip stages
    return stageIndex >= currentIndex;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Purchase Order Tracking - {purchaseOrder.projectName || 'Manual Order'}</span>
            <span className="text-sm font-mono text-gray-500">{purchaseOrder.orderNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Material:</span>
                <p className="font-medium">{purchaseOrder.material || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Quantity:</span>
                <p className="font-medium">{purchaseOrder.quantity || 'N/A'} PCS</p>
              </div>
              <div>
                <span className="text-gray-500">Order Date:</span>
                <p className="font-medium">
                  {new Date(purchaseOrder.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Total Amount:</span>
                <p className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(parseFloat(purchaseOrder.totalAmount))}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <Card className="bg-white shadow-lg rounded-xl border border-gray-100">
            <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-900 text-white pb-6">
              <CardTitle className="text-xl font-semibold flex items-center">
                <Factory className="h-5 w-5 mr-3 text-purple-300" />
                {purchaseOrder.projectName || 'Manual Order'} - Manufacturing Progress
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span>Started: {new Date(purchaseOrder.createdAt).toLocaleDateString()}</span>
                </div>
                {purchaseOrder.deliveryDate && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <CheckCircle className="h-4 w-4" />
                    <span>Target Delivery: {new Date(purchaseOrder.deliveryDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    {currentStageIndex + 1} of {stages.length} stages complete
                  </span>
                </div>
                
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progressWidth}%` }}
                  />
                  <div 
                    className="absolute top-0 h-full w-4 bg-white/40 rounded-full transition-all duration-1000"
                    style={{ left: `${Math.max(0, progressWidth - 4)}%` }}
                  />
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                {stages.map((stage, index) => {
                  const stageStatus = getStageStatus(index);
                  const Icon = stage.icon;
                  
                  return (
                    <div key={stage.key} className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(stageStatus)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium text-gray-900">{stage.label}</h3>
                        <p className="text-sm text-gray-600">
                          {stageStatus === "completed" ? "Completed" :
                           stageStatus === "current" ? "In Progress" : "Pending"}
                        </p>
                      </div>
                      {index < stages.length - 1 && (
                        <div className={`w-px h-8 ${stageStatus === "completed" ? "bg-green-300" : "bg-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Status Update Section */}
          <Card>
            <CardHeader>
              <CardTitle>Update Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Current Status
                  </label>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    {stages.find(s => s.key === purchaseOrder.status)?.label || purchaseOrder.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Update To
                  </label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem 
                          key={stage.key} 
                          value={stage.key}
                          disabled={!canUpdateTo(stage.key)}
                        >
                          {stage.label}
                        </SelectItem>
                      ))}
                      {purchaseOrder.status === 'pending' && (
                        <SelectItem value="declined">Declined</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={selectedStatus === purchaseOrder.status || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}