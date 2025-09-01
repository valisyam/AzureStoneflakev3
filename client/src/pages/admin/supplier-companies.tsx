import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Search, Hash, CheckCircle, AlertCircle, Users, Merge } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface SupplierCompany {
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

const vendorNumberSchema = z.object({
  vendorNumber: z.string().regex(/^V\d{4}$/, 'Vendor number must be in format V0001'),
});

type VendorNumberFormData = z.infer<typeof vendorNumberSchema>;

const mergeCompaniesSchema = z.object({
  finalVendorNumber: z.string().regex(/^V\d{4}$/, 'Vendor number must be in format V0001'),
  finalCompanyName: z.string().min(2, 'Company name must be at least 2 characters'),
});

type MergeCompaniesFormData = z.infer<typeof mergeCompaniesSchema>;

export default function SupplierCompanies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany, setEditingCompany] = useState<SupplierCompany | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assigningNumberFor, setAssigningNumberFor] = useState<string | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);

  // Fetch supplier companies
  const { data: companies = [], isLoading } = useQuery<SupplierCompany[]>({
    queryKey: ['/api/admin/supplier-companies'],
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CreateCompanyFormData) => {
      return await apiRequest('POST', '/api/admin/supplier-companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-companies'] });
      toast({ title: 'Success', description: 'Supplier company created successfully' });
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
      return await apiRequest('PUT', `/api/admin/supplier-companies/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-companies'] });
      toast({ title: 'Success', description: 'Supplier company updated successfully' });
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

  // Assign vendor number mutation
  const assignNumberMutation = useMutation({
    mutationFn: async (data: { companyId: string; vendorNumber: string }) => {
      return await apiRequest('POST', `/api/admin/supplier-companies/${data.companyId}/assign-number`, { vendorNumber: data.vendorNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-companies'] });
      toast({ title: 'Success', description: 'Vendor number assigned successfully' });
      setAssigningNumberFor(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to assign vendor number',
        variant: 'destructive'
      });
    },
  });

  // Merge companies mutation
  const mergeCompaniesMutation = useMutation({
    mutationFn: async (data: { primaryCompanyId: string; companiesToMerge: string[]; finalVendorNumber: string; finalCompanyName: string }) => {
      return await apiRequest('POST', '/api/admin/supplier-companies/merge', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/supplier-companies'] });
      toast({ title: 'Success', description: 'Companies merged successfully' });
      setIsMergeDialogOpen(false);
      setSelectedCompanies([]);
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

  const numberForm = useForm<VendorNumberFormData>({
    resolver: zodResolver(vendorNumberSchema),
  });

  const mergeForm = useForm<MergeCompaniesFormData>({
    resolver: zodResolver(mergeCompaniesSchema),
  });

  // Filter companies based on search
  const filteredCompanies = companies.filter((company: SupplierCompany) =>
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

  const onAssignNumber = (data: VendorNumberFormData) => {
    if (!assigningNumberFor) return;
    assignNumberMutation.mutate({ 
      companyId: assigningNumberFor, 
      vendorNumber: data.vendorNumber 
    });
  };

  const handleEditClick = (company: SupplierCompany) => {
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

  const handleCompanySelection = (companyId: string) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const handleSelectAllCompanies = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map(c => c.id));
    }
  };

  const handleMergeSubmit = (data: MergeCompaniesFormData) => {
    if (selectedCompanies.length < 2) {
      toast({
        title: 'Error',
        description: 'Please select at least 2 companies to merge',
        variant: 'destructive'
      });
      return;
    }

    const primaryCompanyId = selectedCompanies[0]; // First selected becomes primary
    mergeCompaniesMutation.mutate({
      primaryCompanyId,
      companiesToMerge: selectedCompanies,
      finalVendorNumber: data.finalVendorNumber,
      finalCompanyName: data.finalCompanyName
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
            <h1 className="text-3xl font-bold text-gray-900">Supplier Companies</h1>
            <p className="text-gray-600 mt-1">Manage supplier company records and assign V numbers</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Supplier Company</DialogTitle>
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
        </div>

        {/* Search and Actions */}
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
          
          {selectedCompanies.length >= 2 && (
            <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-purple-50 hover:bg-purple-100">
                  <Merge className="h-4 w-4 mr-2" />
                  Merge Companies ({selectedCompanies.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Merge Supplier Companies</DialogTitle>
                </DialogHeader>
                <Form {...mergeForm}>
                  <form onSubmit={mergeForm.handleSubmit(handleMergeSubmit)} className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Merging {selectedCompanies.length} companies. All users and data will be consolidated.
                    </div>
                    
                    <FormField
                      control={mergeForm.control}
                      name="finalCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Final Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter final company name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mergeForm.control}
                      name="finalVendorNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Final Vendor Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="V0001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={mergeCompaniesMutation.isPending}>
                        {mergeCompaniesMutation.isPending ? 'Merging...' : 'Merge Companies'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supplier Companies ({filteredCompanies.length})
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
                        checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
                        onCheckedChange={handleSelectAllCompanies}
                        aria-label="Select all companies"
                        data-testid="checkbox-select-all-suppliers"
                      />
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>V Number</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: SupplierCompany) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCompanies.includes(company.id)}
                          onCheckedChange={() => handleCompanySelection(company.id)}
                          aria-label={`Select ${company.name}`}
                          data-testid={`checkbox-supplier-${company.id}`}
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
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
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
                                title={company.companyNumber ? "Change Vendor Number" : "Assign Vendor Number"}
                              >
                                <Hash className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{company.companyNumber ? 'Change Vendor Number' : 'Assign Vendor Number'}</DialogTitle>
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
                                    name="vendorNumber"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Vendor Number</FormLabel>
                                        <FormControl>
                                          <Input 
                                            {...field} 
                                            placeholder="V0001"
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
              <DialogTitle>Edit Supplier Company</DialogTitle>
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
      </div>
    </AdminLayout>
  );
}