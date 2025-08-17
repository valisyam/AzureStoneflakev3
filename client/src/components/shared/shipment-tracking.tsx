import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, CheckCircle, Calendar, Hash, Building, Factory, Wrench, CheckSquare, Package2, ShipIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Shipment {
  id: string;
  orderId: string;
  quantityShipped: number;
  trackingNumber?: string;
  shippingCarrier?: string;
  shipmentDate: string;
  deliveryDate?: string;
  status: 'shipped' | 'delivered';
  trackingStatus: string; // Independent tracking status for each branch
  notes?: string;
  createdAt: string;
}

interface ShipmentTrackingProps {
  orderId: string;
  isAdmin?: boolean;
  totalQuantity: number;
  quantityShipped: number;
  quantityRemaining: number;
}

export default function ShipmentTracking({ 
  orderId, 
  isAdmin = false, 
  totalQuantity, 
  quantityShipped, 
  quantityRemaining 
}: ShipmentTrackingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getTrackingStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'material_procurement': 'Material Procurement',
      'manufacturing': 'Manufacturing',
      'finishing': 'Finishing',
      'quality_check': 'Quality Check',
      'packing': 'Packing',
      'shipped': 'Shipped',
      'delivered': 'Delivered'
    };
    return statusMap[status] || status;
  };

  const getTrackingStatusColor = (status: string) => {
    switch (status) {
      case 'material_procurement': return 'bg-blue-100 text-blue-800';
      case 'manufacturing': return 'bg-yellow-100 text-yellow-800';
      case 'finishing': return 'bg-orange-100 text-orange-800';
      case 'quality_check': return 'bg-purple-100 text-purple-800';
      case 'packing': return 'bg-indigo-100 text-indigo-800';
      case 'shipped': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrackingIcon = (status: string) => {
    switch (status) {
      case 'material_procurement': return <Package className="h-4 w-4" />;
      case 'manufacturing': return <Factory className="h-4 w-4" />;
      case 'finishing': return <Wrench className="h-4 w-4" />;
      case 'quality_check': return <CheckSquare className="h-4 w-4" />;
      case 'packing': return <Package2 className="h-4 w-4" />;
      case 'shipped': return <ShipIcon className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const { data: shipments, isLoading } = useQuery<Shipment[]>({
    queryKey: [`/api/orders/${orderId}/shipments`],
  });

  const updateShipmentStatusMutation = useMutation({
    mutationFn: async ({ shipmentId, status }: { shipmentId: string; status: 'delivered' }) => {
      const res = await apiRequest("PATCH", `/api/shipments/${shipmentId}/status`, { 
        status, 
        deliveryDate: new Date().toISOString() 
      });
      if (!res.ok) throw new Error("Failed to update shipment status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/shipments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Success",
        description: "Shipment marked as delivered",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update shipment status",
        variant: "destructive",
      });
    },
  });

  const updateTrackingStatusMutation = useMutation({
    mutationFn: async ({ shipmentId, trackingStatus }: { shipmentId: string; trackingStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/shipments/${shipmentId}/tracking-status`, { 
        trackingStatus 
      });
      if (!res.ok) throw new Error("Failed to update tracking status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/shipments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Success",
        description: "Shipment tracking status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update tracking status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shipped':
        return "bg-blue-100 text-blue-800 border-blue-300";
      case 'delivered':
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'shipped':
        return "Shipped";
      case 'delivered':  
        return "Delivered";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Shipment Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Shipment Details</span>
          </div>
          <div className="text-sm font-normal text-gray-600">
            {quantityShipped} of {totalQuantity} PCS shipped
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!shipments || shipments.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No shipments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalQuantity}</div>
                  <div className="text-gray-600">Total Ordered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{quantityShipped}</div>
                  <div className="text-gray-600">Shipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{quantityRemaining}</div>
                  <div className="text-gray-600">Remaining</div>
                </div>
              </div>
            </div>

            {/* Shipment Tracking Branches */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Shipment Tracking Branches:</h4>
              <div className="space-y-4">
                {shipments.map((shipment, index) => (
                  <div key={shipment.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    {/* Branch Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Badge className="bg-blue-600 text-white">
                            Branch {index + 1}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {shipment.quantityShipped} PCS
                          </p>
                          <p className="text-sm text-gray-600">
                            Created: {new Date(shipment.shipmentDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className={getTrackingStatusColor(shipment.trackingStatus || 'material_procurement')}>
                          {getTrackingIcon(shipment.trackingStatus || 'material_procurement')}
                          <span className="ml-1">{getTrackingStatusLabel(shipment.trackingStatus || 'material_procurement')}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Tracking Details */}
                    <div className="space-y-3">
                      {shipment.trackingNumber && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Hash className="h-4 w-4" />
                          <span>Tracking: {shipment.trackingNumber}</span>
                        </div>
                      )}
                      
                      {shipment.shippingCarrier && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          <span>Carrier: {shipment.shippingCarrier}</span>
                        </div>
                      )}

                      {shipment.trackingStatus === 'delivered' && shipment.deliveryDate && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Calendar className="h-4 w-4" />
                          <span>Delivered: {new Date(shipment.deliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Controls */}
                    {isAdmin && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Update Tracking Status:
                            </label>
                            <Select
                              value={shipment.trackingStatus || 'material_procurement'}
                              onValueChange={(value) => updateTrackingStatusMutation.mutate({
                                shipmentId: shipment.id,
                                trackingStatus: value
                              })}
                              disabled={updateTrackingStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="material_procurement">Material Procurement</SelectItem>
                                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="finishing">Finishing</SelectItem>
                                <SelectItem value="quality_check">Quality Check</SelectItem>
                                <SelectItem value="packing">Packing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {shipment.trackingStatus === 'shipped' && shipment.status !== 'delivered' && (
                            <Button
                              size="sm"
                              onClick={() => updateShipmentStatusMutation.mutate({ 
                                shipmentId: shipment.id, 
                                status: 'delivered' 
                              })}
                              disabled={updateShipmentStatusMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white mt-6"
                            >
                              {updateShipmentStatusMutation.isPending ? 'Updating...' : 'Mark Delivered'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}