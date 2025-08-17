import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Mail, Building2, Calendar, FileText, ShoppingCart, Link2, Unlink, Users, ExternalLink, Plus, Trash2, Search, Filter, Eye, Quote, DollarSign, Clock, Package, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerRFQTable from "@/components/admin/customer-rfq-table";
import OrderTracking from "@/components/admin/order-tracking";
import ArchivedOrders from "@/components/admin/archived-orders";

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

interface Customer {
  id: string;
  name: string;
  email: string;
  title?: string;
  phone?: string;
  companyId?: string;
  companyNameInput?: string;
  company?: Company;
  customerNumber?: string;
  isVerified: boolean;
  isAdmin: boolean;
  role: string;
  createdAt: string;
  rfqCount: number;
  orderCount: number;
  totalSpent?: number;
}

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  title: z.string().optional(),
  companyNameInput: z.string().min(1, 'Company name is required'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['customer']).default('customer'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function AdminCustomers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [linkCompanyId, setLinkCompanyId] = useState("");
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [activeTab, setActiveTab] = useState("customers");
  // Customer management only shows customers - no role filter needed

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      title: '',
      companyNameInput: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
    },
  });

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
    enabled: user?.isAdmin,
  });



  // Get available companies for linking
  const { data: availableCompanies } = useQuery<any[]>({
    queryKey: ["/api/admin/companies"],
    staleTime: 30000,
  });

  const linkUserMutation = useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/link`, { companyId });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User linked to company successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setSelectedCustomer(null);
      setLinkCompanyId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to link user to company", variant: "destructive" });
    },
  });

  const unlinkUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/users/${userId}/unlink`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User unlinked from company successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unlink user from company", variant: "destructive" });
    },
  });

  const { data: linkedUsers } = useQuery<Customer[]>({
    queryKey: [`/api/admin/customers/${selectedCustomer?.customerNumber}/users`],
    enabled: !!selectedCustomer && !!selectedCustomer.customerNumber,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const { confirmPassword, companyNameInput, ...userData } = data;
      return apiRequest("POST", "/api/admin/customers", {
        ...userData,
        companyName: companyNameInput || '', // Map to expected field name, ensure not undefined
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      setShowCreateDialog(false);
      createUserForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create user", 
        variant: "destructive" 
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete user", 
        variant: "destructive" 
      });
    },
  });

  const onCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    return customers.filter((customer) => {
      // Search filter
      const searchMatch = searchQuery === "" || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.companyNameInput?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.customerNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === "all" || 
        (statusFilter === "verified" && customer.isVerified) ||
        (statusFilter === "unverified" && !customer.isVerified);
      
      // No role filter needed - only customers are fetched from backend
      
      return searchMatch && statusMatch;
    });
  }, [customers, searchQuery, statusFilter]);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <main className="px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-2">Manage customer accounts and view incoming RFQs</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Accounts
            </TabsTrigger>
            <TabsTrigger value="rfqs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Incoming RFQs
            </TabsTrigger>
            <TabsTrigger value="active-orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Orders
            </TabsTrigger>
            <TabsTrigger value="archived-orders" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Customer Accounts</h3>
                  <p className="text-gray-600">Manage customer accounts, assign customer numbers, and link to companies</p>
                </div>
                
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...createUserForm}>
                <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createUserForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createUserForm.control}
                      name="companyNameInput"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createUserForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Role is automatically set to 'customer' for customer management */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createUserForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createUserMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>

          {/* Enhanced Search and Filter Controls */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, company, or customer number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>
              
              <div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Verification Status
                  </label>
                  <Select value={statusFilter} onValueChange={(value: "all" | "verified" | "unverified") => setStatusFilter(value)}>
                    <SelectTrigger className="w-36 h-10 bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="verified">✅ Verified</SelectItem>
                      <SelectItem value="unverified">⚠️ Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                

              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Customer #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredCustomers.length} of {customers?.length || 0} users
            </div>
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">User Details</TableHead>
                    <TableHead className="font-semibold text-gray-900">Company</TableHead>
                    <TableHead className="font-semibold text-gray-900">Customer #</TableHead>
                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                    <TableHead className="font-semibold text-gray-900">Activity</TableHead>
                    <TableHead className="font-semibold text-gray-900">Total Spent</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                          <div className="text-xs text-gray-400">
                            Joined {new Date(customer.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.company ? (
                            <div className="font-medium">{customer.company.name}</div>
                          ) : customer.companyNameInput ? (
                            <div className="text-gray-600">{customer.companyNameInput}</div>
                          ) : (
                            <div className="text-gray-400">—</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.company ? (
                            <div className="font-mono text-teal-600 bg-teal-50 px-2 py-1 rounded inline-block">
                              {customer.company.customerNumber}
                            </div>
                          ) : customer.companyNameInput ? (
                            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                              Unlinked
                            </div>
                          ) : (
                            <div className="text-gray-400">—</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={customer.isVerified ? "default" : "destructive"} className="text-xs">
                            {customer.isVerified ? "Verified" : "Unverified"}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {customer.isAdmin ? "Admin" : "Customer"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{customer.rfqCount} RFQs</div>
                          <div>{customer.orderCount} Orders</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-teal-600">
                          ${(customer.totalSpent || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200"
                                onClick={() => setSelectedCustomer(customer)}
                                title="Manage User Linking"
                              >
                                <Users className="h-3 w-3 text-blue-600" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Manage Customer Linking</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Current Status: {selectedCustomer?.company 
                                      ? `Linked to ${selectedCustomer.company.name} (${selectedCustomer.company.customerNumber})` 
                                      : "Not linked to any company"}
                                  </p>
                                </div>

                                {selectedCustomer?.company ? (
                                  <div className="space-y-3">
                                    <Button 
                                      onClick={() => {
                                        if (selectedCustomer) {
                                          unlinkUserMutation.mutate(selectedCustomer.id);
                                        }
                                      }}
                                      variant="outline"
                                      className="w-full"
                                      disabled={unlinkUserMutation.isPending}
                                    >
                                      <Unlink className="h-4 w-4 mr-2" />
                                      {unlinkUserMutation.isPending ? 'Unlinking...' : 'Unlink from Company'}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div>
                                      <Label htmlFor="companyId">Link to Company</Label>
                                      <Select value={linkCompanyId} onValueChange={setLinkCompanyId}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a company..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableCompanies?.map(company => (
                                            <SelectItem key={company.id} value={company.id}>
                                              {company.customerNumber} - {company.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button 
                                      onClick={() => {
                                        if (selectedCustomer && linkCompanyId.trim()) {
                                          linkUserMutation.mutate({ 
                                            userId: selectedCustomer.id, 
                                            companyId: linkCompanyId.trim() 
                                          });
                                        }
                                      }}
                                      className="w-full bg-teal-600 hover:bg-teal-700"
                                      disabled={linkUserMutation.isPending || !linkCompanyId.trim()}
                                    >
                                      <Link2 className="h-4 w-4 mr-2" />
                                      {linkUserMutation.isPending ? 'Linking...' : 'Link Customer'}
                                    </Button>
                                  </div>
                                )}

                                {linkedUsers && linkedUsers.length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-medium text-sm mb-2">
                                      Linked Users ({linkedUsers.length})
                                    </h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                      {linkedUsers.map((linkedUser) => (
                                        <div key={linkedUser.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                          <span>{linkedUser.name}</span>
                                          <span className="text-gray-500">{linkedUser.email}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                title="Delete User"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {customer.name}? This action cannot be undone.
                                  All associated RFQs, quotes, and orders will also be affected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(customer.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all" 
                ? "No users match your search criteria" 
                : "No customers found"}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
          </TabsContent>

          <TabsContent value="rfqs">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Incoming Customer RFQs</h3>
                <p className="text-gray-600">Review and manage customer requests for quotes. Create quotes and sales orders directly from this interface.</p>
              </div>
              <CustomerRFQTable />
            </div>
          </TabsContent>

          <TabsContent value="active-orders">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Customer Orders</h3>
                <p className="text-gray-600">Track and update the status of ongoing customer orders. Update production stages and delivery information.</p>
              </div>
              <OrderTracking />
            </div>
          </TabsContent>

          <TabsContent value="archived-orders">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Archived Customer Orders</h3>
                <p className="text-gray-600">View completed and delivered customer orders. Access order history and documentation.</p>
              </div>
              <ArchivedOrders />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AdminLayout>
  );
}