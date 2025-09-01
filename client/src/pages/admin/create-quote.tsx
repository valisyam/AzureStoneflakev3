import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Send, FileText, Calendar, Package, Filter, X, MapPin, Award, Settings, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CreateQuote() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSuppliers, setSelectedSuppliers] = useState<any[]>([]);
  const [showCreateQuoteDialog, setShowCreateQuoteDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [quoteData, setQuoteData] = useState({
    projectName: '',
    material: '',
    quantity: '',
    description: '',
    dueDate: '',
    specialInstructions: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    capabilities: [] as string[],
    certifications: [] as string[],
    countries: [] as string[],
    cities: [] as string[],
    finishingCapabilities: [] as string[],
    primaryIndustries: [] as string[],
    qualitySystems: [] as string[],
    minEmployees: '',
    maxEmployees: '',
    minYearEstablished: '',
    minCompletion: 0,
    emergencyCapability: false,
    internationalShipping: false,
    searchTerm: ''
  });

  // Get all suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/admin/suppliers']
  });

  // Create bulk quote mutation
  const createBulkQuoteMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/admin/quotes/create-bulk', data),
    onSuccess: (response: any) => {
      // Parse the response data 
      const data = response?.json ? response.json() : response;
      
      toast({
        title: "Quotes Created Successfully!",
        description: `RFQ sent to ${selectedSuppliers.length} suppliers. Check notifications for confirmation.`
      });
      setShowCreateQuoteDialog(false);
      setQuoteData({
        projectName: '',
        material: '',
        quantity: '',
        description: '',
        dueDate: '',
        specialInstructions: ''
      });
      setSelectedFiles([]);
      setSelectedSuppliers([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quote.",
        variant: "destructive"
      });
    }
  });

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuppliers.length === 0 || !quoteData.projectName || !quoteData.material || !quoteData.quantity || !quoteData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select at least one supplier.",
        variant: "destructive"
      });
      return;
    }

    // Upload files first if any are selected
    let uploadedFiles: string[] = [];
    if (selectedFiles.length > 0) {
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch('/api/admin/files/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`
          }
        });

        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }

        const uploadResult = await uploadResponse.json();
        uploadedFiles = uploadResult.map((file: any) => file.fileUrl);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload files. Please try again.",
          variant: "destructive"
        });
        return;
      }
    }

    createBulkQuoteMutation.mutate({
      supplierIds: selectedSuppliers.map(s => s.id),
      projectName: quoteData.projectName,
      material: quoteData.material,
      quantity: parseInt(quoteData.quantity),
      description: quoteData.description,
      dueDate: quoteData.dueDate,
      specialInstructions: quoteData.specialInstructions,
      attachedFiles: uploadedFiles
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      // Clear the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Filter suppliers based on criteria
  const filteredSuppliers = useMemo(() => {
    return (suppliers as any[]).filter((supplier: any) => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          supplier.name?.toLowerCase().includes(searchLower) ||
          supplier.email?.toLowerCase().includes(searchLower) ||
          supplier.companyName?.toLowerCase().includes(searchLower) ||
          supplier.city?.toLowerCase().includes(searchLower) ||
          supplier.country?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Capabilities filter
      if (filters.capabilities.length > 0) {
        const supplierCapabilities = supplier.capabilities ? JSON.parse(supplier.capabilities) : [];
        const hasCapability = filters.capabilities.some(cap => 
          supplierCapabilities.some((sc: string) => sc.toLowerCase().includes(cap.toLowerCase()))
        );
        if (!hasCapability) return false;
      }

      // Certifications filter
      if (filters.certifications.length > 0) {
        const supplierCertifications = supplier.certifications ? JSON.parse(supplier.certifications) : [];
        const hasCertification = filters.certifications.some(cert => 
          supplierCertifications.some((sc: string) => sc.toLowerCase().includes(cert.toLowerCase()))
        );
        if (!hasCertification) return false;
      }

      // Finishing capabilities filter
      if (filters.finishingCapabilities.length > 0) {
        const supplierFinishing = supplier.finishingCapabilities ? JSON.parse(supplier.finishingCapabilities) : [];
        const hasFinishing = filters.finishingCapabilities.some(finish => 
          supplierFinishing.some((sf: string) => sf.toLowerCase().includes(finish.toLowerCase()))
        );
        if (!hasFinishing) return false;
      }

      // Primary industries filter
      if (filters.primaryIndustries.length > 0) {
        const supplierIndustries = supplier.primaryIndustries ? JSON.parse(supplier.primaryIndustries) : [];
        const hasIndustry = filters.primaryIndustries.some(industry => 
          supplierIndustries.some((si: string) => si.toLowerCase().includes(industry.toLowerCase()))
        );
        if (!hasIndustry) return false;
      }

      // Quality systems filter
      if (filters.qualitySystems.length > 0) {
        if (!filters.qualitySystems.includes(supplier.qualitySystem)) return false;
      }

      // Employee count filter
      if (filters.minEmployees || filters.maxEmployees) {
        const employeeCount = parseInt(supplier.numberOfEmployees || '0');
        if (filters.minEmployees && employeeCount < parseInt(filters.minEmployees)) return false;
        if (filters.maxEmployees && employeeCount > parseInt(filters.maxEmployees)) return false;
      }

      // Year established filter
      if (filters.minYearEstablished) {
        const yearEst = parseInt(supplier.yearEstablished || '0');
        if (yearEst < parseInt(filters.minYearEstablished)) return false;
      }

      // Special capabilities filters
      if (filters.emergencyCapability && !supplier.emergencyCapability) return false;
      if (filters.internationalShipping && !supplier.internationalShipping) return false;

      // Geography filters
      if (filters.countries.length > 0) {
        if (!filters.countries.includes(supplier.country)) return false;
      }

      if (filters.cities.length > 0) {
        if (!filters.cities.includes(supplier.city)) return false;
      }

      // Profile completion filter
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
      const completionPercentage = Math.round((fields.filter(Boolean).length / fields.length) * 100);
      if (completionPercentage < filters.minCompletion) return false;

      return true;
    });
  }, [suppliers, filters]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const capabilities = new Set<string>();
    const certifications = new Set<string>();
    const countries = new Set<string>();
    const cities = new Set<string>();
    const finishingCapabilities = new Set<string>();
    const primaryIndustries = new Set<string>();
    const qualitySystems = new Set<string>();

    (suppliers as any[]).forEach((supplier: any) => {
      if (supplier.capabilities) {
        JSON.parse(supplier.capabilities).forEach((cap: string) => capabilities.add(cap));
      }
      if (supplier.certifications) {
        JSON.parse(supplier.certifications).forEach((cert: string) => certifications.add(cert));
      }
      if (supplier.finishingCapabilities) {
        JSON.parse(supplier.finishingCapabilities).forEach((finish: string) => finishingCapabilities.add(finish));
      }
      if (supplier.primaryIndustries) {
        JSON.parse(supplier.primaryIndustries).forEach((industry: string) => primaryIndustries.add(industry));
      }
      if (supplier.qualitySystem) qualitySystems.add(supplier.qualitySystem);
      if (supplier.country) countries.add(supplier.country);
      if (supplier.city) cities.add(supplier.city);
    });

    return {
      capabilities: Array.from(capabilities).sort(),
      certifications: Array.from(certifications).sort(),
      finishingCapabilities: Array.from(finishingCapabilities).sort(),
      primaryIndustries: Array.from(primaryIndustries).sort(),
      qualitySystems: Array.from(qualitySystems).sort(),
      countries: Array.from(countries).sort(),
      cities: Array.from(cities).sort()
    };
  }, [suppliers]);

  const handleSupplierToggle = (supplier: any) => {
    setSelectedSuppliers(prev => {
      const isSelected = prev.some(s => s.id === supplier.id);
      if (isSelected) {
        return prev.filter(s => s.id !== supplier.id);
      } else {
        return [...prev, supplier];
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      capabilities: [],
      certifications: [],
      countries: [],
      cities: [],
      finishingCapabilities: [],
      primaryIndustries: [],
      qualitySystems: [],
      minEmployees: '',
      maxEmployees: '',
      minYearEstablished: '',
      minCompletion: 0,
      emergencyCapability: false,
      internationalShipping: false,
      searchTerm: ''
    });
  };

  const getSupplierCompletionBadge = (supplier: any) => {
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
    
    const percentage = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    
    if (percentage >= 80) {
      return <Badge className="bg-green-100 text-green-800">Complete ({percentage}%)</Badge>;
    } else if (percentage >= 50) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial ({percentage}%)</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Incomplete ({percentage}%)</Badge>;
    }
  };

  if (suppliersLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      
      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create Quote to Suppliers</h2>
          <p className="text-gray-600 mt-2">Select suppliers based on capabilities, geography, and certifications to send quote requests</p>
        </div>

        {/* Filter Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Supplier Filters
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowFilterDialog(true)}>
                  Advanced Filters
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Search Suppliers</Label>
                <Input
                  placeholder="Search by name, email, company..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                />
              </div>
              <div>
                <Label>Minimum Profile Completion</Label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, minCompletion: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any completion level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any completion level</SelectItem>
                    <SelectItem value="50">50% or higher</SelectItem>
                    <SelectItem value="80">80% or higher</SelectItem>
                    <SelectItem value="100">100% complete only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Selected Suppliers</Label>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{selectedSuppliers.length} selected</span>
                  {selectedSuppliers.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSuppliers([])}>
                      Clear Selection
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filters.capabilities.length > 0 || filters.certifications.length > 0 || filters.countries.length > 0) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <Label className="text-sm font-medium text-blue-800">Active Filters:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.capabilities.map(cap => (
                    <Badge key={cap} variant="secondary" className="bg-blue-100 text-blue-800">
                      {cap}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => 
                        setFilters(prev => ({ ...prev, capabilities: prev.capabilities.filter(c => c !== cap) }))
                      } />
                    </Badge>
                  ))}
                  {filters.certifications.map(cert => (
                    <Badge key={cert} variant="secondary" className="bg-green-100 text-green-800">
                      {cert}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => 
                        setFilters(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== cert) }))
                      } />
                    </Badge>
                  ))}
                  {filters.countries.map(country => (
                    <Badge key={country} variant="secondary" className="bg-purple-100 text-purple-800">
                      {country}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => 
                        setFilters(prev => ({ ...prev, countries: prev.countries.filter(c => c !== country) }))
                      } />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Selection Grid */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Suppliers ({filteredSuppliers.length})</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSuppliers(filteredSuppliers)}
                  disabled={filteredSuppliers.length === 0}
                >
                  Select All ({filteredSuppliers.length})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSuppliers([])}
                  disabled={selectedSuppliers.length === 0}
                >
                  Clear Selection
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredSuppliers.map((supplier: any) => {
                const isSelected = selectedSuppliers.some(s => s.id === supplier.id);
                return (
                  <div 
                    key={supplier.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleSupplierToggle(supplier)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} />
                        <div>
                          <h4 className="font-medium text-sm">{supplier.name || 'No Name'}</h4>
                          <p className="text-xs text-gray-500">{supplier.email}</p>
                        </div>
                      </div>
                      {getSupplierCompletionBadge(supplier)}
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{supplier.city || 'Unknown'}, {supplier.country || 'Unknown'}</span>
                      </div>
                      
                      {supplier.capabilities && (
                        <div className="flex items-start gap-1">
                          <Settings className="h-3 w-3 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {JSON.parse(supplier.capabilities).slice(0, 2).map((cap: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                                {cap}
                              </Badge>
                            ))}
                            {JSON.parse(supplier.capabilities).length > 2 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{JSON.parse(supplier.capabilities).length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {supplier.certifications && (
                        <div className="flex items-start gap-1">
                          <Award className="h-3 w-3 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {JSON.parse(supplier.certifications).slice(0, 2).map((cert: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs px-1 py-0 bg-green-50">
                                {cert}
                              </Badge>
                            ))}
                            {JSON.parse(supplier.certifications).length > 2 && (
                              <Badge variant="outline" className="text-xs px-1 py-0 bg-green-50">
                                +{JSON.parse(supplier.certifications).length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Company Assessment Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {supplier.numberOfEmployees && (
                          <span>👥 {supplier.numberOfEmployees}</span>
                        )}
                        {supplier.yearEstablished && (
                          <span>📅 Est. {supplier.yearEstablished}</span>
                        )}
                        {supplier.qualitySystem && (
                          <span>🏆 {supplier.qualitySystem}</span>
                        )}
                      </div>

                      {/* Special Capabilities */}
                      {(supplier.emergencyCapability || supplier.internationalShipping) && (
                        <div className="flex items-center gap-2 text-xs">
                          {supplier.emergencyCapability && (
                            <span className="text-red-600">⚡ Emergency</span>
                          )}
                          {supplier.internationalShipping && (
                            <span className="text-blue-600">🌍 International</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {filteredSuppliers.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No suppliers match your current filters</p>
                  <Button variant="outline" onClick={clearFilters} className="mt-2">
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <Dialog open={showCreateQuoteDialog} onOpenChange={setShowCreateQuoteDialog}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={selectedSuppliers.length === 0}
              >
                <Send className="h-4 w-4" />
                Send Quote to {selectedSuppliers.length} Supplier{selectedSuppliers.length !== 1 ? 's' : ''}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Quote Request to {selectedSuppliers.length} Supplier{selectedSuppliers.length !== 1 ? 's' : ''}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateQuote} className="space-y-4">
                <div>
                  <Label>Selected Suppliers ({selectedSuppliers.length})</Label>
                  <div className="p-3 border rounded-lg bg-blue-50 max-h-32 overflow-y-auto">
                    {selectedSuppliers.length > 0 ? (
                      <div className="space-y-1">
                        {selectedSuppliers.map((supplier: any) => (
                          <div key={supplier.id} className="flex items-center justify-between text-sm">
                            <span>{supplier.name || supplier.email}</span>
                            <Badge variant="outline" className="text-xs">
                              {supplier.city}, {supplier.country}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No suppliers selected</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={quoteData.projectName}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, projectName: e.target.value }))}
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="material">Material *</Label>
                    <Input
                      id="material"
                      value={quoteData.material}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, material: e.target.value }))}
                      placeholder="e.g., Aluminum 6061, Steel 304"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      value={quoteData.quantity}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="e.g., 100 pieces"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={quoteData.dueDate}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Project Description *</Label>
                  <Textarea
                    id="description"
                    value={quoteData.description}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of the manufacturing requirements..."
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="specialInstructions">Special Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    value={quoteData.specialInstructions}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    placeholder="Any special requirements or instructions..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="files">Attachments</Label>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept=".pdf,.dwg,.step,.stp,.igs,.iges"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select multiple files - each file will be added to your attachment list. Supported formats: PDF, DWG, STEP, IGES (Max 10MB each)
                  </p>
                  {selectedFiles.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Selected files ({selectedFiles.length}):</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateQuoteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createBulkQuoteMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createBulkQuoteMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send to {selectedSuppliers.length} Supplier{selectedSuppliers.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Advanced Filter Dialog */}
          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Advanced Supplier Filters</DialogTitle>
                <p className="text-sm text-gray-600">Filter suppliers by their capabilities, assessment criteria, and special features</p>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Manufacturing Capabilities */}
                  <div>
                    <Label className="text-base font-medium">Manufacturing Capabilities</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {filterOptions.capabilities.map((capability) => (
                        <div key={capability} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cap-${capability}`}
                            checked={filters.capabilities.includes(capability)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  capabilities: [...prev.capabilities, capability]
                                }));
                              } else {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  capabilities: prev.capabilities.filter(c => c !== capability)
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`cap-${capability}`} className="text-sm">{capability}</label>
                        </div>
                      ))}
                      {filterOptions.capabilities.length === 0 && (
                        <p className="text-gray-500 text-sm">No capabilities available</p>
                      )}
                    </div>
                  </div>

                  {/* Finishing Capabilities */}
                  <div>
                    <Label className="text-base font-medium">Finishing Capabilities</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {filterOptions.finishingCapabilities.map((finish) => (
                        <div key={finish} className="flex items-center space-x-2">
                          <Checkbox
                            id={`finish-${finish}`}
                            checked={filters.finishingCapabilities.includes(finish)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  finishingCapabilities: [...prev.finishingCapabilities, finish]
                                }));
                              } else {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  finishingCapabilities: prev.finishingCapabilities.filter(f => f !== finish)
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`finish-${finish}`} className="text-sm">{finish}</label>
                        </div>
                      ))}
                      {filterOptions.finishingCapabilities.length === 0 && (
                        <p className="text-gray-500 text-sm">No finishing capabilities available</p>
                      )}
                    </div>
                  </div>

                  {/* Primary Industries */}
                  <div>
                    <Label className="text-base font-medium">Primary Industries</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {filterOptions.primaryIndustries.map((industry) => (
                        <div key={industry} className="flex items-center space-x-2">
                          <Checkbox
                            id={`industry-${industry}`}
                            checked={filters.primaryIndustries.includes(industry)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  primaryIndustries: [...prev.primaryIndustries, industry]
                                }));
                              } else {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  primaryIndustries: prev.primaryIndustries.filter(i => i !== industry)
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`industry-${industry}`} className="text-sm">{industry}</label>
                        </div>
                      ))}
                      {filterOptions.primaryIndustries.length === 0 && (
                        <p className="text-gray-500 text-sm">No industries available</p>
                      )}
                    </div>
                  </div>

                  {/* Quality Systems */}
                  <div>
                    <Label className="text-base font-medium">Quality Systems</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {filterOptions.qualitySystems.map((system) => (
                        <div key={system} className="flex items-center space-x-2">
                          <Checkbox
                            id={`quality-${system}`}
                            checked={filters.qualitySystems.includes(system)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  qualitySystems: [...prev.qualitySystems, system]
                                }));
                              } else {
                                setFilters(prev => ({ 
                                  ...prev, 
                                  qualitySystems: prev.qualitySystems.filter(q => q !== system)
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`quality-${system}`} className="text-sm">{system}</label>
                        </div>
                      ))}
                      {filterOptions.qualitySystems.length === 0 && (
                        <p className="text-gray-500 text-sm">No quality systems available</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Company Assessment Filters */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Company Assessment Criteria</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Min Employees</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={filters.minEmployees}
                        onChange={(e) => setFilters(prev => ({ ...prev, minEmployees: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Max Employees</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={filters.maxEmployees}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxEmployees: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Min Year Established</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 2000"
                        value={filters.minYearEstablished}
                        onChange={(e) => setFilters(prev => ({ ...prev, minYearEstablished: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Special Capabilities */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Special Capabilities</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="emergency-capability"
                        checked={filters.emergencyCapability}
                        onCheckedChange={(checked) => setFilters(prev => ({ ...prev, emergencyCapability: !!checked }))}
                      />
                      <label htmlFor="emergency-capability" className="text-sm font-medium">Emergency Order Capability</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="international-shipping"
                        checked={filters.internationalShipping}
                        onCheckedChange={(checked) => setFilters(prev => ({ ...prev, internationalShipping: !!checked }))}
                      />
                      <label htmlFor="international-shipping" className="text-sm font-medium">International Shipping</label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Geography Filters */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Geography</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Countries</Label>
                      <Select onValueChange={(value) => {
                        if (!filters.countries.includes(value)) {
                          setFilters(prev => ({ ...prev, countries: [...prev.countries, value] }));
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select countries" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions.countries.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filters.countries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {filters.countries.map((country) => (
                            <Badge key={country} variant="secondary" className="text-xs">
                              {country}
                              <X 
                                className="h-3 w-3 ml-1 cursor-pointer" 
                                onClick={() => setFilters(prev => ({ 
                                  ...prev, 
                                  countries: prev.countries.filter(c => c !== country) 
                                }))}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm">Cities</Label>
                      <Select onValueChange={(value) => {
                        if (!filters.cities.includes(value)) {
                          setFilters(prev => ({ ...prev, cities: [...prev.cities, value] }));
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cities" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions.cities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filters.cities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {filters.cities.map((city) => (
                            <Badge key={city} variant="secondary" className="text-xs">
                              {city}
                              <X 
                                className="h-3 w-3 ml-1 cursor-pointer" 
                                onClick={() => setFilters(prev => ({ 
                                  ...prev, 
                                  cities: prev.cities.filter(c => c !== city) 
                                }))}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowFilterDialog(false)} className="bg-blue-600 hover:bg-blue-700">
                      Apply Filters ({filteredSuppliers.length} suppliers)
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </AdminLayout>
  );
}