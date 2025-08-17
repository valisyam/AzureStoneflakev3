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

export default function CustomerRFQTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  // Fetch customer-submitted RFQs only (not admin-created RFQs sent to suppliers)
  const { data: rfqs, isLoading } = useQuery<(RFQ & { user: User })[]>({
    queryKey: ["/api/admin/customer-rfqs"],
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

        const newOrderStatus: Record<string, boolean> = {};
        const newOrderNumbers: Record<string, string> = {};
        
        orderChecks.forEach(({ rfqId, hasOrder, orderNumber }) => {
          newOrderStatus[rfqId] = hasOrder;
          newOrderNumbers[rfqId] = orderNumber;
        });
        
        setOrderStatus(newOrderStatus);
        setOrderNumbers(newOrderNumbers);
      };

      checkOrders();
    }
  }, [rfqs]);

  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("amount", data.amount);
      formData.append("validUntil", data.validUntil);
      if (data.estimatedDeliveryDate) {
        formData.append("estimatedDeliveryDate", data.estimatedDeliveryDate);
      }
      if (data.notes) {
        formData.append("notes", data.notes);
      }
      if (data.file) {
        formData.append("quoteFile", data.file);
      }

      return apiRequest("POST", `/api/admin/rfqs/${data.rfqId}/quote`, formData);
    },
    onSuccess: async () => {
      toast({ title: "Success", description: "Quote created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customer-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      setShowQuoteForm(false);
      resetQuoteForm();
      
      // Refresh the existing quote data for this RFQ
      if (selectedRFQ) {
        try {
          const response = await apiRequest("GET", `/api/admin/rfqs/${selectedRFQ.id}/quote`);
          const quote = await response.json();
          setExistingQuote(quote);
        } catch (error) {
          console.error("Failed to fetch updated quote:", error);
        }
      }
    },
    onError: (error: any) => {
      console.error('Quote creation error:', error);
      let errorMessage = "Failed to create quote";
      
      // Handle different types of errors
      if (error.message) {
        if (error.message.includes("JSON")) {
          errorMessage = "Server error occurred. Please try again or contact support.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/admin/rfqs/${data.rfqId}/create-order`, {
        dueDate: data.dueDate,
        customerPurchaseOrderNumber: data.customerPoNumber
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sales order created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customer-rfqs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Customer orders
      setShowCreateOrderModal(false);
      setOrderDueDate(undefined);
      setCustomerPoNumber("");
      setSelectedRFQForOrder(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create order",
        variant: "destructive"
      });
    },
  });

  const resetQuoteForm = () => {
    setQuoteAmount("");
    setQuoteValidDays("30");
    setEstimatedDeliveryDate(undefined);
    setQuoteNotes("");
    setQuoteFile(null);
  };

  const handleViewRFQ = async (rfq: RFQ & { user: User }) => {
    setSelectedRFQ(rfq);
    
    // Fetch RFQ files
    try {
      const response = await apiRequest("GET", `/api/admin/rfqs/${rfq.id}/files`);
      const files = await response.json();
      setRfqFiles(files);
    } catch (error) {
      console.error("Failed to fetch RFQ files:", error);
      setRfqFiles([]);
    }

    // Check for existing quote
    try {
      const response = await apiRequest("GET", `/api/admin/rfqs/${rfq.id}/quote`);
      const quote = await response.json();
      setExistingQuote(quote);
    } catch (error) {
      setExistingQuote(null);
    }

    setIsViewModalOpen(true);
  };

  const handleCreateQuote = () => {
    if (!selectedRFQ) return;

    // Calculate validUntil date from validDays
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + parseInt(quoteValidDays));

    createQuoteMutation.mutate({
      rfqId: selectedRFQ.id,
      amount: quoteAmount,
      validUntil: validUntil.toISOString(),
      estimatedDeliveryDate: estimatedDeliveryDate ? estimatedDeliveryDate.toISOString() : null,
      notes: quoteNotes,
      file: quoteFile,
    });
  };

  const handleCreateOrder = () => {
    if (!selectedRFQForOrder) return;

    const dueDateISO = orderDueDate ? orderDueDate.toISOString().split('T')[0] : '';

    createOrderMutation.mutate({
      rfqId: selectedRFQForOrder.id,
      dueDate: dueDateISO,
      customerPoNumber: customerPoNumber,
    });
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { variant: "secondary" as const, text: "Submitted" },
      quoted: { variant: "outline" as const, text: "Quoted" },
      accepted: { variant: "default" as const, text: "Accepted" },
      declined: { variant: "destructive" as const, text: "Declined" },
      sent_to_suppliers: { variant: "secondary" as const, text: "Sent to Suppliers" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary" as const, text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const filteredRFQs = rfqs?.filter(rfq => {
    const matchesSearch = !searchTerm || 
      rfq.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rfq.user.companyNameInput && rfq.user.companyNameInput.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || statusFilter === "all" || rfq.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search RFQs by project, customer, material, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* RFQ Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.rfqId}px` }}
                  >
                    RFQ ID
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('rfqId', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.customer}px` }}
                  >
                    Customer
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('customer', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.project}px` }}
                  >
                    Project
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('project', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.material}px` }}
                  >
                    Material
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('material', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.process}px` }}
                  >
                    Process
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('process', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.international}px` }}
                  >
                    International
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('international', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.quantity}px` }}
                  >
                    Qty
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('quantity', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.date}px` }}
                  >
                    Date
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('date', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700 relative"
                    style={{ width: `${columnWidths.status}px` }}
                  >
                    Status
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleMouseDown('status', e)}
                    />
                  </th>
                  <th 
                    className="text-left py-3 px-4 font-medium text-gray-700"
                    style={{ width: `${columnWidths.actions}px` }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRFQs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {extractDisplayId(rfq.id)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {rfq.user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">{rfq.user.name}</div>
                          <div className="text-sm text-gray-500">{rfq.user.companyNameInput || 'No company'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{rfq.projectName}</div>
                        {rfq.projectName.startsWith('REORDER:') && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reorder
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{rfq.material}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{rfq.manufacturingProcess || 'Not specified'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={rfq.internationalManufacturingOk ? "default" : "secondary"}>
                        {rfq.internationalManufacturingOk ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{rfq.quantity}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-500">
                        {format(new Date(rfq.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(rfq.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewRFQ(rfq)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {rfq.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRFQ(rfq);
                              setShowQuoteForm(true);
                              setIsViewModalOpen(true);
                              resetQuoteForm();
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Quote className="h-4 w-4" />
                          </Button>
                        )}

                        {rfq.status === 'accepted' && !orderStatus[rfq.id] && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRFQForOrder(rfq);
                              setShowCreateOrderModal(true);
                              setCustomerPoNumber("");
                              setOrderDueDate(undefined);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        )}

                        {orderStatus[rfq.id] && (
                          <Badge variant="outline" className="text-xs">
                            Order: {orderNumbers[rfq.id]}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRFQs.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customer RFQs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter ? 'Try adjusting your search or filters.' : 'Customer RFQs will appear here when submitted.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RFQ Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>RFQ Details - {selectedRFQ?.projectName}</DialogTitle>
          </DialogHeader>
          
          {selectedRFQ && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <div className="flex items-center mt-1">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {selectedRFQ.user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedRFQ.user.name}</div>
                      <div className="text-sm text-gray-500">{selectedRFQ.user.email}</div>
                      {selectedRFQ.user.companyNameInput && (
                        <div className="text-sm text-gray-500">{selectedRFQ.user.companyNameInput}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">RFQ ID</Label>
                  <div className="font-medium mt-1">{extractDisplayId(selectedRFQ.id)}</div>
                </div>
              </div>

              <Separator />

              {/* Project Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Project Name</Label>
                  <div className="font-medium mt-1">{selectedRFQ.projectName}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Material</Label>
                  <div className="font-medium mt-1">{selectedRFQ.material}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Material Grade</Label>
                  <div className="font-medium mt-1">{selectedRFQ.materialGrade || 'Not specified'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Finishing</Label>
                  <div className="font-medium mt-1">{selectedRFQ.finishing || 'Not specified'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Tolerance</Label>
                  <div className="font-medium mt-1">{selectedRFQ.tolerance}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Quantity</Label>
                  <div className="font-medium mt-1">{selectedRFQ.quantity}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Manufacturing Process</Label>
                  <div className="font-medium mt-1">{selectedRFQ.manufacturingProcess || 'Not specified'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">International Manufacturing OK</Label>
                  <div className="font-medium mt-1">
                    <Badge variant={selectedRFQ.internationalManufacturingOk ? "default" : "secondary"}>
                      {selectedRFQ.internationalManufacturingOk ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRFQ.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Submitted</Label>
                  <div className="font-medium mt-1">{format(new Date(selectedRFQ.createdAt), 'PPpp')}</div>
                </div>
              </div>

              {selectedRFQ.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedRFQ.notes}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Files Section */}
              {rfqFiles.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-2 block">Attached Files</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {rfqFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium">{file.fileName}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(file.fileSize / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadFile(file.id, file.fileName)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Quote Display */}
              {existingQuote && !showQuoteForm && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-2 block">Existing Quote</Label>
                  <div className="p-4 bg-blue-50 rounded-md">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="ml-2 font-semibold text-blue-600">${existingQuote.amount}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Valid for:</span>
                        <span className="ml-2 font-medium">{existingQuote.validDays} days</span>
                      </div>
                      {existingQuote.estimatedDeliveryDate && (
                        <div>
                          <span className="text-sm text-gray-600">Est. Delivery:</span>
                          <span className="ml-2 font-medium">
                            {format(new Date(existingQuote.estimatedDeliveryDate), 'PPP')}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(existingQuote.createdAt), 'PPP')}
                        </span>
                      </div>
                    </div>
                    {existingQuote.notes && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Notes:</span>
                        <p className="text-sm mt-1">{existingQuote.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quote Creation Form */}
              {showQuoteForm && selectedRFQ.status === 'submitted' && (
                <div>
                  <Label className="text-lg font-medium text-gray-900 mb-4 block">Create Quote</Label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quote-amount">Quote Amount ($)*</Label>
                        <Input
                          id="quote-amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={quoteAmount}
                          onChange={(e) => setQuoteAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quote-valid-days">Valid Days*</Label>
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
                      <Label>Estimated Delivery Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {estimatedDeliveryDate ? format(estimatedDeliveryDate, "PPP") : "Pick a date"}
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
                    </div>

                    <div>
                      <Label htmlFor="quote-notes">Quote Notes</Label>
                      <Textarea
                        id="quote-notes"
                        placeholder="Additional notes for this quote..."
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="quote-file">Quote File (Optional)</Label>
                      <Input
                        id="quote-file"
                        type="file"
                        accept=".pdf,.doc,.docx,.xlsx,.xls"
                        onChange={(e) => setQuoteFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: PDF, DOC, DOCX, XLS, XLSX
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleCreateQuote}
                        disabled={!quoteAmount || createQuoteMutation.isPending}
                        className="flex-1"
                      >
                        {createQuoteMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Creating Quote...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Create Quote
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowQuoteForm(false)}
                        disabled={createQuoteMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              {!showQuoteForm && selectedRFQ.status === 'submitted' && !existingQuote && (
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => setShowQuoteForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Create Quote
                  </Button>
                </div>
              )}

              {!showQuoteForm && existingQuote && (
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog open={showCreateOrderModal} onOpenChange={setShowCreateOrderModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sales Order</DialogTitle>
          </DialogHeader>
          
          {selectedRFQForOrder && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Project</Label>
                <div className="font-medium mt-1">{selectedRFQForOrder.projectName}</div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Customer</Label>
                <div className="font-medium mt-1">{selectedRFQForOrder.user.name}</div>
              </div>

              <div>
                <Label htmlFor="customer-po-number">Customer PO Number</Label>
                <Input
                  id="customer-po-number"
                  placeholder="Enter customer PO number"
                  value={customerPoNumber}
                  onChange={(e) => setCustomerPoNumber(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Customer's purchase order number for reference
                </p>
              </div>

              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
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
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateOrder}
                  disabled={createOrderMutation.isPending}
                  className="flex-1"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      Create Order
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateOrderModal(false)}
                  disabled={createOrderMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}