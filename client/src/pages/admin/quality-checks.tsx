import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Eye, ArrowRight, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from 'date-fns';
import QualityCheckManager from '@/components/admin/quality-check-manager';

interface QualityCheckOrder {
  id: string;
  orderNumber: string;
  projectName: string;
  customerName: string;
  qualityCheckStatus: 'pending' | 'approved' | 'needs_revision';
  customerApprovedAt?: Date;
  qualityCheckNotes?: string;
  createdAt: Date;
}

export default function QualityChecksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<QualityCheckOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch all orders in quality_check status
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/admin/quality-check-orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/quality-check-orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch quality check orders');
      }
      return response.json();
    },
  });

  // Move order to packing status
  const moveToPackingMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
        body: JSON.stringify({ status: 'packing' }),
      });
      if (!response.ok) {
        throw new Error('Failed to move order to packing');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quality-check-orders'] });
      toast({
        title: "Order moved to packing",
        description: "The order has been moved to the packing stage.",
      });
    },
  });

  const handleMoveToPacking = (orderId: string) => {
    moveToPackingMutation.mutate(orderId);
  };

  const handleViewOrder = (order: QualityCheckOrder) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const pendingApprovals = orders.filter(o => o.qualityCheckStatus === 'pending');
  const approvedOrders = orders.filter(o => o.qualityCheckStatus === 'approved');
  const needsRevision = orders.filter(o => o.qualityCheckStatus === 'needs_revision');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold">Quality Checks</h1>
            <p className="text-teal-100 mt-2">Manage quality check approvals and revisions</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading quality check orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Quality Checks</h1>
              <p className="text-teal-100 mt-2">Manage quality check approvals and revisions</p>
            </div>
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => window.history.back()}
            >
              Back to Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Awaiting Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingApprovals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{approvedOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Needs Revision</p>
                  <p className="text-2xl font-bold text-gray-900">{needsRevision.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Quality Checks</h3>
              <p className="text-gray-500">
                All orders are either pending quality inspection or have moved past this stage.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Approved Orders - Ready to Move to Packing */}
            {approvedOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Approved Quality Checks ({approvedOrders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {approvedOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{order.orderNumber} - {order.projectName}</div>
                        <div className="text-sm text-gray-600">Customer: {order.customerName}</div>
                        <div className="text-xs text-green-600">
                          Approved on {formatDate(new Date(order.customerApprovedAt!), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMoveToPacking(order.id)}
                          disabled={moveToPackingMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Move to Packing
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <Clock className="h-5 w-5" />
                    Awaiting Customer Approval ({pendingApprovals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingApprovals.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{order.orderNumber} - {order.projectName}</div>
                        <div className="text-sm text-gray-600">Customer: {order.customerName}</div>
                        <div className="text-xs text-amber-600">
                          Sent for approval on {formatDate(new Date(order.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Needs Revision */}
            {needsRevision.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Needs Revision ({needsRevision.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {needsRevision.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{order.orderNumber} - {order.projectName}</div>
                        <div className="text-sm text-gray-600">Customer: {order.customerName}</div>
                        {order.qualityCheckNotes && (
                          <div className="text-sm text-red-600 mt-1">
                            <strong>Revision Notes:</strong> {order.qualityCheckNotes}
                          </div>
                        )}
                        <div className="text-xs text-red-600">
                          Revision requested on {formatDate(new Date(order.customerApprovedAt!), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Address
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Quality Check Details - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Project Name</label>
                  <div className="text-sm">{selectedOrder.projectName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <div className="text-sm">{selectedOrder.customerName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>
                    <Badge 
                      className={
                        selectedOrder.qualityCheckStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        selectedOrder.qualityCheckStatus === 'needs_revision' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }
                    >
                      {selectedOrder.qualityCheckStatus === 'approved' ? 'Approved' :
                       selectedOrder.qualityCheckStatus === 'needs_revision' ? 'Needs Revision' :
                       'Awaiting Approval'}
                    </Badge>
                  </div>
                </div>
                {selectedOrder.customerApprovedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Action Date</label>
                    <div className="text-sm">{formatDate(new Date(selectedOrder.customerApprovedAt), 'MMM d, yyyy')}</div>
                  </div>
                )}
              </div>
              
              {selectedOrder.qualityCheckNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Notes</label>
                  <div className="text-sm bg-gray-50 p-3 rounded border">
                    {selectedOrder.qualityCheckNotes}
                  </div>
                </div>
              )}

              {/* Quality Check Manager Component */}
              <div className="border-t pt-4">
                <QualityCheckManager orderId={selectedOrder.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}