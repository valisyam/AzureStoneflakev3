import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getAuthToken } from '@/lib/queryClient';
import { 
  Clock, 
  DollarSign, 
  Package, 
  CheckCircle, 
  XCircle, 
  Download,
  Users,
  Quote,
  Target,
  Building2,
  Mail,
  Calendar,
  FileText,
  X,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/layout/header';

interface SupplierQuote {
  id: string;
  rfqId: string;
  supplierId: string;
  price: number;
  leadTime: number;
  notes?: string;
  quoteFileUrl?: string;
  status: 'pending' | 'accepted' | 'not_selected';
  submittedAt: string;
  hasPurchaseOrder?: boolean;
  supplier: {
    id: string;
    name: string;
    email: string;
    supplierNumber?: string;
    company?: string;
    city?: string;
    country?: string;
  };
}

interface RFQWithQuotes {
  id: string;
  projectName: string;
  material: string;
  quantity: number;
  status: string;
  createdAt: string;
  referenceNumber?: string;
  supplierQuotes: SupplierQuote[];
  assignedSuppliers: {
    id: string;
    name: string;
    email: string;
    hasQuoted: boolean;
  }[];
}

interface AdminSupplierQuotesProps {
  showHeader?: boolean;
}

export default function AdminSupplierQuotes({ showHeader = true }: AdminSupplierQuotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [referenceFilter, setReferenceFilter] = useState<string>('all');
  const [createPOQuote, setCreatePOQuote] = useState<SupplierQuote | null>(null);
  const [selectedQuoteDetails, setSelectedQuoteDetails] = useState<SupplierQuote | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [quoteToReject, setQuoteToReject] = useState<SupplierQuote | null>(null);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [poForm, setPOForm] = useState({
    deliveryDate: '',
    notes: '',
    poFile: null as File | null
  });
  
  // Fetch supplier quotes grouped by RFQ
  const { data: rfqsWithQuotes = [], isLoading } = useQuery({
    queryKey: ['/api/admin/rfqs/supplier-quotes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/rfqs/supplier-quotes');
      const result = await response.json();
      return result;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  // Force refetch data manually
  const forceRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/rfqs/supplier-quotes'] });
  };

  // Update quote status mutation
  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({ quoteId, status, adminFeedback }: { quoteId: string; status: string; adminFeedback?: string }) => {
      const response = await apiRequest('PUT', `/api/admin/supplier-quotes/${quoteId}/status`, { status, adminFeedback });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rfqs/supplier-quotes'] });
      toast({
        title: "Success",
        description: "Quote status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      });
    },
  });

  // Create Purchase Order mutation
  const createPOMutation = useMutation({
    mutationFn: async (data: { quoteId: string; deliveryDate: string; notes: string; poFile: File | null }) => {
      const formData = new FormData();
      formData.append('supplierQuoteId', data.quoteId);
      formData.append('deliveryDate', data.deliveryDate);
      formData.append('notes', data.notes);
      if (data.poFile) {
        formData.append('poFile', data.poFile);
      }
      
      const token = getAuthToken();
      const response = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create purchase order');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rfqs/supplier-quotes'] });
      setCreatePOQuote(null);
      setPOForm({ deliveryDate: '', notes: '', poFile: null });
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const handleCreatePO = () => {
    if (!createPOQuote) return;
    createPOMutation.mutate({
      quoteId: createPOQuote.id,
      deliveryDate: poForm.deliveryDate,
      notes: poForm.notes,
      poFile: poForm.poFile
    });
  };

  // Handle different response formats - sometimes the API might return an object instead of array
  let rfqArray = rfqsWithQuotes;
  if (!Array.isArray(rfqsWithQuotes)) {
    if (rfqsWithQuotes && typeof rfqsWithQuotes === 'object' && rfqsWithQuotes.data) {
      rfqArray = rfqsWithQuotes.data;
    } else if (rfqsWithQuotes && typeof rfqsWithQuotes === 'object') {
      // If it's a single object, wrap it in an array
      rfqArray = [rfqsWithQuotes];
    } else {
      rfqArray = [];
    }
  }
  
  const filteredRfqs = Array.isArray(rfqArray) ? rfqArray.filter((rfq: RFQWithQuotes) => {
    const matchesSearch = !searchTerm || 
      rfq.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesReference = referenceFilter === 'all' || 
      (referenceFilter === 'with-ref' && rfq.referenceNumber) ||
      (referenceFilter === 'no-ref' && !rfq.referenceNumber);
    
    return matchesSearch && matchesReference;
  }) : [];

  // Group RFQs by reference number
  console.log('filteredRfqs.length:', filteredRfqs.length);
  
  const groupedRfqs = filteredRfqs.reduce((acc: any, rfq: RFQWithQuotes) => {
    const key = rfq.referenceNumber || 'no-reference';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rfq);
    return acc;
  }, {});
  
  console.log('groupedRfqs:', groupedRfqs);
  console.log('Object.keys(groupedRfqs):', Object.keys(groupedRfqs));

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, color: 'text-yellow-600', label: 'Pending' },
      accepted: { variant: 'default' as const, color: 'text-green-600', label: 'Accepted' },
      not_selected: { variant: 'secondary' as const, color: 'text-orange-600', label: 'Not Selected' },
      rejected: { variant: 'secondary' as const, color: 'text-orange-600', label: 'Not Selected' }, // Legacy support
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateQuoteStats = (quotes: SupplierQuote[]) => {
    const prices = quotes.map(q => q.price).filter(p => p > 0);
    const leadTimes = quotes.map(q => q.leadTime).filter(t => t > 0);
    
    return {
      totalQuotes: quotes.length,
      pendingQuotes: quotes.filter(q => q.status === 'pending').length,
      avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      avgLeadTime: leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0,
    };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={showHeader ? "min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" : ""}>
      {showHeader && <Header />}
      <div className={showHeader ? "p-6 space-y-6" : "space-y-6"}>
        {showHeader && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Supplier Quote Management</h1>
              <p className="text-gray-600 mt-1">Compare and manage quotes from suppliers organized by project reference</p>
            </div>
            <Button onClick={forceRefetch} className="bg-blue-600 hover:bg-blue-700">
              Force Refresh Data
            </Button>
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 lg:w-auto">
          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">{Object.keys(groupedRfqs).length}</div>
                <div className="text-xs text-gray-500">Projects</div>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <Quote className="h-4 w-4 text-green-600" />
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {filteredRfqs.reduce((sum: number, rfq: RFQWithQuotes) => sum + rfq.supplierQuotes.length, 0)}
                </div>
                <div className="text-xs text-gray-500">Total Quotes</div>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {new Set(filteredRfqs.flatMap((rfq: RFQWithQuotes) => rfq.supplierQuotes.map(q => q.supplierId))).size}
                </div>
                <div className="text-xs text-gray-500">Suppliers</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium">Search Projects</Label>
              <Input
                id="search"
                placeholder="Search by project name, material, or reference number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full lg:w-48">
              <Label htmlFor="reference-filter" className="text-sm font-medium">Reference Filter</Label>
              <Select value={referenceFilter} onValueChange={setReferenceFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="with-ref">With Reference</SelectItem>
                  <SelectItem value="no-ref">No Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Project Groups */}
        <div className="space-y-6">
          {Object.entries(groupedRfqs).map(([referenceNumber, rfqs]: [string, any]) => (
            <Card key={referenceNumber} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${referenceNumber === 'no-reference' ? 'bg-gray-100' : 'bg-blue-100'}`}>
                      <Target className={`h-5 w-5 ${referenceNumber === 'no-reference' ? 'text-gray-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {referenceNumber === 'no-reference' ? 'Projects Without Reference' : `Reference: ${referenceNumber}`}
                      </h3>
                      <p className="text-sm text-gray-500">{rfqs.length} project(s) in this group</p>
                    </div>
                  </div>
                  {referenceNumber !== 'no-reference' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {referenceNumber}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {rfqs.map((rfq: RFQWithQuotes) => {
                  const stats = calculateQuoteStats(rfq.supplierQuotes);
                  
                  return (
                    <Card key={rfq.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Package className="h-4 w-4 text-gray-600" />
                              <h4 className="font-semibold text-gray-900">{rfq.projectName}</h4>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500">Material:</span>
                                <span className="font-medium">{rfq.material}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500">Quantity:</span>
                                <span className="font-medium">{rfq.quantity}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500">Suppliers:</span>
                                <span className="font-medium">{rfq.assignedSuppliers.length}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500">Quotes:</span>
                                <span className="font-medium">{stats.totalQuotes}</span>
                              </div>
                            </div>
                          </div>
                          
                          {stats.totalQuotes > 0 && (
                            <div className="grid grid-cols-2 gap-3 text-center ml-4">
                              <div className="bg-green-50 p-2 rounded-lg">
                                <div className="text-xs text-green-600 font-medium">Best Price</div>
                                <div className="text-sm font-bold text-green-700">${stats.minPrice.toLocaleString()}</div>
                              </div>
                              <div className="bg-blue-50 p-2 rounded-lg">
                                <div className="text-xs text-blue-600 font-medium">Avg Lead Time</div>
                                <div className="text-sm font-bold text-blue-700">{Math.round(stats.avgLeadTime)} days</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {rfq.supplierQuotes.length === 0 ? (
                          <div className="text-center py-6 text-gray-500">
                            <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No quotes received yet</p>
                            <p className="text-sm">Waiting for {rfq.assignedSuppliers.length} suppliers to respond</p>
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {(() => {
                              // Group quotes by supplier company
                              const groupedQuotes = new Map<string, { 
                                companyName: string;
                                companyNumber: string | null;
                                quotes: SupplierQuote[];
                                isCompany: boolean;
                              }>();
                              
                              rfq.supplierQuotes.forEach(quote => {
                                // Use supplier company as key, or individual supplier if no company
                                const companyKey = quote.supplier.company || quote.supplier.name;
                                const isCompany = !!quote.supplier.company;
                                
                                if (!groupedQuotes.has(companyKey)) {
                                  groupedQuotes.set(companyKey, {
                                    companyName: companyKey,
                                    companyNumber: quote.supplier.supplierNumber,
                                    quotes: [],
                                    isCompany
                                  });
                                }
                                
                                groupedQuotes.get(companyKey)!.quotes.push(quote);
                              });
                              
                              return Array.from(groupedQuotes.values()).map((group) => {
                                // For company groups, show the best quote or most recent
                                const representativeQuote = group.quotes.reduce((best, current) => 
                                  current.price < best.price ? current : best
                                );
                                
                                return (
                                  <Card key={`${group.companyName}-${representativeQuote.id}`} className="border border-gray-100 bg-gray-50/50">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <Building2 className="h-4 w-4 text-gray-600" />
                                            <span className="font-semibold text-gray-900">
                                              {group.isCompany ? group.companyName : representativeQuote.supplier.name}
                                            </span>
                                            {group.companyNumber && (
                                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                {group.companyNumber}
                                              </Badge>
                                            )}
                                            {group.isCompany && group.quotes.length > 1 && (
                                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                {group.quotes.length} quotes from company
                                              </Badge>
                                            )}
                                            {getStatusBadge(representativeQuote.status)}
                                          </div>
                                          
                                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-3">
                                            <div className="flex items-center space-x-1">
                                              <DollarSign className="h-3 w-3 text-green-600" />
                                              <span className="text-gray-500">Best Price:</span>
                                              <span className="font-bold text-green-700">${representativeQuote.price.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <Clock className="h-3 w-3 text-blue-600" />
                                              <span className="text-gray-500">Lead Time:</span>
                                              <span className="font-medium">{representativeQuote.leadTime} days</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <Mail className="h-3 w-3 text-gray-500" />
                                              <span className="text-gray-500">{group.isCompany ? 'Company' : representativeQuote.supplier.email}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <Calendar className="h-3 w-3 text-gray-500" />
                                              <span className="text-gray-500">{format(new Date(representativeQuote.submittedAt), 'MMM dd')}</span>
                                            </div>
                                          </div>
                                          
                                          {representativeQuote.notes && (
                                            <div className="bg-white p-2 rounded border text-sm mb-2">
                                              <span className="text-gray-500">Notes:</span> {representativeQuote.notes}
                                            </div>
                                          )}
                                          
                                          {representativeQuote.quoteFileUrl && (
                                            <div className="bg-blue-50 p-2 rounded border text-xs text-blue-700">
                                              📎 Quote document attached - Click download button to view
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex space-x-2 ml-4">
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-8 text-blue-600 border-blue-600 hover:bg-blue-50"
                                            onClick={() => setSelectedQuoteDetails(representativeQuote)}
                                            title="View Quote Details"
                                          >
                                            <FileText className="h-3 w-3 mr-1" />
                                            Details
                                          </Button>
                                          {representativeQuote.quoteFileUrl ? (
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              className="h-8"
                                              onClick={() => window.open(representativeQuote.quoteFileUrl, '_blank')}
                                              title="View Quote Attachment"
                                            >
                                              <Download className="h-3 w-3 mr-1" />
                                              Download
                                            </Button>
                                          ) : (
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              className="h-8"
                                              disabled
                                              title="No attachment available"
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              No File
                                            </Button>
                                          )}
                                          
                                          {representativeQuote.status === 'pending' && (
                                            <>
                                              <Button 
                                                size="sm" 
                                                className="h-8 bg-green-600 hover:bg-green-700"
                                                onClick={() => updateQuoteStatusMutation.mutate({ quoteId: representativeQuote.id, status: 'accepted' })}
                                                disabled={updateQuoteStatusMutation.isPending}
                                                title="Accept this quote"
                                              >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Accept
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="h-8 text-red-600 border-red-600 hover:bg-red-50"
                                                onClick={() => updateQuoteStatusMutation.mutate({ quoteId: representativeQuote.id, status: 'not_selected' })}
                                                disabled={updateQuoteStatusMutation.isPending}
                                                title="Reject this quote"
                                              >
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Reject
                                              </Button>
                                            </>
                                          )}
                                          
                                          {representativeQuote.status === 'accepted' && !representativeQuote.hasPurchaseOrder && (
                                            <Button 
                                              size="sm" 
                                              className="h-8 bg-blue-600 hover:bg-blue-700"
                                              onClick={() => setCreatePOQuote(representativeQuote)}
                                              title="Create purchase order for this accepted quote"
                                            >
                                              <Package className="h-3 w-3 mr-1" />
                                              Create PO
                                            </Button>
                                          )}
                                          
                                          {representativeQuote.hasPurchaseOrder && (
                                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                              PO Created
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Purchase Order Dialog */}
        <Dialog open={!!createPOQuote} onOpenChange={(open) => !open && setCreatePOQuote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            
            {createPOQuote && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">Selected Quote:</p>
                  <p className="text-lg font-bold text-blue-700">${createPOQuote.price.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">from {createPOQuote.supplier.name}</p>
                </div>
                
                <div>
                  <Label htmlFor="delivery-date">Expected Delivery Date</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={poForm.deliveryDate}
                    onChange={(e) => setPOForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    className="mt-1"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <Label htmlFor="po-notes">Purchase Order Notes</Label>
                  <Textarea
                    id="po-notes"
                    placeholder="Additional notes or requirements..."
                    value={poForm.notes}
                    onChange={(e) => setPOForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 h-24"
                  />
                </div>
                
                <div>
                  <Label htmlFor="po-file">Attach PO Document (Optional)</Label>
                  <Input
                    id="po-file"
                    type="file"
                    onChange={(e) => setPOForm(prev => ({ ...prev, poFile: e.target.files?.[0] || null }))}
                    className="mt-1"
                    accept=".pdf,.doc,.docx"
                  />
                  {poForm.poFile && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {poForm.poFile.name}
                    </p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreatePOQuote(null);
                      setPOForm({ deliveryDate: '', notes: '', poFile: null });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePO}
                    disabled={createPOMutation.isPending || !poForm.deliveryDate}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createPOMutation.isPending ? 'Creating...' : 'Create PO'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quote Details Dialog */}
        <Dialog open={!!selectedQuoteDetails} onOpenChange={(open) => !open && setSelectedQuoteDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Quote Details</DialogTitle>
            </DialogHeader>
            
            {selectedQuoteDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Supplier</p>
                    <p className="text-lg font-semibold">{selectedQuoteDetails.supplier.name}</p>
                    <p className="text-sm text-gray-500">{selectedQuoteDetails.supplier.email}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-600">Quote Amount</p>
                    <p className="text-2xl font-bold text-green-700">${selectedQuoteDetails.price.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">Lead Time</p>
                    <p className="text-xl font-bold text-blue-700">{selectedQuoteDetails.leadTime} days</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-purple-600">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedQuoteDetails.status)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-sm">{format(new Date(selectedQuoteDetails.submittedAt), 'PPP at p')}</p>
                </div>
                
                {selectedQuoteDetails.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 mb-2">Supplier Notes</p>
                    <p className="text-sm">{selectedQuoteDetails.notes}</p>
                  </div>
                )}
                
                {selectedQuoteDetails.quoteFileUrl && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-600 mb-2">Quote Document</p>
                    <Button 
                      size="sm"
                      onClick={() => window.open(selectedQuoteDetails.quoteFileUrl, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Attachment
                    </Button>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedQuoteDetails(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Quote Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Provide Feedback for Rejected Quote</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback">Feedback Message</Label>
                <textarea
                  id="feedback"
                  className="w-full p-3 border rounded-md h-24 text-sm"
                  placeholder="Thank you for your quote. We've decided to go with another supplier for this project. We appreciate your time and look forward to working with you on future opportunities."
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFeedbackDialog(false);
                    setQuoteToReject(null);
                    setAdminFeedback('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (quoteToReject) {
                      updateQuoteStatusMutation.mutate({ 
                        quoteId: quoteToReject.id, 
                        status: 'not_selected',
                        adminFeedback: adminFeedback || 'Quote not selected for this project.'
                      });
                    }
                    setShowFeedbackDialog(false);
                    setQuoteToReject(null);
                    setAdminFeedback('');
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Send Feedback
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}