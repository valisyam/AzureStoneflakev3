import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Quote, X, Search, Download, FileText, Package, Upload, DollarSign, CheckCircle, Clock, CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RFQ, User, File, SalesQuote } from "@shared/schema";
import { extractDisplayId } from "@shared/utils";


export default function RFQTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedRFQ, setSelectedRFQ] = useState<(RFQ & { user: User }) | null>(null);
  const [rfqFiles, setRfqFiles] = useState<File[]>([]);
  const [existingQuote, setExistingQuote] = useState<SalesQuote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteValidDays, setQuoteValidDays] = useState("30");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<Date>();
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteFile, setQuoteFile] = useState<globalThis.File | null>(null);
  const [orderStatus, setOrderStatus] = useState<Record<string, boolean>>({});
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [orderDueDate, setOrderDueDate] = useState<Date>();
  const [selectedRFQForOrder, setSelectedRFQForOrder] = useState<(RFQ & { user: User }) | null>(null);
  const [customerPoNumber, setCustomerPoNumber] = useState("");
  const [columnWidths, setColumnWidths] = useState({
    rfqId: 160,
    customer: 180,
    project: 160,
    material: 120,
    process: 140,
    international: 100,
    quantity: 80,
    date: 120,
    status: 120,
    actions: 180
  });
  const [isResizing, setIsResizing] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Column resize functionality
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.pageX;
    const startWidth = columnWidths[columnKey as keyof typeof columnWidths];
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.pageX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const { data: rfqs, isLoading } = useQuery<(RFQ & { user: User })[]>({
    queryKey: ["/api/admin/rfqs"],
    refetchInterval: 30000, // Refresh every 30 seconds to catch status updates
  });

  const { data: quotes } = useQuery<SalesQuote[]>({
    queryKey: ["/api/admin/quotes"],
    refetchInterval: 30000, // Refresh every 30 seconds to catch status updates
  });

  // Update selectedRFQ when RFQ data changes to reflect new status
  useEffect(() => {
    if (selectedRFQ && rfqs) {
      const updatedRFQ = rfqs.find(rfq => rfq.id === selectedRFQ.id);
      if (updatedRFQ && updatedRFQ.status !== selectedRFQ.status) {
        setSelectedRFQ(updatedRFQ);
      }
    }
  }, [rfqs, selectedRFQ]);

  // Check for existing orders when RFQs are loaded
  useEffect(() => {
    if (rfqs) {
      const checkOrders = async () => {
        const orderChecks = await Promise.all(
          rfqs.map(async (rfq) => {
            try {
              const response = await apiRequest("GET", `/api/admin/rfqs/${rfq.id}/order`);
              const data = await response.json();
              return { rfqId: rfq.id, hasOrder: data.hasOrder, orderNumber: data.orderNumber };
            } catch {
              return { rfqId: rfq.id, hasOrder: false, orderNumber: '' };
            }
          })
        );
        
        const orderStatusMap = orderChecks.reduce((acc, { rfqId, hasOrder }) => {
          acc[rfqId] = hasOrder;
          return acc;
        }, {} as Record<string, boolean>);
        
        const orderNumbersMap = orderChecks.reduce((acc, { rfqId, orderNumber }) => {
          if (orderNumber) acc[rfqId] = orderNumber;
          return acc;
        }, {} as Record<string, string>);
        
        setOrderStatus(orderStatusMap);
        setOrderNumbers(orderNumbersMap);
      };
      
      checkOrders();
    }
  }, [rfqs]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/admin/rfqs/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfqs"] });
      
      // If we're updating the selected RFQ, update its status locally for immediate UI feedback
      if (selectedRFQ && selectedRFQ.id === variables.id) {
        setSelectedRFQ({ ...selectedRFQ, status: variables.status as any });
      }
      
      toast({
        title: "Status updated",
        description: "RFQ status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredRfqs = rfqs?.filter((rfq) => {
    const matchesSearch = rfq.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfq.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfq.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === "all" || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-orange-100 text-orange-800"; // New submissions
      case "quoted":
        return "bg-green-100 text-green-800";
      case "accepted":
        return "bg-emerald-100 text-emerald-800"; // Quote accepted
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "quoted":
        return "Quoted";
      case "accepted":
        return "Accepted";
      case "declined":
        return "Declined";
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || "Unknown";
    }
  };

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleCreateQuote = (rfq: RFQ & { user: User }) => {
    setSelectedRFQ(rfq);
    setShowQuoteForm(true);
    setIsViewModalOpen(true);
    
    // First update status to reviewing
    handleStatusUpdate(rfq.id, 'reviewing');
    
    // Load existing quote if available
    loadQuoteForRFQ(rfq.id);
  };

  const handleCreateOrder = (rfq: RFQ & { user: User }) => {
    setSelectedRFQForOrder(rfq);
    setOrderDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Default to 30 days from now
    setCustomerPoNumber(""); // Reset customer PO number
    setShowCreateOrderModal(true);
  };

  const handleConfirmCreateOrder = async () => {
    if (!selectedRFQForOrder || !orderDueDate) return;
    
    try {
      // Create order from accepted quote with due date and customer PO number
      await apiRequest("POST", `/api/admin/rfqs/${selectedRFQForOrder.id}/create-order`, {
        dueDate: orderDueDate.toISOString(),
        customerPurchaseOrderNumber: customerPoNumber || null
      });
      
      // Update local order status immediately
      setOrderStatus(prev => ({ ...prev, [selectedRFQForOrder.id]: true }));
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // Close modal and reset state
      setShowCreateOrderModal(false);
      setSelectedRFQForOrder(null);
      setOrderDueDate(undefined);
      setCustomerPoNumber("");
      
      toast({
        title: "Order created",
        description: "Order has been created successfully and will appear in Order Tracking",
      });
    } catch (error: any) {
      toast({
        title: "Create order failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPO = async (quote: SalesQuote) => {
    try {
      if (!quote.purchaseOrderUrl) {
        toast({
          title: "No Purchase Order",
          description: "Purchase order file not found",
          variant: "destructive",
        });
        return;
      }

      const token = localStorage.getItem('stoneflake_token');
      const response = await fetch(`/api/admin/quotes/${quote.id}/purchase-order/download`, {
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
      link.download = `PO-${quote.rfqId.slice(0, 8)}.pdf`;
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

  const loadQuoteForRFQ = async (rfqId: string) => {
    try {
      const quoteRes = await apiRequest("GET", `/api/admin/rfqs/${rfqId}/quote`);
      if (quoteRes.ok) {
        const quote = await quoteRes.json();
        setExistingQuote(quote);
        
        if (quote) {
          setQuoteAmount(quote.amount);
          setQuoteValidDays(Math.ceil((new Date(quote.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)).toString());
          setQuoteNotes(quote.customerResponse || '');
        }
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    }
  };

  const handleViewRFQ = async (rfq: RFQ & { user: User }) => {
    try {
      // First, refresh the RFQ data to get the latest status
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/rfqs"] });
      
      setSelectedRFQ(rfq);
      setIsViewModalOpen(true);
      setShowQuoteForm(false);
      setQuoteAmount("");
      setQuoteValidDays("30");
      setEstimatedDeliveryDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
      setQuoteNotes("");
      setQuoteFile(null);
      setRfqFiles([]);
      setExistingQuote(null);
      
      // Check if order exists for this RFQ
      try {
        const orderResponse = await apiRequest("GET", `/api/admin/rfqs/${rfq.id}/order`);
        const orderData = await orderResponse.json();
        setOrderStatus(prev => ({ ...prev, [rfq.id]: orderData.hasOrder }));
        if (orderData.hasOrder && orderData.orderNumber) {
          setOrderNumbers(prev => ({ ...prev, [rfq.id]: orderData.orderNumber }));
        }
      } catch (orderError) {
        console.log("No existing order found for RFQ:", rfq.id);
        setOrderStatus(prev => ({ ...prev, [rfq.id]: false }));
        setOrderNumbers(prev => ({ ...prev, [rfq.id]: '' }));
      }
      
      // Fetch RFQ files
      try {
        const res = await apiRequest("GET", `/api/rfqs/${rfq.id}`);
        if (res.ok) {
          const rfqData = await res.json();
          setRfqFiles(rfqData.files || []);
        }
      } catch (fileError) {
        console.log("Could not load RFQ files:", fileError);
        setRfqFiles([]);
      }
      
      // Check for existing quote - don't show error if quote doesn't exist
      try {
        const quoteRes = await apiRequest("GET", `/api/admin/rfqs/${rfq.id}/quote`);
        if (quoteRes.ok) {
          const quote = await quoteRes.json();
          setExistingQuote(quote);
        }
      } catch (quoteError) {
        // Quote doesn't exist yet - this is normal for new RFQs
        console.log("No existing quote found for RFQ:", rfq.id);
        setExistingQuote(null);
      }
    } catch (error) {
      console.error("Error viewing RFQ:", error);
      toast({
        title: "Error",
        description: "Failed to load RFQ details",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      // Use direct fetch with authentication header
      const token = localStorage.getItem('stoneflake_token');
      const res = await fetch(`/api/files/${fileId}/download`, {
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
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    if (!fileName) return <FileText className="h-5 w-5 text-gray-600" />;
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'step' || extension === 'stp') {
      return <Package className="h-5 w-5 text-blue-600" />;
    }
    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  // Quote submission mutation
  const submitQuoteMutation = useMutation({
    mutationFn: async ({ rfqId, amount, validUntil, estimatedDeliveryDate, notes, file }: {
      rfqId: string;
      amount: number;
      validUntil: string;
      estimatedDeliveryDate?: string;
      notes?: string;
      file?: globalThis.File;
    }) => {
      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('validUntil', validUntil);
      if (estimatedDeliveryDate) formData.append('estimatedDeliveryDate', estimatedDeliveryDate);
      if (notes) formData.append('notes', notes);
      if (file) formData.append('quoteFile', file);

      const token = localStorage.getItem('stoneflake_token');
      const res = await fetch(`/api/admin/rfqs/${rfqId}/quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit quote');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfqs"] });
      setShowQuoteForm(false);
      setIsViewModalOpen(false);
      toast({
        title: "Quote submitted",
        description: "Quote has been submitted successfully and RFQ status updated to quoted",
      });
    },
    onError: (error) => {
      toast({
        title: "Quote submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitQuote = () => {
    if (!selectedRFQ || !quoteAmount) return;

    const amount = parseFloat(quoteAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid quote amount",
        variant: "destructive",
      });
      return;
    }

    if (!estimatedDeliveryDate) {
      toast({
        title: "Missing delivery date",
        description: "Please select an estimated delivery date",
        variant: "destructive",
      });
      return;
    }

    const validDays = parseInt(quoteValidDays);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    submitQuoteMutation.mutate({
      rfqId: selectedRFQ.id,
      amount,
      validUntil: validUntil.toISOString(),
      estimatedDeliveryDate: estimatedDeliveryDate.toISOString(),
      notes: quoteNotes,
      file: quoteFile || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      setQuoteFile(file);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Incoming RFQs</CardTitle>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="relative">
              <Input
                placeholder="Search RFQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-hidden">
          <table ref={tableRef} className="resizable-table" style={{ 
            minWidth: '1200px',
            width: Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 'px'
          }}>
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.rfqId}px`, minWidth: `${columnWidths.rfqId}px`, maxWidth: `${columnWidths.rfqId}px` }}
                >
                  RFQ / Quote #
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('rfqId', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.customer}px`, minWidth: `${columnWidths.customer}px`, maxWidth: `${columnWidths.customer}px` }}
                >
                  Customer
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('customer', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.project}px`, minWidth: `${columnWidths.project}px`, maxWidth: `${columnWidths.project}px` }}
                >
                  Project Name
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('project', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.material}px`, minWidth: `${columnWidths.material}px`, maxWidth: `${columnWidths.material}px` }}
                >
                  Material
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('material', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.process}px`, minWidth: `${columnWidths.process}px`, maxWidth: `${columnWidths.process}px` }}
                >
                  Process
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('process', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.international}px`, minWidth: `${columnWidths.international}px`, maxWidth: `${columnWidths.international}px` }}
                >
                  Intl
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('international', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.quantity}px`, minWidth: `${columnWidths.quantity}px`, maxWidth: `${columnWidths.quantity}px` }}
                >
                  Qty
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('quantity', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px`, maxWidth: `${columnWidths.date}px` }}
                >
                  Date
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('date', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                  style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px`, maxWidth: `${columnWidths.status}px` }}
                >
                  Status
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleMouseDown('status', e)}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px`, maxWidth: `${columnWidths.actions}px` }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRfqs?.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-gray-50">
                  <td 
                    className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap"
                    style={{ width: `${columnWidths.rfqId}px`, minWidth: `${columnWidths.rfqId}px`, maxWidth: `${columnWidths.rfqId}px` }}
                    title={quotes?.find(q => q.rfqId === rfq.id)?.quoteNumber || rfq.id}
                  >
                    <div className="truncate font-mono text-xs">
                      {quotes?.find(q => q.rfqId === rfq.id)?.quoteNumber || extractDisplayId(rfq)}
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap"
                    style={{ width: `${columnWidths.customer}px`, minWidth: `${columnWidths.customer}px`, maxWidth: `${columnWidths.customer}px` }}
                  >
                    <div className="flex items-center min-w-0">
                      <Avatar className="h-8 w-8 mr-3 flex-shrink-0">
                        <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                          {rfq.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{rfq.user.name}</div>
                        <div className="text-sm text-gray-500 truncate">{rfq.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap"
                    style={{ width: `${columnWidths.project}px`, minWidth: `${columnWidths.project}px`, maxWidth: `${columnWidths.project}px` }}
                  >
                    <div className="flex items-center space-x-2">
                      {rfq.projectName?.startsWith('REORDER:') && (
                        <Badge className="bg-blue-100 text-blue-800 px-2 py-1 text-xs flex items-center space-x-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>REORDER</span>
                        </Badge>
                      )}
                      <div className="truncate" title={rfq.projectName}>
                        {rfq.projectName?.startsWith('REORDER:') 
                          ? rfq.projectName.replace('REORDER: ', '')
                          : rfq.projectName
                        }
                      </div>
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                    style={{ width: `${columnWidths.material}px`, minWidth: `${columnWidths.material}px`, maxWidth: `${columnWidths.material}px` }}
                  >
                    <div className="truncate">
                      {rfq.material}
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                    style={{ width: `${columnWidths.process}px`, minWidth: `${columnWidths.process}px`, maxWidth: `${columnWidths.process}px` }}
                  >
                    <div className="truncate" title={`${rfq.manufacturingProcess}${rfq.manufacturingSubprocess ? ` - ${rfq.manufacturingSubprocess}` : ''}`}>
                      {rfq.manufacturingProcess}
                      {rfq.manufacturingSubprocess && (
                        <div className="text-xs text-gray-500 truncate">
                          {rfq.manufacturingSubprocess}
                        </div>
                      )}
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap text-center"
                    style={{ width: `${columnWidths.international}px`, minWidth: `${columnWidths.international}px`, maxWidth: `${columnWidths.international}px` }}
                  >
                    {rfq.internationalManufacturingOk ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 text-xs">No</Badge>
                    )}
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap"
                    style={{ width: `${columnWidths.quantity}px`, minWidth: `${columnWidths.quantity}px`, maxWidth: `${columnWidths.quantity}px` }}
                  >
                    <div className="truncate">
                      {rfq.quantity} PCS
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap"
                    style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px`, maxWidth: `${columnWidths.date}px` }}
                  >
                    <div className="truncate">
                      {rfq.createdAt ? new Date(rfq.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap"
                    style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px`, maxWidth: `${columnWidths.status}px` }}
                  >
                    <div className="flex items-center space-x-1">
                      <Badge className={`${getStatusColor(rfq.status || 'submitted')} px-2 py-1 text-xs font-semibold rounded-full`}>
                        {getStatusDisplay(rfq.status || 'submitted')}
                      </Badge>
                      {/* Show PO status for accepted quotes */}
                      {rfq.status === 'accepted' && quotes?.find(q => q.rfqId === rfq.id && q.purchaseOrderUrl) && (
                        <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          PO Received
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm font-medium whitespace-nowrap"
                    style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px`, maxWidth: `${columnWidths.actions}px` }}
                  >
                    <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-teal-primary hover:text-teal-700"
                      onClick={() => handleViewRFQ(rfq)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Show Quote button only if no quote exists and RFQ is submitted */}
                    {(rfq.status === 'submitted' || !rfq.status) && 
                     !quotes?.find(q => q.rfqId === rfq.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-800"
                        onClick={() => handleCreateQuote(rfq)}
                        disabled={updateStatusMutation.isPending}
                        title="Create Quote"
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Show Create Order button only when quote is accepted, has PO, and no order exists */}
                    {rfq.status === 'accepted' && quotes?.find(q => q.rfqId === rfq.id && q.purchaseOrderUrl) && !orderStatus[rfq.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => handleCreateOrder(rfq)}
                        disabled={updateStatusMutation.isPending}
                        title="Create Sales Order (PO Received)"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Show waiting for PO indicator when quote is accepted but no PO yet */}
                    {rfq.status === 'accepted' && quotes?.find(q => q.rfqId === rfq.id && !q.purchaseOrderUrl) && !orderStatus[rfq.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-800 cursor-default"
                        disabled
                        title="Waiting for Customer Purchase Order"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Show PO download button when PO is available */}
                    {rfq.status === 'accepted' && quotes?.find(q => q.rfqId === rfq.id && q.purchaseOrderUrl) && (
                      <Button
                        variant="ghost"
                        size="sm"  
                        className="text-green-600 hover:text-green-800"
                        onClick={() => handleDownloadPO(quotes?.find(q => q.rfqId === rfq.id)!)}
                        title="Download Purchase Order"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Show Order Created indicator when order exists */}
                    {rfq.status === 'accepted' && orderStatus[rfq.id] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-800 cursor-default"
                        disabled
                        title="Order Created"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Show Decline button only if not already declined or accepted */}
                    {rfq.status !== 'declined' && rfq.status !== 'accepted' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleStatusUpdate(rfq.id, 'declined')}
                        disabled={updateStatusMutation.isPending}
                        title="Decline RFQ"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRfqs && filteredRfqs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No RFQs found matching your criteria</p>
          </div>
        )}

        {/* Pagination placeholder */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{Math.min(10, filteredRfqs?.length || 0)}</span> of{" "}
              <span className="font-medium">{filteredRfqs?.length || 0}</span> results
            </div>
          </div>
        </div>
      </CardContent>

      {/* RFQ Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              RFQ Details - {selectedRFQ?.projectName}
            </DialogTitle>
          </DialogHeader>

          {selectedRFQ && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-teal-primary text-white">
                        {selectedRFQ.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{selectedRFQ.user.name}</p>
                      <p className="text-sm text-gray-600">{selectedRFQ.user.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">RFQ ID</p>
                    <p className="text-sm text-gray-900 font-mono">{selectedRFQ.id}</p>
                  </div>
                  {/* Show Order Number if order exists */}
                  {orderStatus[selectedRFQ.id] && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Number</p>
                      <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-mono">
                        {orderNumbers[selectedRFQ.id] || 'Order Created'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Project Name</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.projectName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Material</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.material}</p>
                  </div>
                  {selectedRFQ.materialGrade && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Material Grade</p>
                      <p className="text-sm text-gray-900">{selectedRFQ.materialGrade}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Manufacturing Process</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.manufacturingProcess}</p>
                    {selectedRFQ.manufacturingSubprocess && (
                      <p className="text-xs text-gray-600 mt-1">
                        Subprocess: {selectedRFQ.manufacturingSubprocess}
                      </p>
                    )}
                  </div>
                  {selectedRFQ.finishing && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Finishing</p>
                      <p className="text-sm text-gray-900">{selectedRFQ.finishing}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tolerance</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.tolerance}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Quantity</p>
                    <p className="text-sm text-gray-900">{selectedRFQ.quantity} PCS</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">International Manufacturing</p>
                    <div className="flex items-center space-x-2">
                      {selectedRFQ.internationalManufacturingOk ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 text-xs">US/Canada Only</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge className={`${getStatusColor(selectedRFQ.status || 'pending')} px-2 py-1 text-xs font-semibold rounded-full`}>
                      {selectedRFQ.status || 'pending'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Submitted</p>
                    <p className="text-sm text-gray-900">
                      {selectedRFQ.createdAt ? new Date(selectedRFQ.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Quality Requirements */}
                {(selectedRFQ.qualityInspectionRequired || selectedRFQ.certificationRequired || selectedRFQ.qualityStandard) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Quality Requirements</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                      {selectedRFQ.qualityInspectionRequired && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Quality Inspection</p>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Required</Badge>
                        </div>
                      )}
                      {selectedRFQ.certificationRequired && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Certification</p>
                          <Badge className="bg-purple-100 text-purple-800 text-xs">Required</Badge>
                        </div>
                      )}
                      {selectedRFQ.qualityStandard && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Quality Standard</p>
                          <p className="text-xs text-gray-900">{selectedRFQ.qualityStandard}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedRFQ.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Additional Notes</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded mt-1">{selectedRFQ.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments ({rfqFiles.length})</h3>
                {rfqFiles.length > 0 ? (
                  <div className="space-y-4">
                    {rfqFiles.map((file) => (
                      <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(file.fileName)}
                            <div>
                              <p className="font-medium text-gray-900">{file.fileName || 'Unknown File'}</p>
                              <p className="text-sm text-gray-500">
                                {(file.fileSize ? (file.fileSize / 1024 / 1024).toFixed(2) : '0')} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFile(file.id, file.fileName || 'download')}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </Button>
                        </div>


                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No attachments found for this RFQ</p>
                  </div>
                )}
              </div>

              {/* Existing Quote Display */}
              {existingQuote && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Submitted Quote</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="mb-3 pb-3 border-b border-green-200">
                        <p className="text-sm font-medium text-gray-500">Quote Number</p>
                        <p className="text-lg font-mono font-bold text-green-700">{existingQuote.quoteNumber}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Quote Amount</p>
                          <p className="text-lg font-bold text-green-700">${existingQuote.amount} {existingQuote.currency}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Valid Until</p>
                          <p className="text-sm text-gray-900">
                            {new Date(existingQuote.validUntil).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Created</p>
                          <p className="text-sm text-gray-900">
                            {existingQuote.createdAt ? new Date(existingQuote.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      {existingQuote.quoteFileUrl && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-sm font-medium text-gray-500 mb-2">Quote Document</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = existingQuote.quoteFileUrl!;
                              link.download = 'quote.pdf';
                              link.click();
                            }}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Quote PDF</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Quote Form */}
              {!existingQuote && showQuoteForm && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Submit Quote</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quote-amount">Quote Amount (USD) *</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="quote-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={quoteAmount}
                              onChange={(e) => setQuoteAmount(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="quote-validity">Valid for (days)</Label>
                          <Select value={quoteValidDays} onValueChange={setQuoteValidDays}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="14">14 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                              <SelectItem value="60">60 days</SelectItem>
                              <SelectItem value="90">90 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Estimated Delivery Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal mt-1"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {estimatedDeliveryDate ? format(estimatedDeliveryDate, "PPP") : "Select delivery date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={estimatedDeliveryDate}
                              onSelect={setEstimatedDeliveryDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {estimatedDeliveryDate && (
                          <p className="text-sm text-gray-600 mt-1">
                            Delivery in {Math.ceil((estimatedDeliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="quote-notes">Additional Notes (Optional)</Label>
                        <Textarea
                          id="quote-notes"
                          placeholder="Add any additional details about the quote..."
                          value={quoteNotes}
                          onChange={(e) => setQuoteNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="quote-file">Quote Document (PDF, Optional)</Label>
                        <div className="mt-1">
                          <Input
                            id="quote-file"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="cursor-pointer"
                          />
                          {quoteFile && (
                            <p className="text-sm text-green-600 mt-1">
                              Selected: {quoteFile.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowQuoteForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitQuote}
                          disabled={submitQuoteMutation.isPending || !quoteAmount}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {submitQuoteMutation.isPending ? "Submitting..." : "Submit Quote"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">

                {!existingQuote && !showQuoteForm && (
                  <Button
                    onClick={() => setShowQuoteForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Quote className="h-4 w-4 mr-2" />
                    Create Quote
                  </Button>
                )}
                {selectedRFQ?.status === 'accepted' && existingQuote && !orderStatus[selectedRFQ.id] && (
                  <Button
                    onClick={() => handleCreateOrder(selectedRFQ)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={updateStatusMutation.isPending}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Create Order
                  </Button>
                )}
                {selectedRFQ?.status === 'accepted' && existingQuote && orderStatus[selectedRFQ.id] && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Order Created
                  </div>
                )}
                {selectedRFQ?.status !== 'accepted' && selectedRFQ?.status !== 'declined' && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedRFQ.id, 'declined')}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={updateStatusMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog open={showCreateOrderModal} onOpenChange={setShowCreateOrderModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Create Sales Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-sm text-gray-900">{selectedRFQForOrder?.user.name}</p>
              <p className="text-sm font-medium text-gray-500 mt-2">Project</p>
              <p className="text-sm text-gray-900">{selectedRFQForOrder?.projectName}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Customer PO Number</Label>
              <Input
                value={customerPoNumber}
                onChange={(e) => setCustomerPoNumber(e.target.value)}
                placeholder="Enter customer's purchase order number (optional)"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the customer's internal purchase order reference number
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDueDate ? format(orderDueDate, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={orderDueDate}
                    onSelect={setOrderDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {orderDueDate && (
                <p className="text-sm text-gray-600 mt-1">
                  Due in {Math.ceil((orderDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateOrderModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCreateOrder}
                disabled={!orderDueDate}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Package className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
