import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RFQ, SalesQuote } from "@shared/schema";
import type { RFQ as RFQType, SalesQuote as SalesQuoteType } from "@shared/schema";
import { Download, Eye, FileText, Calendar, DollarSign, Check, X, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { extractDisplayId } from "@shared/utils";

export default function QuotesList() {
  const [selectedRFQ, setSelectedRFQ] = useState<RFQType | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SalesQuoteType | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseType, setResponseType] = useState<'accept' | 'decline' | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [purchaseOrderFile, setPurchaseOrderFile] = useState<globalThis.File | null>(null);
  const [poFiles, setPoFiles] = useState<{[quoteId: string]: File}>({});
  const [poNumbers, setPoNumbers] = useState<{[quoteId: string]: string}>({});
  const [uploadingPO, setUploadingPO] = useState<{[quoteId: string]: boolean}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery<(SalesQuoteType & { rfq: RFQType })[]>({
    queryKey: ["/api/quotes"],
  });

  const handleViewQuote = async (quote: SalesQuoteType & { rfq: RFQType }) => {
    try {
      setSelectedRFQ(quote.rfq);
      setSelectedQuote(quote);
      setIsViewModalOpen(true);
      setShowResponseForm(false);
      setResponseType(null);
      setResponseMessage("");
      setPurchaseOrderFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load quote details",
        variant: "destructive",
      });
    }
  };

  const handleResponseSubmit = async () => {
    if (!selectedRFQ || !responseType) return;

    try {
      const formData = new FormData();
      formData.append('status', responseType);
      formData.append('response', responseMessage);
      
      if (purchaseOrderFile) {
        formData.append('purchaseOrder', purchaseOrderFile);
      }

      const token = localStorage.getItem('stoneflake_token');
      const res = await fetch(`/api/rfqs/${selectedRFQ.id}/quote/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to respond to quote');
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/rfqs"] });
      
      toast({
        title: "Success",
        description: `Quote ${responseType}ed successfully`,
      });

      setIsViewModalOpen(false);
      setShowResponseForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to respond to quote",
        variant: "destructive",
      });
    }
  };

  const handleStartResponse = (type: 'accept' | 'decline') => {
    setResponseType(type);
    setShowResponseForm(true);
    setResponseMessage("");
    setPurchaseOrderFile(null);
  };

  const handlePOSubmit = async (quote: SalesQuoteType & { rfq: RFQType }) => {
    if (!poFiles[quote.id] || !poNumbers[quote.id]) {
      toast({
        title: "Error",
        description: "Please select a purchase order file and enter the PO number",
        variant: "destructive",
      });
      return;
    }

    setUploadingPO(prev => ({...prev, [quote.id]: true}));

    try {
      const formData = new FormData();
      formData.append('purchaseOrder', poFiles[quote.id]);
      formData.append('purchaseOrderNumber', poNumbers[quote.id]);

      const token = localStorage.getItem('stoneflake_token');
      const res = await fetch(`/api/quotes/${quote.id}/purchase-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('PO upload failed');
      }

      // Force refetch quotes data to show updated status
      await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      await queryClient.refetchQueries({ queryKey: ["/api/quotes"] });
      
      // Small delay to ensure UI updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/quotes"] });
      }, 500);
      
      toast({
        title: "Success",
        description: "Purchase order uploaded successfully! Stoneflake will review and create your sales order.",
      });

      // Clear the file and number from state
      setPoFiles(prev => {
        const newFiles = {...prev};
        delete newFiles[quote.id];
        return newFiles;
      });
      setPoNumbers(prev => {
        const newNumbers = {...prev};
        delete newNumbers[quote.id];
        return newNumbers;
      });

    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload purchase order",
        variant: "destructive",
      });
    } finally {
      setUploadingPO(prev => ({...prev, [quote.id]: false}));
    }
  };

  const handleDownloadPO = async (quote: SalesQuoteType) => {
    try {
      const token = localStorage.getItem('stoneflake_token');
      const response = await fetch(`/api/quotes/${quote.id}/purchase-order/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download purchase order');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PO-${quote.purchaseOrderNumber || extractDisplayId(quote.rfq || {})}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Purchase order download started",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download purchase order",
        variant: "destructive",
      });
    }
  };

  const handleDownloadQuote = async (rfqId: string) => {
    try {
      const token = localStorage.getItem('stoneflake_token');
      const res = await fetch(`/api/quotes/${rfqId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `quote-${selectedRFQ?.sqteNumber || extractDisplayId(selectedRFQ || {})}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Quote downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download quote",
        variant: "destructive",
      });
    }
  };

  const pendingQuotes = quotes?.filter(quote => quote.status === 'pending') || [];
  const waitingForPOQuotes = quotes?.filter(quote => quote.status === 'accepted' && !quote.purchaseOrderUrl) || [];
  const poSubmittedQuotes = quotes?.filter(quote => quote.status === 'accepted' && quote.purchaseOrderUrl) || [];
  
  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "reviewing":
        return "bg-yellow-100 text-yellow-800";
      case "quoted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="rounded-2xl shadow-sm border border-gray-100 animate-pulse">
            <CardHeader className="h-24 bg-gray-200" />
            <CardContent className="h-32 bg-gray-100" />
          </Card>
        ))}
      </div>
    );
  }

  if (pendingQuotes.length === 0 && waitingForPOQuotes.length === 0 && poSubmittedQuotes.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border border-gray-100">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Available</h3>
          <p className="text-gray-500 text-center">
            You don't have any quotes yet. Submit an RFQ to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingQuotes.map((quote) => (
          <Card key={quote.id} className="rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                  {quote.rfq.projectName}
                </CardTitle>
                <Badge className={getQuoteStatusColor(quote.status || 'pending')}>
                  {quote.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Quote #{quote.quoteNumber} • RFQ {extractDisplayId(quote.rfq)}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Material:</span>
                  <span className="font-medium text-gray-900">{quote.rfq.material}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Quantity:</span>
                  <span className="font-medium text-gray-900">{quote.rfq.quantity}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Quote Amount:</span>
                  <span className="font-medium text-green-600">${quote.amount} {quote.currency}</span>
                </div>
                
                <div className="flex space-x-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewQuote(quote)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Quote
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-teal-primary hover:bg-teal-700"
                    onClick={() => handleDownloadQuote(quote.rfqId)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accepted Quotes - Waiting for Purchase Order */}
      {waitingForPOQuotes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Accepted Quotes - Waiting for Purchase Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {waitingForPOQuotes.map((quote) => (
              <Card key={quote.id} className="rounded-2xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                      {quote.rfq.projectName}
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-800">
                      Waiting for PO
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Quote #{quote.quoteNumber} • RFQ {extractDisplayId(quote.rfq)} • Quote Accepted</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Material:</span>
                      <span className="font-medium text-gray-900">{quote.rfq.material}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium text-gray-900">{quote.rfq.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Quote Amount:</span>
                      <span className="font-medium text-green-600">${quote.amount} {quote.currency}</span>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium mb-2">✅ Quote Accepted - Purchase Order Required</p>
                      <p className="text-xs text-blue-600 mb-3">
                        Thank you for accepting our quote! Please upload your purchase order to proceed with manufacturing.
                      </p>
                      
                      {/* Purchase Order Upload Section */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-blue-700">Purchase Order Number:</label>
                          <Input
                            type="text"
                            placeholder="Enter PO number (e.g., PO-2024-001)"
                            value={poNumbers[quote.id] || ''}
                            onChange={(e) => setPoNumbers(prev => ({...prev, [quote.id]: e.target.value}))}
                            className="text-xs mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-blue-700">Upload Purchase Order (PDF):</label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPoFiles(prev => ({...prev, [quote.id]: file}));
                              }
                            }}
                            className="text-xs text-blue-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 mt-1"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handlePOSubmit(quote)}
                          disabled={!poFiles[quote.id] || !poNumbers[quote.id] || uploadingPO[quote.id]}
                        >
                          {uploadingPO[quote.id] ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Uploading...
                            </div>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Submit Purchase Order
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewQuote(quote)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Quote
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-teal-primary hover:bg-teal-700"
                        onClick={() => handleDownloadQuote(quote.rfqId)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PO Submitted Quotes */}
      {poSubmittedQuotes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Purchase Order Submitted</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poSubmittedQuotes.map((quote) => (
              <Card key={quote.id} className="rounded-2xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                      {quote.rfq.projectName}
                    </CardTitle>
                    <Badge className="bg-green-100 text-green-800">
                      PO Submitted
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Quote #{quote.quoteNumber} • RFQ {extractDisplayId(quote.rfq)} • PO Submitted</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Material:</span>
                      <span className="font-medium text-gray-900">{quote.rfq.material}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium text-gray-900">{quote.rfq.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Quote Amount:</span>
                      <span className="font-medium text-green-600">${quote.amount} {quote.currency}</span>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium mb-2">✅ Purchase Order Submitted</p>
                      {quote.purchaseOrderNumber && (
                        <p className="text-xs text-green-600 mb-2">
                          PO Number: <span className="font-medium">{quote.purchaseOrderNumber}</span>
                        </p>
                      )}
                      <p className="text-xs text-green-600 mb-3">
                        Your purchase order has been received. Stoneflake will review and create your sales order soon.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-100"
                        onClick={() => handleDownloadPO(quote)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Purchase Order
                      </Button>
                    </div>
                    
                    <div className="flex space-x-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewQuote(quote)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Quote
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-teal-primary hover:bg-teal-700"
                        onClick={() => handleDownloadQuote(quote.rfqId)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quote Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Quote Details - {selectedRFQ?.projectName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRFQ && selectedQuote && (
            <div className="space-y-6">
              {/* Project Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Project Name</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.projectName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">RFQ ID</p>
                    <p className="text-sm text-gray-900 font-mono">{selectedRFQ.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Material</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.material}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Quantity</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.quantity}</p>
                  </div>
                </div>
              </div>

              {/* Quote Details */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Quote Information
                </h3>
                <div className={`grid grid-cols-1 ${selectedQuote.estimatedDeliveryDate ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                  <div>
                    <p className="text-sm font-medium text-green-700">Quote Amount</p>
                    <p className="text-lg font-bold text-green-900">${selectedQuote.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Valid Until</p>
                    <p className="text-sm text-green-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(selectedQuote.validUntil), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {selectedQuote.estimatedDeliveryDate && (
                    <div>
                      <p className="text-sm font-medium text-green-700">Due Date</p>
                      <p className="text-sm text-green-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(selectedQuote.estimatedDeliveryDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Admin Notes */}
                {selectedQuote.notes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">Special Instructions</p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedQuote.notes}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  {selectedQuote.quoteFileUrl && (
                    <Button
                      onClick={() => handleDownloadQuote(selectedRFQ.id)}
                      variant="outline"
                      className="border-green-600 text-green-700 hover:bg-green-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Quote PDF
                    </Button>
                  )}
                  
                  {selectedQuote.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleStartResponse('accept')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept Quote
                      </Button>
                      <Button
                        onClick={() => handleStartResponse('decline')}
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline Quote
                      </Button>
                    </div>
                  )}
                  
                  {selectedQuote.status !== 'pending' && (
                    <Badge className={getQuoteStatusColor(selectedQuote.status || 'pending')}>
                      Quote {selectedQuote.status}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Project Notes */}
              {selectedRFQ.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedRFQ.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Quote Response Form */}
              {showResponseForm && responseType && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    {responseType === 'accept' ? 'Accept Quote' : 'Decline Quote'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="response">
                        {responseType === 'accept' ? 'Acceptance Notes (Optional)' : 'Reason for Decline (Optional)'}
                      </Label>
                      <Textarea
                        id="response"
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder={responseType === 'accept' 
                          ? "Any special instructions or notes..." 
                          : "Please let us know why you're declining this quote..."
                        }
                        className="mt-1"
                      />
                    </div>
                    
                    {responseType === 'accept' && (
                      <div>
                        <Label htmlFor="purchaseOrder">Upload Purchase Order (Optional)</Label>
                        <Input
                          id="purchaseOrder"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPurchaseOrderFile(e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                        {purchaseOrderFile && (
                          <p className="text-sm text-green-600 mt-1">
                            Selected: {purchaseOrderFile.name}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-2">
                      <Button
                        onClick={handleResponseSubmit}
                        className={responseType === 'accept' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                      >
                        {responseType === 'accept' ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Confirm Acceptance
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Confirm Decline
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowResponseForm(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}