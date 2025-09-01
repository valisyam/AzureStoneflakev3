import { useState, useMemo, useEffect } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useQuery } from "@tanstack/react-query";
import { RFQ, File } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Plus, 
  Download, 
  Package, 
  Eye, 
  Box, 
  Filter,
  Search,
  ArrowUpDown,
  Calendar,
  MessageSquare,
  CheckCircle,
  Settings,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// RFQ status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case "submitted":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "reviewing":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "quoted":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "accepted":
      return "bg-green-100 text-green-800 border-green-200";
    case "declined":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "reviewing":
      return "Under Review";
    case "quoted":
      return "Quoted";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    default:
      return status || "Unknown";
  }
};

interface RFQRowProps {
  rfq: RFQ;
  isExpanded: boolean;
  onToggle: () => void;
}

function RFQRow({ rfq, isExpanded, onToggle }: RFQRowProps) {
  const [rfqFiles, setRfqFiles] = useState<File[]>([]);

  // Fetch files when expanded
  useEffect(() => {
    if (isExpanded) {
      const fetchFiles = async () => {
        try {
          const res = await apiRequest("GET", `/api/rfqs/${rfq.id}`);
          const rfqData = await res.json();
          setRfqFiles(rfqData.files || []);
        } catch (error) {
          console.error('Error loading RFQ files:', error);
        }
      };
      fetchFiles();
    }
  }, [isExpanded, rfq.id]);

  const isStepFile = (fileName: string) => {
    if (!fileName) return false;
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension === 'step' || extension === 'stp';
  };

  const getFileIcon = (fileName: string) => {
    if (!fileName) return <FileText className="h-5 w-5 text-gray-600" />;
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'step' || extension === 'stp') {
      return <Box className="h-5 w-5 text-blue-600" />;
    }
    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await apiRequest("GET", `/api/files/${fileId}/download`);
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
      console.error('Error downloading file:', error);
    }
  };

  const handleViewFile = (fileId: string, fileName: string) => {
    if (isStepFile(fileName)) {
      window.open(`/test-viewer?fileId=${fileId}`, '_blank');
    } else {
      window.open(`/api/files/${fileId}`, '_blank');
    }
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </TableCell>
        <TableCell className="font-medium">{rfq.projectName}</TableCell>
        <TableCell>{rfq.material}</TableCell>
        <TableCell>{rfq.quantity}</TableCell>
        <TableCell>
          {rfq.submittedAt ? format(new Date(rfq.submittedAt), "MMM dd, yyyy") : "N/A"}
        </TableCell>
        <TableCell>
          <Badge className={cn("border", getStatusColor(rfq.status || ""))}>
            {getStatusDisplay(rfq.status || "")}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // Handle view details
            }}
            className="hover:bg-blue-50"
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-gray-50 p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Material Grade:</span> {rfq.materialGrade || "Not specified"}</div>
                    <div><span className="text-gray-600">Finishing:</span> {rfq.finishing || "Not specified"}</div>
                    <div><span className="text-gray-600">Tolerance:</span> {rfq.tolerance}</div>
                    <div><span className="text-gray-600">Timeline:</span> {rfq.timeline}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Additional Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Budget Range:</span> {rfq.budgetRange || "Not specified"}</div>
                    {rfq.specialInstructions && (
                      <div>
                        <span className="text-gray-600">Special Instructions:</span>
                        <p className="mt-1 text-gray-800">{rfq.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {rfqFiles.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Attached Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rfqFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          {getFileIcon(file.filename)}
                          <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.mimetype} • {Math.round((file.size || 0) / 1024)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          {isStepFile(file.filename) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewFile(file.id, file.filename)}
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              title="View 3D Model"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadFile(file.id, file.filename)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            title="Download File"
                          >
                            <Download className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function RFQs() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: allRFQs, isLoading } = useQuery<RFQ[]>({
    queryKey: ["/api/rfqs"],
  });

  // Filter and sort RFQs
  const filteredRFQs = useMemo(() => {
    if (!allRFQs) return [];

    let filtered = allRFQs.filter(rfq => {
      // Tab filter
      if (activeTab === "active") {
        return ['submitted', 'reviewing', 'quoted'].includes(rfq.status || '');
      } else {
        return ['accepted', 'declined'].includes(rfq.status || '');
      }
    });
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(rfq => rfq.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(rfq => 
        rfq.projectName.toLowerCase().includes(search) ||
        rfq.material.toLowerCase().includes(search) ||
        rfq.materialGrade?.toLowerCase().includes(search) ||
        rfq.specialInstructions?.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
        case "date-desc":
          return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        case "project":
          return a.projectName.localeCompare(b.projectName);
        case "quantity":
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });
  }, [allRFQs, activeTab, statusFilter, searchTerm, sortBy]);

  const handleRowToggle = (rfqId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rfqId)) {
      newExpanded.delete(rfqId);
    } else {
      newExpanded.add(rfqId);
    }
    setExpandedRows(newExpanded);
  };

  const activeRFQsCount = allRFQs?.filter(rfq => ['submitted', 'reviewing', 'quoted'].includes(rfq.status || '')).length || 0;
  const archivedRFQsCount = allRFQs?.filter(rfq => ['accepted', 'declined'].includes(rfq.status || '')).length || 0;

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <Link href="/" className="text-teal-primary hover:text-teal-700 text-sm font-medium">
            ← Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">My RFQs</h2>
          <p className="text-gray-600 mt-2">Manage your Request for Quotes and track their progress through the system.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active RFQs</p>
                  <p className="text-2xl font-bold text-gray-900">{activeRFQsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{archivedRFQsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Plus className="h-8 w-8 text-teal-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total RFQs</p>
                  <p className="text-2xl font-bold text-gray-900">{(allRFQs?.length || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Request for Quotes</CardTitle>
              <Link href="/rfq">
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New RFQ
                </Button>
              </Link>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "active" | "archived")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Active RFQs ({activeRFQsCount})
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  RFQ History ({archivedRFQsCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            {/* Filters and Controls */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search RFQs, projects, materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="reviewing">Under Review</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    {activeTab === "archived" && (
                      <>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="project">Project Name</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* RFQs Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRFQs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm || statusFilter !== "all" 
                          ? "No RFQs match your filters" 
                          : `No ${activeTab} RFQs found`
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRFQs.map((rfq) => (
                      <RFQRow
                        key={rfq.id}
                        rfq={rfq}
                        isExpanded={expandedRows.has(rfq.id)}
                        onToggle={() => handleRowToggle(rfq.id)}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </CustomerLayout>
  );
}