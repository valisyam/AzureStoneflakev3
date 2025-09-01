import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Users, 
  Send, 
  Eye, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Package,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function RFQAssignments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [viewQuotesRfq, setViewQuotesRfq] = useState<any>(null);

  // Get all RFQs
  const { data: rfqs, isLoading: rfqsLoading } = useQuery({
    queryKey: ['/api/rfqs']
  });

  // Get all suppliers with profile completion
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/admin/suppliers']
  });

  // Get quotes for specific RFQ
  const { data: rfqQuotes } = useQuery({
    queryKey: ['/api/admin/rfq', viewQuotesRfq?.id, 'quotes'],
    enabled: !!viewQuotesRfq
  });

  const assignRfqMutation = useMutation({
    mutationFn: (data: { rfqId: string; supplierIds: string[] }) => 
      apiRequest(`/api/admin/rfq/${data.rfqId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ supplierIds: data.supplierIds })
      }),
    onSuccess: () => {
      toast({
        title: "RFQ Assigned",
        description: "RFQ has been assigned to selected suppliers successfully."
      });
      setSelectedRfq(null);
      setSelectedSuppliers([]);
      queryClient.invalidateQueries({ queryKey: ['/api/rfqs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign RFQ.",
        variant: "destructive"
      });
    }
  });

  const updateQuoteStatusMutation = useMutation({
    mutationFn: (data: { quoteId: string; status: 'accepted' | 'rejected' }) =>
      apiRequest(`/api/admin/supplier-quotes/${data.quoteId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: data.status })
      }),
    onSuccess: () => {
      toast({
        title: "Quote Updated",
        description: "Quote status has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rfq', viewQuotesRfq?.id, 'quotes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quote status.",
        variant: "destructive"
      });
    }
  });

  const calculateSupplierScore = (supplier: any) => {
    const fields = [
      supplier.name,
      supplier.phone,
      supplier.website,
      supplier.address,
      supplier.city,
      supplier.country,
      supplier.capabilities && JSON.parse(supplier.capabilities || '[]').length > 0,
      supplier.certifications && JSON.parse(supplier.certifications || '[]').length > 0
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800">New RFQ</Badge>;
      case 'sent_to_suppliers':
        return <Badge className="bg-orange-100 text-orange-800">Sent to Suppliers</Badge>;
      case 'quoted':
        return <Badge className="bg-green-100 text-green-800">Received Quotes</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleAssignRfq = () => {
    if (!selectedRfq || selectedSuppliers.length === 0) {
      toast({
        title: "Error",
        description: "Please select suppliers to assign the RFQ.",
        variant: "destructive"
      });
      return;
    }

    assignRfqMutation.mutate({
      rfqId: selectedRfq.id,
      supplierIds: selectedSuppliers
    });
  };

  const handleToggleSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const pendingRfqs = rfqs?.filter((rfq: any) => rfq.status === 'submitted') || [];
  const assignedRfqs = rfqs?.filter((rfq: any) => rfq.status === 'sent_to_suppliers') || [];
  const quotedRfqs = rfqs?.filter((rfq: any) => rfq.status === 'quoted') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-3">
                  RFQ Supplier Management
                </h1>
                <p className="text-blue-100 text-lg max-w-2xl">
                  Streamline your manufacturing workflow by assigning RFQs to qualified suppliers and managing incoming quotes
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 text-white">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{pendingRfqs.length}</div>
                      <div className="text-xs text-blue-200">Pending</div>
                    </div>
                    <div className="w-px h-8 bg-white/30"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{assignedRfqs.length}</div>
                      <div className="text-xs text-blue-200">Assigned</div>
                    </div>
                    <div className="w-px h-8 bg-white/30"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{quotedRfqs.length}</div>
                      <div className="text-xs text-blue-200">Quoted</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Pending RFQs - Need Assignment */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-1">
            <div className="bg-white rounded-t-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Pending Assignment</h2>
                      <p className="text-sm text-gray-600 mt-1">RFQs awaiting supplier selection</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-lg font-semibold">
                      {pendingRfqs.length}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
            </div>
          </div>
          <CardContent className="p-6">
            {pendingRfqs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-12 w-12 text-blue-300" />
                </div>
                <p className="text-gray-500 text-lg">No RFQs pending supplier assignment</p>
                <p className="text-sm text-gray-400 mt-2">New RFQs will appear here when submitted by customers</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRfqs.map((rfq: any) => (
                  <Card key={rfq.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-1">
                      <div className="bg-white rounded-lg">
                        <CardContent className="p-8">
                          <div className="flex items-start justify-between">
                            <div className="space-y-5 flex-1">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                  <FileText className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-xl text-gray-900">{rfq.projectName}</h3>
                                  <div className="mt-2">
                                    {getStatusBadge(rfq.status)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Package className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium text-gray-500">Material</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.material}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Package className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium text-gray-500">Quantity</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.quantity}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium text-gray-500">Submitted</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{format(new Date(rfq.createdAt), 'MMM dd, yyyy')}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium text-gray-500">Process</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.manufacturingProcess || 'Any'}</p>
                                </div>
                              </div>

                              {rfq.notes && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
                                  <h4 className="font-medium text-blue-900 mb-2">Special Requirements</h4>
                                  <p className="text-blue-800">{rfq.notes}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-3 ml-6">
                              <Button 
                                onClick={() => setSelectedRfq(rfq)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                                size="lg"
                              >
                                <Users className="h-5 w-5 mr-2" />
                                Assign Suppliers
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
          )}
        </CardContent>
      </Card>

        {/* Assigned RFQs - Waiting for Quotes */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-1">
            <div className="bg-white rounded-t-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Awaiting Quotes</h2>
                      <p className="text-sm text-gray-600 mt-1">RFQs sent to suppliers, pending responses</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-800 px-3 py-1 text-lg font-semibold">
                      {assignedRfqs.length}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
            </div>
          </div>
          <CardContent className="p-6">
            {assignedRfqs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <Clock className="h-12 w-12 text-orange-300" />
                </div>
                <p className="text-gray-500 text-lg">No RFQs currently awaiting supplier quotes</p>
                <p className="text-sm text-gray-400 mt-2">Assigned RFQs will appear here while suppliers prepare quotes</p>
              </div>
            ) : (
              <div className="space-y-6">
                {assignedRfqs.map((rfq: any) => (
                  <Card key={rfq.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-1">
                      <div className="bg-white rounded-lg">
                        <CardContent className="p-8">
                          <div className="flex items-start justify-between">
                            <div className="space-y-5 flex-1">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                                  <Clock className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-xl text-gray-900">{rfq.projectName}</h3>
                                  <div className="mt-2">
                                    {getStatusBadge(rfq.status)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Package className="h-5 w-5 text-orange-500" />
                                    <span className="text-sm font-medium text-gray-500">Material</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.material}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Package className="h-5 w-5 text-orange-500" />
                                    <span className="text-sm font-medium text-gray-500">Quantity</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.quantity}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Users className="h-5 w-5 text-orange-500" />
                                    <span className="text-sm font-medium text-gray-500">Suppliers</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.assignedSuppliers || 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 ml-6">
                              <Button 
                                onClick={() => setViewQuotesRfq(rfq)}
                                variant="outline"
                                className="border-orange-200 hover:bg-orange-50 hover:border-orange-300 px-6 py-3"
                                size="lg"
                              >
                                <Eye className="h-5 w-5 mr-2" />
                                Check Quotes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
          )}
        </CardContent>
      </Card>

        {/* RFQs with Quotes - Ready for Review */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-1">
            <div className="bg-white rounded-t-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Received Quotes</h2>
                      <p className="text-sm text-gray-600 mt-1">RFQs with supplier quotes ready for review</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 px-3 py-1 text-lg font-semibold">
                      {quotedRfqs.length}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
            </div>
          </div>
          <CardContent className="p-6">
            {quotedRfqs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="h-12 w-12 text-green-300" />
                </div>
                <p className="text-gray-500 text-lg">No RFQs with submitted quotes</p>
                <p className="text-sm text-gray-400 mt-2">Supplier quotes will appear here for your review and selection</p>
              </div>
            ) : (
              <div className="space-y-6">
                {quotedRfqs.map((rfq: any) => (
                  <Card key={rfq.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1">
                      <div className="bg-white rounded-lg">
                        <CardContent className="p-8">
                          <div className="flex items-start justify-between">
                            <div className="space-y-5 flex-1">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                  <DollarSign className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-xl text-gray-900">{rfq.projectName}</h3>
                                  <div className="mt-2">
                                    {getStatusBadge(rfq.status)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Package className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-500">Material</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.material}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Package className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-500">Quantity</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.quantity}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <DollarSign className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-500">Quotes Received</span>
                                  </div>
                                  <p className="font-semibold text-gray-900">{rfq.quotesCount || 0}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 ml-6">
                              <Button 
                                onClick={() => setViewQuotesRfq(rfq)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                                size="lg"
                              >
                                <Eye className="h-5 w-5 mr-2" />
                                Review Quotes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      {/* Supplier Assignment Dialog */}
      {selectedRfq && (
        <Dialog open={!!selectedRfq} onOpenChange={() => setSelectedRfq(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Suppliers - {selectedRfq.projectName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">RFQ Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Material:</strong> {selectedRfq.material}</div>
                  <div><strong>Quantity:</strong> {selectedRfq.quantity}</div>
                  <div><strong>Tolerance:</strong> {selectedRfq.tolerance}</div>
                  <div><strong>Process:</strong> {selectedRfq.manufacturingProcess || 'Any'}</div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Select Suppliers</h4>
                  <Badge variant="secondary">{selectedSuppliers.length} selected</Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                  {suppliers?.map((supplier: any) => {
                    const completionScore = calculateSupplierScore(supplier);
                    const capabilities = supplier.capabilities ? JSON.parse(supplier.capabilities) : [];
                    const isSelected = selectedSuppliers.includes(supplier.id);
                    
                    return (
                      <div 
                        key={supplier.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleToggleSupplier(supplier.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <Checkbox checked={isSelected} readOnly />
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium">{supplier.name}</h5>
                                <Badge 
                                  variant={completionScore >= 80 ? "default" : completionScore >= 60 ? "secondary" : "destructive"}
                                  className="text-xs"
                                >
                                  {completionScore}% Complete
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600">
                                <p><strong>Location:</strong> {supplier.city ? `${supplier.city}, ${supplier.country}` : supplier.country || 'Not specified'}</p>
                                {capabilities.length > 0 && (
                                  <p><strong>Capabilities:</strong> {capabilities.slice(0, 3).join(', ')}{capabilities.length > 3 ? '...' : ''}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right text-xs space-y-1">
                            {supplier.website && <p className="text-blue-600">Website ✓</p>}
                            {capabilities.length > 0 && <p className="text-green-600">Capabilities ({capabilities.length})</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setSelectedRfq(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignRfq}
                  disabled={assignRfqMutation.isPending || selectedSuppliers.length === 0}
                >
                  {assignRfqMutation.isPending ? 'Assigning...' : `Assign to ${selectedSuppliers.length} Suppliers`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quote Review Dialog */}
      {viewQuotesRfq && (
        <Dialog open={!!viewQuotesRfq} onOpenChange={() => setViewQuotesRfq(null)}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Supplier Quotes - {viewQuotesRfq.projectName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">RFQ Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><strong>Material:</strong> {viewQuotesRfq.material}</div>
                  <div><strong>Quantity:</strong> {viewQuotesRfq.quantity}</div>
                  <div><strong>Tolerance:</strong> {viewQuotesRfq.tolerance}</div>
                </div>
              </div>

              {rfqQuotes && rfqQuotes.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Received Quotes ({rfqQuotes.length})</h4>
                  
                  {rfqQuotes.map((quote: any) => (
                    <Card key={quote.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <h5 className="font-semibold text-lg">{quote.supplier?.name}</h5>
                              {getQuoteStatusBadge(quote.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span><strong>Price:</strong> ${quote.price}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span><strong>Lead Time:</strong> {quote.leadTime} days</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span><strong>Submitted:</strong> {format(new Date(quote.submittedAt), 'MMM dd, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span><strong>Location:</strong> {quote.supplier?.city || 'N/A'}</span>
                              </div>
                            </div>

                            {quote.notes && (
                              <div>
                                <p className="text-sm text-gray-600">
                                  <strong>Notes:</strong> {quote.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {quote.status === 'pending' && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => updateQuoteStatusMutation.mutate({ quoteId: quote.id, status: 'accepted' })}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={updateQuoteStatusMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateQuoteStatusMutation.mutate({ quoteId: quote.id, status: 'rejected' })}
                                disabled={updateQuoteStatusMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No quotes received yet</p>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setViewQuotesRfq(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}