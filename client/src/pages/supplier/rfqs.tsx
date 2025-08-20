import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import SupplierLayout from '@/components/layout/SupplierLayout';
import { 
  FileText, 
  Clock, 
  DollarSign, 
  Calendar, 
  Package, 
  Eye,
  Send,
  Download,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowUpDown,
  Filter
} from 'lucide-react';

import { format } from 'date-fns';

export default function SupplierRFQs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  
  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [quoteData, setQuoteData] = useState({
    price: '',
    leadTime: '',
    notes: '',
    quoteFile: null as File | null,
    // Enhanced pricing breakdown fields
    currency: 'USD',
    toolingCost: '',
    partCostPerPiece: '',
    shippingCost: '',
    taxPercentage: '',
    discountPercentage: '',
    paymentTerms: 'Net 30',
    validUntil: ''
  });

  const { data: rfqs, isLoading } = useQuery({
    queryKey: ['/api/supplier/rfqs'],
    enabled: !!user && user.role === 'supplier'
  });

  const { data: myQuotes } = useQuery({
    queryKey: ['/api/supplier/quotes'],
    enabled: !!user && user.role === 'supplier'
  });

  const assignedRfqs = Array.isArray(rfqs) ? rfqs : [];
  const submittedQuotes = Array.isArray(myQuotes) ? myQuotes : [];

  // Filter and sort submitted quotes
  const filteredAndSortedQuotes = useMemo(() => {
    let filtered = submittedQuotes;

    // Filter by search term (project name or RFQ number)
    if (searchTerm.trim()) {
      filtered = filtered.filter(quote => 
        quote.rfq?.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.rfq?.sqteNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    // Sort quotes
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'date_desc':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'project_asc':
          return (a.rfq?.projectName || '').localeCompare(b.rfq?.projectName || '');
        case 'project_desc':
          return (b.rfq?.projectName || '').localeCompare(a.rfq?.projectName || '');
        case 'price_asc':
          return parseFloat(a.price) - parseFloat(b.price);
        case 'price_desc':
          return parseFloat(b.price) - parseFloat(a.price);
        case 'status_asc':
          return a.status.localeCompare(b.status);
        case 'status_desc':
          return b.status.localeCompare(a.status);
        default:
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
    });
  }, [submittedQuotes, searchTerm, statusFilter, sortBy]);

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/supplier/notifications'],
    enabled: !!user && user.role === 'supplier'
  });

  // Mark RFQ notifications as read when user visits this page
  useEffect(() => {
    const markRfqNotificationsAsRead = async () => {
      const unreadRfqNotifications = notifications.filter(
        (notification) => notification.type === 'rfq_assignment' && !notification.isRead
      );
      
      for (const notification of unreadRfqNotifications) {
        try {
          await fetch(`/api/supplier/notifications/${notification.id}/read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }
      
      if (unreadRfqNotifications.length > 0) {
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['/api/supplier/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      }
    };

    if (notifications.length > 0) {
      markRfqNotificationsAsRead();
    }
  }, [notifications, queryClient]);

  const submitQuoteMutation = useMutation({
    mutationFn: async (data: { 
      rfqId: string; 
      price: number; 
      leadTime: number; 
      notes: string; 
      quoteFile?: File;
      currency: string;
      toolingCost?: number;
      partCostPerPiece?: number;
      materialCostPerPiece?: number;
      machiningCostPerPiece?: number;
      finishingCostPerPiece?: number;
      packagingCostPerPiece?: number;
      shippingCost?: number;
      taxPercentage?: number;
      discountPercentage?: number;
      paymentTerms: string;
      validUntil?: string;
    }) => {
      const formData = new FormData();
      formData.append('rfqId', data.rfqId);
      formData.append('price', data.price.toString());
      formData.append('leadTime', data.leadTime.toString());
      formData.append('notes', data.notes);
      formData.append('currency', data.currency);
      formData.append('paymentTerms', data.paymentTerms);
      
      // Add optional pricing breakdown fields
      if (data.toolingCost) formData.append('toolingCost', data.toolingCost.toString());
      if (data.partCostPerPiece) formData.append('partCostPerPiece', data.partCostPerPiece.toString());
      if (data.shippingCost) formData.append('shippingCost', data.shippingCost.toString());
      if (data.taxPercentage) formData.append('taxPercentage', data.taxPercentage.toString());
      if (data.discountPercentage) formData.append('discountPercentage', data.discountPercentage.toString());
      if (data.validUntil) formData.append('validUntil', data.validUntil);
      
      if (data.quoteFile) {
        formData.append('quoteFile', data.quoteFile);
      }

      const token = localStorage.getItem('stoneflake_token');
      if (!token) {
        throw new Error('Please log in again to submit a quote');
      }

      const response = await fetch('/api/supplier/quote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to submit quote';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If it's not JSON, use the text as error message
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Submitted",
        description: "Your quote has been submitted successfully."
      });
      setSelectedRfq(null);
      setQuoteData({ 
        price: '', 
        leadTime: '', 
        notes: '', 
        quoteFile: null,
        currency: 'USD',
        toolingCost: '',
        partCostPerPiece: '',
        shippingCost: '',
        taxPercentage: '',
        discountPercentage: '',
        paymentTerms: 'Net 30',
        validUntil: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/rfqs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/dashboard/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit quote.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return <PageLoader role="supplier" />;
  }

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq || !quoteData.price || !quoteData.leadTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    submitQuoteMutation.mutate({
      rfqId: selectedRfq.id,
      price: parseFloat(quoteData.price),
      leadTime: parseInt(quoteData.leadTime),
      notes: quoteData.notes,
      quoteFile: quoteData.quoteFile || undefined,
      currency: quoteData.currency,
      toolingCost: quoteData.toolingCost ? parseFloat(quoteData.toolingCost) : undefined,
      partCostPerPiece: quoteData.partCostPerPiece ? parseFloat(quoteData.partCostPerPiece) : undefined,
      materialCostPerPiece: quoteData.materialCostPerPiece ? parseFloat(quoteData.materialCostPerPiece) : undefined,
      machiningCostPerPiece: quoteData.machiningCostPerPiece ? parseFloat(quoteData.machiningCostPerPiece) : undefined,
      finishingCostPerPiece: quoteData.finishingCostPerPiece ? parseFloat(quoteData.finishingCostPerPiece) : undefined,
      packagingCostPerPiece: quoteData.packagingCostPerPiece ? parseFloat(quoteData.packagingCostPerPiece) : undefined,
      shippingCost: quoteData.shippingCost ? parseFloat(quoteData.shippingCost) : undefined,
      taxPercentage: quoteData.taxPercentage ? parseFloat(quoteData.taxPercentage) : undefined,
      discountPercentage: quoteData.discountPercentage ? parseFloat(quoteData.discountPercentage) : undefined,
      paymentTerms: quoteData.paymentTerms,
      validUntil: quoteData.validUntil || undefined
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-orange-100 text-orange-800">New Assignment</Badge>;
      case 'quoted':
        return <Badge className="bg-blue-100 text-blue-800">Quote Submitted</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const hasSubmittedQuote = (rfqId: string) => {
    return myQuotes?.some((quote: any) => quote.rfqId === rfqId);
  };

  const getSubmittedQuote = (rfqId: string) => {
    return myQuotes?.find((quote: any) => quote.rfqId === rfqId);
  };

  const pendingRFQs = rfqs?.filter((rfq: any) => rfq.status === 'assigned' && !hasSubmittedQuote(rfq.rfqId)) || [];
  const quotedRFQs = rfqs?.filter((rfq: any) => hasSubmittedQuote(rfq.rfqId)) || [];

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RFQ Assignments</h1>
          <p className="text-gray-600 mt-2">Review and submit quotes for assigned RFQs</p>
        </div>

      {/* Pending RFQs - Needs Quote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Clock className="h-5 w-5" />
            Pending RFQs ({pendingRFQs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRFQs.length === 0 ? (
            <p className="text-gray-500">No pending RFQ assignments</p>
          ) : (
            <div className="space-y-4">
              {pendingRFQs.map((assignment: any) => (
                <Card key={assignment.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{assignment.rfq?.projectName}</h3>
                          {getStatusBadge(assignment.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span><strong>Material:</strong> {assignment.rfq?.material}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span><strong>Quantity:</strong> {assignment.rfq?.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span><strong>Assigned:</strong> {format(new Date(assignment.assignedAt), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>

                        {assignment.rfq?.notes && (
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Requirements:</strong> {assignment.rfq.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>RFQ Details - {assignment.rfq?.projectName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-medium">Material</Label>
                                  <p>{assignment.rfq?.material}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Material Grade</Label>
                                  <p>{assignment.rfq?.materialGrade || 'Not specified'}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Finishing</Label>
                                  <p>{assignment.rfq?.finishing || 'Not specified'}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Tolerance</Label>
                                  <p>{assignment.rfq?.tolerance}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Quantity</Label>
                                  <p>{assignment.rfq?.quantity}</p>
                                </div>
                                <div>
                                  <Label className="font-medium">Manufacturing Process</Label>
                                  <p>{assignment.rfq?.manufacturingProcess || 'Not specified'}</p>
                                </div>
                              </div>
                              
                              {assignment.rfq?.notes && (
                                <div>
                                  <Label className="font-medium">Additional Requirements</Label>
                                  <p className="mt-1">{assignment.rfq.notes}</p>
                                </div>
                              )}

                              {assignment.rfq?.specialInstructions && (
                                <div>
                                  <Label className="font-medium">Special Instructions</Label>
                                  <p className="mt-1">{assignment.rfq.specialInstructions}</p>
                                </div>
                              )}

                              {assignment.rfq?.files && assignment.rfq.files.length > 0 && (
                                <div>
                                  <Label className="font-medium">Attached Files</Label>
                                  <div className="mt-2 space-y-2">
                                    {assignment.rfq.files.map((file: any) => (
                                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-3">
                                          <FileText className="h-4 w-4" />
                                          <div>
                                            <span className="text-sm font-medium">{file.fileName}</span>
                                            <p className="text-xs text-gray-500">{(file.fileSize / 1024).toFixed(1)} KB</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={async () => {
                                              try {
                                                const token = localStorage.getItem('stoneflake_token');
                                                if (!token) {
                                                  toast({
                                                    title: "Error",
                                                    description: "Please log in to download files",
                                                    variant: "destructive"
                                                  });
                                                  return;
                                                }

                                                const response = await fetch(`/api/files/${file.id}/download`, {
                                                  headers: {
                                                    'Authorization': `Bearer ${token}`
                                                  }
                                                });
                                                
                                                if (response.ok) {
                                                  const blob = await response.blob();
                                                  const url = window.URL.createObjectURL(blob);
                                                  const a = document.createElement('a');
                                                  a.href = url;
                                                  a.download = file.fileName;
                                                  document.body.appendChild(a);
                                                  a.click();
                                                  window.URL.revokeObjectURL(url);
                                                  document.body.removeChild(a);
                                                  
                                                  toast({
                                                    title: "Success",
                                                    description: `Downloaded ${file.fileName}`,
                                                  });
                                                } else {
                                                  const errorData = await response.json().catch(() => ({}));
                                                  toast({
                                                    title: "Download Failed",
                                                    description: errorData.message || "Unable to download file",
                                                    variant: "destructive"
                                                  });
                                                }
                                              } catch (error) {
                                                console.error('Download error:', error);
                                                toast({
                                                  title: "Download Error",
                                                  description: "Network error occurred while downloading",
                                                  variant: "destructive"
                                                });
                                              }
                                            }}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          onClick={() => setSelectedRfq(assignment.rfq)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Submit Quote
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submitted Quotes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Send className="h-5 w-5" />
              Submitted Quotes ({filteredAndSortedQuotes.length})
            </CardTitle>
          </div>
          
          {/* Filtering and Sorting Controls */}
          {submittedQuotes.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by project name or RFQ number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Latest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                    <SelectItem value="project_asc">Project A-Z</SelectItem>
                    <SelectItem value="project_desc">Project Z-A</SelectItem>
                    <SelectItem value="price_desc">Price High-Low</SelectItem>
                    <SelectItem value="price_asc">Price Low-High</SelectItem>
                    <SelectItem value="status_asc">Status A-Z</SelectItem>
                    <SelectItem value="status_desc">Status Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredAndSortedQuotes.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm || statusFilter !== 'all' ? (
                <div>
                  <p className="text-gray-500 mb-2">No quotes match your search criteria</p>
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">No quotes submitted yet</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedQuotes.map((quote: any) => {
                return (
                  <Card key={quote.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{quote.rfq?.projectName}</h3>
                            {getQuoteStatusBadge(quote.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span><strong>Quote:</strong> {quote.currency || 'USD'} {quote.price}</span>
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
                              <span><strong>Quantity:</strong> {quote.rfq?.quantity}</span>
                            </div>
                          </div>

                          {quote.notes && (
                            <div>
                              <p className="text-sm text-gray-600">
                                <strong>Quote Notes:</strong> {quote.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          {quote.quoteFileUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(quote.quoteFileUrl, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download Quote
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Submission Dialog */}
      {selectedRfq && (
        <Dialog open={!!selectedRfq} onOpenChange={() => setSelectedRfq(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Quote - {selectedRfq.projectName}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmitQuote} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">RFQ Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Material:</strong> {selectedRfq.material}</div>
                  <div><strong>Quantity:</strong> {selectedRfq.quantity}</div>
                  <div><strong>Tolerance:</strong> {selectedRfq.tolerance}</div>
                  <div><strong>Finishing:</strong> {selectedRfq.finishing || 'Not specified'}</div>
                </div>
                {selectedRfq.notes && (
                  <div className="mt-3">
                    <strong>Additional Requirements:</strong>
                    <p className="text-sm text-gray-600 mt-1">{selectedRfq.notes}</p>
                  </div>
                )}
                {selectedRfq.specialInstructions && (
                  <div className="mt-3">
                    <strong>Special Instructions:</strong>
                    <p className="text-sm text-gray-600 mt-1">{selectedRfq.specialInstructions}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-4 text-blue-900">Basic Quote Information</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency *</Label>
                      <Select value={quoteData.currency} onValueChange={(value) => setQuoteData(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Total Quote Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={quoteData.price}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="leadTime">Lead Time (days) *</Label>
                      <Input
                        id="leadTime"
                        type="number"
                        value={quoteData.leadTime}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, leadTime: e.target.value }))}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-4 text-green-900">Detailed Cost Breakdown (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="toolingCost">Tooling/Setup Cost</Label>
                      <Input
                        id="toolingCost"
                        type="number"
                        step="0.01"
                        value={quoteData.toolingCost}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, toolingCost: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partCostPerPiece">Part Cost Per Piece</Label>
                      <Input
                        id="partCostPerPiece"
                        type="number"
                        step="0.01"
                        value={quoteData.partCostPerPiece}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, partCostPerPiece: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-4 text-yellow-900">Additional Costs & Terms</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingCost">Total Shipping Cost</Label>
                      <Input
                        id="shippingCost"
                        type="number"
                        step="0.01"
                        value={quoteData.shippingCost}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, shippingCost: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                      <Input
                        id="taxPercentage"
                        type="number"
                        step="0.01"
                        value={quoteData.taxPercentage}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, taxPercentage: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                      <Input
                        id="discountPercentage"
                        type="number"
                        step="0.01"
                        value={quoteData.discountPercentage}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select value={quoteData.paymentTerms} onValueChange={(value) => setQuoteData(prev => ({ ...prev, paymentTerms: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="50% upfront">50% upfront</SelectItem>
                          <SelectItem value="100% upfront">100% upfront</SelectItem>
                          <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="validUntil">Quote Valid Until</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={quoteData.validUntil}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, validUntil: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={quoteData.notes}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information about your quote..."
                />
              </div>

              <div>
                <Label htmlFor="quoteFile">Quote Document (Optional)</Label>
                <Input
                  id="quoteFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setQuoteData(prev => ({ ...prev, quoteFile: e.target.files?.[0] || null }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setSelectedRfq(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitQuoteMutation.isPending}>
                  {submitQuoteMutation.isPending ? 'Submitting...' : 'Submit Quote'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </SupplierLayout>
  );
}