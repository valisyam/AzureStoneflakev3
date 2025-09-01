import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Search, Hash, CheckCircle, AlertCircle, Users, Merge } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerCompany {
  id: string;
  companyNumber: string;
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
  userCount: number;
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

const mergeCompaniesSchema = z.object({
  primaryCompanyId: z.string().min(1, 'Primary company is required'),
  companiesToMerge: z.array(z.string()).min(1, 'At least one company to merge is required'),
  finalCustomerNumber: z.string().regex(/^CU\d{4}$/, 'Customer number must be in format CU0001'),
  finalCompanyName: z.string().min(2, 'Company name must be at least 2 characters'),
});

type MergeCompaniesFormData = z.infer<typeof mergeCompaniesSchema>;

export default function CustomerCompanies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState<CustomerCompany | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assigningNumberFor, setAssigningNumberFor] = useState<string | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedCompaniesForMerge, setSelectedCompaniesForMerge] = useState<string[]>([]);

  // Fetch customer companies
  const { data: companies = [], isLoading } = useQuery<CustomerCompany[]>({
    queryKey: ['/api/admin/customer-companies'],
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CreateCompanyFormData) => {
      return await apiRequest('POST', '/api/admin/customer-companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customer-companies'] });
      toast({ title: 'Success', description: 'Customer company created successfully' });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create company',
        variant: 'destructive'
      });
    },
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { id: string } & CreateCompanyFormData) => {
      const { id, ...updateData } = data;
      return await apiRequest('PUT', `/api/admin/customer-companies/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customer-companies'] });
      toast({ title: 'Success', description: 'Customer company updated successfully' });
      setIsEditDialogOpen(false);
      setEditingCompany(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update company',
        variant: 'destructive'
      });
    },
  });

  // Assign customer number mutation
  const assignNumberMutation = useMutation({
    mutationFn: async (data: { companyId: string; customerNumber: string }) => {
      return await apiRequest('POST', `/api/admin/customer-companies/${data.companyId}/assign-number`, { customerNumber: data.customerNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customer-companies'] });
      toast({ title: 'Success', description: 'Customer number assigned successfully' });
      setAssigningNumberFor(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to assign customer number',
        variant: 'destructive'
      });
    },
  });

  // Merge companies mutation
  const mergeCompaniesMutation = useMutation({
    mutationFn: async (data: MergeCompaniesFormData) => {
      return await apiRequest('POST', '/api/admin/customer-companies/merge', {
        primaryCompanyId: data.primaryCompanyId,
        companiesToMerge: data.companiesToMerge,
        finalCustomerNumber: data.finalCustomerNumber,
        finalCompanyName: data.finalCompanyName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customer-companies'] });
      toast({ title: 'Success', description: 'Companies merged successfully' });
      setIsMergeDialogOpen(false);
      setSelectedCompaniesForMerge([]);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to merge companies',
        variant: 'destructive'
      });
    },
  });

  // Form setup
  const createForm = useForm<CreateCompanyFormData>({
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

  const editForm = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
  });

  const numberForm = useForm<CustomerNumberFormData>({
    resolver: zodResolver(customerNumberSchema),
  });

  const mergeForm = useForm<MergeCompaniesFormData>({
    resolver: zodResolver(mergeCompaniesSchema),
    defaultValues: {
      primaryCompanyId: '',
      companiesToMerge: [],
      finalCustomerNumber: '',
      finalCompanyName: '',
    },
  });

  // Filter companies based on search
  const filteredCompanies = companies.filter((company: CustomerCompany) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.companyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onCreateSubmit = (data: CreateCompanyFormData) => {
    createCompanyMutation.mutate(data);
  };

  const onEditSubmit = (data: CreateCompanyFormData) => {
    if (!editingCompany) return;
    updateCompanyMutation.mutate({ id: editingCompany.id, ...data });
  };

  const onAssignNumber = (data: CustomerNumberFormData) => {
    if (!assigningNumberFor) return;
    assignNumberMutation.mutate({ 
      companyId: assigningNumberFor, 
      customerNumber: data.customerNumber 
    });
  };

  const handleEditClick = (company: CustomerCompany) => {
    setEditingCompany(company);
    editForm.reset({
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
    setIsEditDialogOpen(true);
  };

  const onMergeCompanies = (data: MergeCompaniesFormData) => {
    mergeCompaniesMutation.mutate(data);
  };

  const handleCompanySelectionForMerge = (companyId: string, checked: boolean) => {
    if (checked) {
      setSelectedCompaniesForMerge(prev => [...prev, companyId]);
    } else {
      setSelectedCompaniesForMerge(prev => prev.filter(id => id !== companyId));
    }
  };

  const startMergeProcess = () => {
    if (selectedCompaniesForMerge.length < 2) {
      toast({
        title: 'Error',
        description: 'Please select at least 2 companies to merge',
        variant: 'destructive'
      });
      return;
    }
    setIsMergeDialogOpen(true);
    // Reset form with selected companies
    mergeForm.reset({
      primaryCompanyId: '',
      companiesToMerge: selectedCompaniesForMerge,
      finalCustomerNumber: '',
      finalCompanyName: '',
    });
  };

  if (!user || user.email !== 'vineeth@stone-flake.com') {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                Access denied. Admin access required.
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Companies</h1>
            <p className="text-gray-600 mt-1">Manage customer company records and assign CU numbers</p>
          </div>
          
          <div className="flex gap-2">
            {selectedCompaniesForMerge.length >= 2 && (
              <Button onClick={startMergeProcess} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                <Merge className="h-4 w-4 mr-2" />
                Merge {selectedCompaniesForMerge.length} Companies
              </Button>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer Company
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Create Company Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Customer Company</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter company name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="contact@company.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Phone number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Industry type" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Street address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="State" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Postal code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://company.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Additional notes about the company" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createCompanyMutation.isPending}>
                      {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
        </Dialog>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Customer Companies ({filteredCompanies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedCompaniesForMerge.length === filteredCompanies.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCompaniesForMerge(filteredCompanies.map(c => c.id));
                          } else {
                            setSelectedCompaniesForMerge([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>CU Number</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: CustomerCompany) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedCompaniesForMerge.includes(company.id)}
                          onCheckedChange={(checked) => handleCompanySelectionForMerge(company.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          {company.industry && (
                            <div className="text-sm text-gray-500">{company.industry}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.companyNumber ? (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            {company.companyNumber}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Not Assigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          {company.contactEmail && (
                            <div className="text-sm">{company.contactEmail}</div>
                          )}
                          {company.phone && (
                            <div className="text-sm text-gray-500">{company.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {[company.city, company.state].filter(Boolean).join(', ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{company.userCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssigningNumberFor(company.id)}
                                title={company.companyNumber ? "Change Customer Number" : "Assign Customer Number"}
                              >
                                <Hash className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{company.companyNumber ? 'Change Customer Number' : 'Assign Customer Number'}</DialogTitle>
                                </DialogHeader>
                                <div className="mb-4 text-sm text-gray-600">
                                  Company: <strong>{company.name}</strong>
                                  {company.companyNumber && (
                                    <div>Current Number: <strong>{company.companyNumber}</strong></div>
                                  )}
                                </div>
                                <Form {...numberForm}>
                                  <form onSubmit={numberForm.handleSubmit(onAssignNumber)} className="space-y-4">
                                    <FormField
                                      control={numberForm.control}
                                      name="customerNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Customer Number</FormLabel>
                                          <FormControl>
                                            <Input 
                                              {...field} 
                                              placeholder="CU0001"
                                              key={company.id} // Force re-render when company changes
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button type="button" variant="outline">
                                        Cancel
                                      </Button>
                                      <Button type="submit" disabled={assignNumberMutation.isPending}>
                                        {assignNumberMutation.isPending ? 'Updating...' : (company.companyNumber ? 'Update Number' : 'Assign Number')}
                                      </Button>
                                    </div>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Company Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Customer Company</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter company name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="contact@company.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Phone number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Industry type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Street address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="State" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Postal code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" placeholder="https://company.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Additional notes about the company" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateCompanyMutation.isPending}>
                    {updateCompanyMutation.isPending ? 'Updating...' : 'Update Company'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Merge Companies Dialog */}
        <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Merge Customer Companies</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Merge {selectedCompaniesForMerge.length} companies into one. All users, orders, and RFQs will be consolidated.
              </p>
            </div>

            <Form {...mergeForm}>
              <form onSubmit={mergeForm.handleSubmit(onMergeCompanies)} className="space-y-6">
                {/* Primary Company Selection */}
                <FormField
                  control={mergeForm.control}
                  name="primaryCompanyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Primary Company *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose which company to keep as the main record" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCompanies
                              .filter(company => selectedCompaniesForMerge.includes(company.id))
                              .map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name} {company.companyNumber ? `(${company.companyNumber})` : '(No CU Number)'}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Final Company Name */}
                <FormField
                  control={mergeForm.control}
                  name="finalCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter the final company name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Final Customer Number */}
                <FormField
                  control={mergeForm.control}
                  name="finalCustomerNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Customer Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CU0001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Companies to Merge List */}
                <div>
                  <label className="text-sm font-medium">Companies Being Merged:</label>
                  <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded-md">
                    {filteredCompanies
                      .filter(company => selectedCompaniesForMerge.includes(company.id))
                      .map((company) => (
                        <div key={company.id} className="flex items-center justify-between text-sm">
                          <span>{company.name}</span>
                          <div className="flex items-center gap-2">
                            {company.companyNumber && (
                              <Badge variant="secondary">{company.companyNumber}</Badge>
                            )}
                            <span className="text-gray-500">{company.userCount || 0} users</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mergeCompaniesMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
                    {mergeCompaniesMutation.isPending ? 'Merging...' : 'Merge Companies'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}