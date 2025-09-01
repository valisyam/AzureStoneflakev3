import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Search, Hash, CheckCircle, AlertCircle, Users, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Company {
  id: string;
  customerNumber: string;
  name: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  industry?: string;
  notes?: string;
  createdAt: string;
}

const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  contactEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

const customerNumberSchema = z.object({
  customerNumber: z.string().regex(/^CU\d{4}$/, 'Customer number must be in format CU0001'),
});

type CustomerNumberFormData = z.infer<typeof customerNumberSchema>;

// Merge Companies Dialog Component
function MergeCompaniesDialog({ companies }: { companies: Company[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [primaryCompanyId, setPrimaryCompanyId] = useState<string>('');
  const [customerNumber, setCustomerNumber] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  const mergeSchema = z.object({
    primaryCompanyId: z.string().min(1, 'Please select a primary company'),
    customerNumber: z.string().regex(/^CU\d{4}$/, 'Customer number must be in format CU0001'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  });

  const mergeForm = useForm<z.infer<typeof mergeSchema>>({
    resolver: zodResolver(mergeSchema),
    defaultValues: {
      primaryCompanyId: '',
      customerNumber: '',
      companyName: '',
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof mergeSchema>) => {
      const companyIdsToMerge = selectedCompanies.filter(id => id !== data.primaryCompanyId);
      return apiRequest("POST", "/api/admin/companies/merge", {
        primaryCompanyId: data.primaryCompanyId,
        companyIdsToMerge,
        customerNumber: data.customerNumber,
        companyName: data.companyName,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Companies merged successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      setIsOpen(false);
      setSelectedCompanies([]);
      mergeForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to merge companies", 
        variant: "destructive" 
      });
    },
  });

  const availableCompanies = companies.filter(c => 
    selectedCompanies.length === 0 || selectedCompanies.includes(c.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Users className="h-4 w-4 mr-1" />
          Merge Companies
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Companies</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select companies to merge into a single company. All users will be moved to the primary company.
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Companies to Merge:</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
              {companies.map(company => (
                <label key={company.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(company.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCompanies([...selectedCompanies, company.id]);
                      } else {
                        setSelectedCompanies(selectedCompanies.filter(id => id !== company.id));
                        if (primaryCompanyId === company.id) {
                          setPrimaryCompanyId('');
                          mergeForm.setValue('primaryCompanyId', '');
                        }
                      }
                    }}
                  />
                  <span>{company.name} ({company.customerNumber})</span>
                </label>
              ))}
            </div>
          </div>

          {selectedCompanies.length >= 2 && (
            <Form {...mergeForm}>
              <form onSubmit={mergeForm.handleSubmit((data) => mergeMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={mergeForm.control}
                  name="primaryCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Company (data will be kept)</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full p-2 border rounded"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setPrimaryCompanyId(e.target.value);
                          }}
                        >
                          <option value="">Select primary company...</option>
                          {availableCompanies
                            .filter(c => selectedCompanies.includes(c.id))
                            .map(company => (
                              <option key={company.id} value={company.id}>
                                {company.name} ({company.customerNumber})
                              </option>
                            ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={mergeForm.control}
                  name="customerNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Customer Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CU0001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={mergeForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cherry Hill" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mergeMutation.isPending}>
                    {mergeMutation.isPending ? "Merging..." : "Merge Companies"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {selectedCompanies.length < 2 && (
            <p className="text-sm text-gray-500">Select at least 2 companies to merge.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Customer Number Assignment Dialog Component
function CustomerNumberAssignDialog({ company }: { company: Company }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [checkingNumber, setCheckingNumber] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    available: boolean;
    existingCompany?: { name: string; customerNumber: string };
  } | null>(null);

  const customerNumberForm = useForm<CustomerNumberFormData>({
    resolver: zodResolver(customerNumberSchema),
    defaultValues: {
      customerNumber: company.customerNumber || '',
    },
  });

  const { data: nextNumber } = useQuery<{ customerNumber: string }>({
    queryKey: ["/api/admin/customer-number/next"],
    enabled: isOpen,
  });

  const assignNumberMutation = useMutation({
    mutationFn: async (data: CustomerNumberFormData) => {
      return apiRequest("POST", `/api/admin/companies/${company.id}/assign-customer-number`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customer number assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to assign customer number", 
        variant: "destructive" 
      });
    },
  });

  const checkAvailability = async (customerNumber: string) => {
    if (!customerNumber.match(/^CU\d{4}$/)) {
      setAvailabilityStatus(null);
      return;
    }

    setCheckingNumber(true);
    try {
      const response = await apiRequest("GET", `/api/admin/customer-number/${customerNumber}/available`) as {
        available: boolean;
        existingCompany?: { name: string; customerNumber: string; };
      };
      setAvailabilityStatus(response);
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailabilityStatus(null);
    } finally {
      setCheckingNumber(false);
    }
  };

  const watchedNumber = customerNumberForm.watch("customerNumber");

  // Check availability when number changes
  React.useEffect(() => {
    if (watchedNumber && watchedNumber !== company.customerNumber) {
      const timer = setTimeout(() => checkAvailability(watchedNumber), 500);
      return () => clearTimeout(timer);
    } else {
      setAvailabilityStatus(null);
    }
  }, [watchedNumber, company.customerNumber]);

  const onSubmit = (data: CustomerNumberFormData) => {
    assignNumberMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 hover:bg-blue-100"
          title="Assign Customer Number"
        >
          <Hash className="h-4 w-4 text-blue-500 hover:text-blue-700" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Customer Number</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Company: <span className="font-medium">{company.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              Current: <span className="font-mono font-medium">{company.customerNumber || 'Not assigned'}</span>
            </p>
          </div>

          <Form {...customerNumberForm}>
            <form onSubmit={customerNumberForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={customerNumberForm.control}
                name="customerNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Number</FormLabel>
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="CU0001" 
                          className="font-mono"
                        />
                      </FormControl>
                      {nextNumber && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => customerNumberForm.setValue("customerNumber", nextNumber.customerNumber)}
                        >
                          Use Next ({nextNumber.customerNumber})
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                    
                    {/* Availability Status */}
                    {checkingNumber && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                        <span>Checking availability...</span>
                      </div>
                    )}
                    
                    {availabilityStatus && !checkingNumber && (
                      <div className="flex items-center space-x-2 text-sm">
                        {availabilityStatus.available ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Available</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">
                              Already assigned to {availabilityStatus.existingCompany?.name}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={assignNumberMutation.isPending || (availabilityStatus !== null && !availabilityStatus.available)}
                >
                  {assignNumberMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCompanies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const createCompanyForm = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      contactEmail: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: 'United States',
      postalCode: '',
      website: '',
      industry: '',
      notes: '',
    },
  });

  // Fetch companies
  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ['/api/admin/companies'],
    enabled: !!user?.isAdmin,
  });

  // Create company mutation
  const createCompany = useMutation({
    mutationFn: async (data: CreateCompanyFormData) => {
      const cleanData = { ...data };
      if (!cleanData.contactEmail) delete cleanData.contactEmail;
      if (!cleanData.website) delete cleanData.website;
      
      return apiRequest('POST', '/api/admin/companies', cleanData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Company created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      setShowCreateDialog(false);
      createCompanyForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create company",
        variant: "destructive" 
      });
    },
  });

  // Update company mutation
  const updateCompany = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateCompanyFormData }) => {
      const cleanData = { ...data };
      if (!cleanData.contactEmail) delete cleanData.contactEmail;
      if (!cleanData.website) delete cleanData.website;
      
      return apiRequest('PUT', `/api/admin/companies/${id}`, cleanData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Company updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      setShowCreateDialog(false);
      setEditingCompany(null);
      createCompanyForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update company",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (data: CreateCompanyFormData) => {
    if (editingCompany) {
      updateCompany.mutate({ id: editingCompany.id, data });
    } else {
      createCompany.mutate(data);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    createCompanyForm.reset({
      name: company.name,
      contactEmail: company.contactEmail || '',
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      country: company.country || 'United States',
      postalCode: company.postalCode || '',
      website: company.website || '',
      industry: company.industry || '',
      notes: company.notes || '',
    });
    setShowCreateDialog(true);
  };

  const handleCreateNew = () => {
    setEditingCompany(null);
    createCompanyForm.reset();
    setShowCreateDialog(true);
  };

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.customerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user?.isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <AdminLayout>
      <main className="px-6 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
              <p className="text-gray-600">Manage companies and assign customer numbers (CU0001, CU0002, etc.)</p>
              <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                💡 <strong>Tip:</strong> Click the hash (#) icon next to any customer number to assign or change it
              </div>
            </div>
            <div className="flex space-x-2">
              <MergeCompaniesDialog companies={companies || []} />
              <Button onClick={handleCreateNew} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search companies by name, customer number, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Companies Table */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCompanies && filteredCompanies.length > 0 ? (
                <div>
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {filteredCompanies.length} of {companies?.length || 0} companies
                  </div>
                  <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-900">Company Details</TableHead>
                          <TableHead className="font-semibold text-gray-900">Customer Number</TableHead>
                          <TableHead className="font-semibold text-gray-900">Contact</TableHead>
                          <TableHead className="font-semibold text-gray-900">Location</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow key={company.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900">{company.name}</div>
                                {company.industry && (
                                  <div className="text-sm text-gray-500">{company.industry}</div>
                                )}
                                <div className="text-xs text-gray-400">
                                  Created {new Date(company.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="font-mono">
                                  {company.customerNumber}
                                </Badge>
                                <CustomerNumberAssignDialog company={company} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {company.contactEmail && (
                                  <div className="text-sm">{company.contactEmail}</div>
                                )}
                                {company.phone && (
                                  <div className="text-sm text-gray-500">{company.phone}</div>
                                )}
                                {company.website && (
                                  <div className="text-xs text-blue-600">
                                    <a 
                                      href={company.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {company.website}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                {company.address && <div>{company.address}</div>}
                                {(company.city || company.state) && (
                                  <div className="text-gray-500">
                                    {[company.city, company.state].filter(Boolean).join(', ')}
                                  </div>
                                )}
                                {company.country && company.country !== 'United States' && (
                                  <div className="text-gray-500">{company.country}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(company)}
                                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
                                  title="Edit Company"
                                >
                                  <Edit className="h-3 w-3 text-blue-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? "Try adjusting your search terms." : "Get started by creating a new company."}
                  </p>
                  {!searchQuery && (
                    <div className="mt-6">
                      <Button onClick={handleCreateNew} className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create/Edit Company Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Edit Company' : 'Create New Company'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...createCompanyForm}>
            <form onSubmit={createCompanyForm.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createCompanyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Corporation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="contact@company.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1 (555) 123-4567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://company.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Manufacturing" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Business St" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="San Francisco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="94102" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="United States" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createCompanyForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Additional notes about this company..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCompany.isPending || updateCompany.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {editingCompany ? 'Update Company' : 'Create Company'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}