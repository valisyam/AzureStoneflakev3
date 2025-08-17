import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Users, 
  Send, 
  Eye, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Package,
  Calendar,
  Plus,
  Building,
  Upload,
  X,
  Paperclip,
  Trash2,
  UserPlus,
  Edit,
  Factory,
  Award,
  Target,
  Wrench,
  Zap,
  Globe,
  Filter,
  Quote,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/layout/AdminLayout';
import AdminSupplierQuotes from './supplier-quotes';

const MANUFACTURING_CAPABILITIES = [
  'CNC Machining',
  'Sheet Metal Fabrication',
  'Welding',
  '3D Printing/Additive Manufacturing',
  'Injection Molding',
  'Die Casting',
  'Sand Casting',
  'Investment Casting',
  'Forging',
  'Stamping',
  'Laser Cutting',
  'Waterjet Cutting',
  'EDM (Electrical Discharge Machining)',
  'Surface Treatment/Finishing',
  'Assembly',
  'Quality Inspection',
  'Prototyping',
  'Low Volume Production',
  'High Volume Production',
  'Multi-axis Machining',
  'Swiss Machining',
  'Turning/Lathe Work',
  'Milling',
  'Grinding',
  'Heat Treatment',
  'Annealing',
  'Tempering'
];

const FINISHING_CAPABILITIES = [
  'Anodizing (Type II)',
  'Anodizing (Type III/Hard Coat)',
  'Black Oxide',
  'Zinc Plating',
  'Nickel Plating',
  'Chrome Plating',
  'Electroless Nickel',
  'Passivation',
  'Powder Coating',
  'Wet Paint',
  'Sandblasting',
  'Bead Blasting',
  'Tumbling/Deburring',
  'Vibratory Finishing',
  'Brushing/Satin Finish',
  'Polishing',
  'Chemical Etching',
  'Laser Marking/Engraving',
  'Silk Screening',
  'Pad Printing'
];

const CERTIFICATIONS = [
  'ISO 9001',
  'ISO 14001',
  'ISO 45001',
  'AS9100 (Aerospace)',
  'TS 16949 (Automotive)',
  'ISO 13485 (Medical Devices)',
  'NADCAP',
  'FDA Registration',
  'CE Marking',
  'UL Certification',
  'RoHS Compliance',
  'REACH Compliance',
  'ITAR Registration',
  'EAR Compliance',
  'IPC Certification',
  'API Certification',
  'AWS Welding Certification',
  'ASME Certification',
  'MIL-STD Compliance'
];

const PRIMARY_INDUSTRIES = [
  'Aerospace & Defense',
  'Automotive',
  'Medical Devices',
  'Electronics & Semiconductors',
  'Energy & Power',
  'Industrial Equipment',
  'Consumer Products',
  'Marine & Offshore',
  'Oil & Gas',
  'Construction & Infrastructure',
  'Food & Beverage',
  'Pharmaceutical',
  'Telecommunications',
  'Robotics & Automation'
];

const createSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const editSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  companyNameInput: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  yearEstablished: z.string().optional(),
  numberOfEmployees: z.string().optional(),
  facilitySize: z.string().optional(),
  qualitySystem: z.string().optional(),
  leadTimeCapability: z.string().optional(),
  minimumOrderQuantity: z.string().optional(),
  maxPartSizeCapability: z.string().optional(),
  toleranceCapability: z.string().optional(),
  emergencyCapability: z.boolean().optional(),
  internationalShipping: z.boolean().optional(),
  capabilities: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  finishingCapabilities: z.array(z.string()).optional(),
  primaryIndustries: z.array(z.string()).optional(),
});

type CreateSupplierFormData = z.infer<typeof createSupplierSchema>;
type EditSupplierFormData = z.infer<typeof editSupplierSchema>;

export default function SupplierManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateSupplierDialog, setShowCreateSupplierDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showCreateQuoteDialog, setShowCreateQuoteDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showViewSupplierDialog, setShowViewSupplierDialog] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [supplierToView, setSupplierToView] = useState<any>(null);
  const [supplierToEdit, setSupplierToEdit] = useState<any>(null);
  const [showVendorNumberDialog, setShowVendorNumberDialog] = useState(false);
  const [supplierForVendorNumber, setSupplierForVendorNumber] = useState<any>(null);
  const [vendorNumber, setVendorNumber] = useState('');
  const [existingCompanyName, setExistingCompanyName] = useState<string | null>(null);
  const [checkingVendorNumber, setCheckingVendorNumber] = useState(false);
  
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

  const createSupplierForm = useForm<CreateSupplierFormData>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const editSupplierForm = useForm<EditSupplierFormData>({
    resolver: zodResolver(editSupplierSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      companyNameInput: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      yearEstablished: '',
      numberOfEmployees: '',
      facilitySize: '',
      qualitySystem: '',
      leadTimeCapability: '',
      minimumOrderQuantity: '',
      maxPartSizeCapability: '',
      toleranceCapability: '',
      emergencyCapability: false,
      internationalShipping: false,
      capabilities: [],
      certifications: [],
      finishingCapabilities: [],
      primaryIndustries: [],
    },
  });

  // Get all suppliers
  const { data: suppliers, isLoading: suppliersLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: ['/api/admin/suppliers']
  });



  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: CreateSupplierFormData) => {
      const { confirmPassword, ...supplierData } = data;
      return apiRequest('POST', '/api/admin/suppliers', {
        ...supplierData,
        role: 'supplier'
      });
    },
    onSuccess: () => {
      toast({
        title: "Supplier Created",
        description: "Supplier account has been created successfully."
      });
      setShowCreateSupplierDialog(false);
      createSupplierForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier account.",
        variant: "destructive"
      });
    }
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      return apiRequest('DELETE', `/api/admin/suppliers/${supplierId}`);
    },
    onSuccess: () => {
      toast({
        title: "Supplier Deleted",
        description: "Supplier account has been deleted successfully."
      });
      setShowDeleteDialog(false);
      setSupplierToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier account.",
        variant: "destructive"
      });
    }
  });

  // Edit supplier mutation
  const editSupplierMutation = useMutation({
    mutationFn: async ({ supplierId, data }: { supplierId: string; data: EditSupplierFormData }) => {
      return apiRequest('PUT', `/api/admin/suppliers/${supplierId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Supplier Updated",
        description: "Supplier profile has been updated successfully."
      });
      setShowEditSupplierDialog(false);
      setSupplierToEdit(null);
      editSupplierForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier profile.",
        variant: "destructive"
      });
    }
  });

  // Assign vendor number mutation
  const assignVendorNumberMutation = useMutation({
    mutationFn: async ({ supplierId, vendorNumber }: { supplierId: string; vendorNumber: string }) => {
      return apiRequest('POST', `/api/admin/suppliers/${supplierId}/assign-vendor-number`, { vendorNumber });
    },
    onSuccess: () => {
      toast({
        title: "Vendor Number Assigned",
        description: "Vendor number has been assigned successfully."
      });
      setShowVendorNumberDialog(false);
      setSupplierForVendorNumber(null);
      setVendorNumber('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign vendor number.",
        variant: "destructive"
      });
    }
  });

  // Generate vendor number query
  const { data: generatedVendorNumber, refetch: generateVendorNumber } = useQuery({
    queryKey: ['/api/admin/suppliers/generate-vendor-number'],
    enabled: false,
    queryFn: async () => {
      const response = await fetch('/api/admin/suppliers/generate-vendor-number', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to generate vendor number');
      const data = await response.json();
      return data.vendorNumber;
    }
  });

  const handleCreateSupplier = (data: CreateSupplierFormData) => {
    createSupplierMutation.mutate(data);
  };

  const handleDeleteSupplier = (supplier: any) => {
    setSupplierToDelete(supplier);
    setShowDeleteDialog(true);
  };

  const confirmDeleteSupplier = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete.id);
    }
  };

  const handleEditSupplier = (data: EditSupplierFormData) => {
    if (supplierToEdit) {
      // Convert array fields to JSON strings before sending to backend
      const processedData = {
        ...data,
        capabilities: data.capabilities ? JSON.stringify(data.capabilities) : JSON.stringify([]),
        certifications: data.certifications ? JSON.stringify(data.certifications) : JSON.stringify([]),
        finishingCapabilities: data.finishingCapabilities ? JSON.stringify(data.finishingCapabilities) : JSON.stringify([]),
        primaryIndustries: data.primaryIndustries ? JSON.stringify(data.primaryIndustries) : JSON.stringify([]),
      };
      editSupplierMutation.mutate({
        supplierId: supplierToEdit.id,
        data: processedData
      });
    }
  };

  // Populate edit form when supplier is selected
  const populateEditForm = (supplier: any) => {
    editSupplierForm.reset({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      companyNameInput: supplier.companyNameInput || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || '',
      postalCode: supplier.postalCode || '',
      yearEstablished: supplier.yearEstablished || '',
      numberOfEmployees: supplier.numberOfEmployees || '',
      facilitySize: supplier.facilitySize || '',
      qualitySystem: supplier.qualitySystem || '',
      leadTimeCapability: supplier.leadTimeCapability || '',
      minimumOrderQuantity: supplier.minimumOrderQuantity || '',
      maxPartSizeCapability: supplier.maxPartSizeCapability || '',
      toleranceCapability: supplier.toleranceCapability || '',
      emergencyCapability: supplier.emergencyCapability || false,
      internationalShipping: supplier.internationalShipping || false,
      capabilities: supplier.capabilities ? JSON.parse(supplier.capabilities) : [],
      certifications: supplier.certifications ? JSON.parse(supplier.certifications) : [],
      finishingCapabilities: supplier.finishingCapabilities ? JSON.parse(supplier.finishingCapabilities) : [],
      primaryIndustries: supplier.primaryIndustries ? JSON.parse(supplier.primaryIndustries) : [],
    });
  };

  // Handle vendor number assignment
  const handleAssignVendorNumber = (supplier: any) => {
    setSupplierForVendorNumber(supplier);
    setVendorNumber('');
    setShowVendorNumberDialog(true);
  };

  const confirmAssignVendorNumber = () => {
    if (supplierForVendorNumber && vendorNumber.trim()) {
      assignVendorNumberMutation.mutate({
        supplierId: supplierForVendorNumber.id,
        vendorNumber: vendorNumber.trim()
      });
    }
  };

  const handleGenerateVendorNumber = async () => {
    try {
      const result = await generateVendorNumber();
      if (result.data) {
        setVendorNumber(result.data);
        setExistingCompanyName(null); // Reset for generated numbers
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate vendor number. Please try again.",
        variant: "destructive"
      });
    }
  };

  const checkVendorNumber = async (vendorNumber: string) => {
    if (!vendorNumber.match(/^V\d{4}$/)) {
      setExistingCompanyName(null);
      return;
    }

    setCheckingVendorNumber(true);
    try {
      const response = await fetch(`/api/admin/suppliers/check-vendor-number/${vendorNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.companyName) {
          setExistingCompanyName(data.companyName);
        } else {
          setExistingCompanyName(null);
        }
      } else {
        setExistingCompanyName(null);
      }
    } catch (error) {
      setExistingCompanyName(null);
    } finally {
      setCheckingVendorNumber(false);
    }
  };

  const handleVendorNumberChange = (value: string) => {
    setVendorNumber(value);
    if (value.length >= 5) { // V0001 is 5 characters
      checkVendorNumber(value);
    } else {
      setExistingCompanyName(null);
    }
  };



  // Filter options derived from suppliers data
  const filterOptions = useMemo(() => {
    if (!suppliers || !Array.isArray(suppliers)) {
      return {
        capabilities: [],
        certifications: [],
        countries: [],
        cities: [],
        finishingCapabilities: [],
        primaryIndustries: [],
        qualitySystems: []
      };
    }

    const capabilities = new Set<string>();
    const certifications = new Set<string>();
    const countries = new Set<string>();
    const cities = new Set<string>();
    const finishingCapabilities = new Set<string>();
    const primaryIndustries = new Set<string>();
    const qualitySystems = new Set<string>();

    suppliers.forEach((supplier: any) => {
      if (supplier.capabilities) {
        try {
          JSON.parse(supplier.capabilities || '[]').forEach((cap: string) => capabilities.add(cap));
        } catch (e) {}
      }
      if (supplier.certifications) {
        try {
          JSON.parse(supplier.certifications || '[]').forEach((cert: string) => certifications.add(cert));
        } catch (e) {}
      }
      if (supplier.country) countries.add(supplier.country);
      if (supplier.city) cities.add(supplier.city);
      if (supplier.finishingCapabilities) {
        try {
          JSON.parse(supplier.finishingCapabilities || '[]').forEach((finish: string) => finishingCapabilities.add(finish));
        } catch (e) {}
      }
      if (supplier.primaryIndustries) {
        try {
          JSON.parse(supplier.primaryIndustries || '[]').forEach((industry: string) => primaryIndustries.add(industry));
        } catch (e) {}
      }
      if (supplier.qualitySystems) {
        try {
          JSON.parse(supplier.qualitySystems || '[]').forEach((system: string) => qualitySystems.add(system));
        } catch (e) {}
      }
    });

    return {
      capabilities: Array.from(capabilities),
      certifications: Array.from(certifications),
      countries: Array.from(countries),
      cities: Array.from(cities),
      finishingCapabilities: Array.from(finishingCapabilities),
      primaryIndustries: Array.from(primaryIndustries),
      qualitySystems: Array.from(qualitySystems)
    };
  }, [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!suppliers || !Array.isArray(suppliers)) return [];

    return suppliers.filter((supplier: any) => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!supplier.name?.toLowerCase().includes(searchLower) && 
            !supplier.email?.toLowerCase().includes(searchLower) &&
            !supplier.company?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Capabilities filter
      if (filters.capabilities.length > 0) {
        const supplierCaps = supplier.capabilities ? JSON.parse(supplier.capabilities || '[]') : [];
        if (!filters.capabilities.some(cap => supplierCaps.includes(cap))) {
          return false;
        }
      }

      // Finishing capabilities filter
      if (filters.finishingCapabilities.length > 0) {
        const supplierFinish = supplier.finishingCapabilities ? JSON.parse(supplier.finishingCapabilities || '[]') : [];
        if (!filters.finishingCapabilities.some(finish => supplierFinish.includes(finish))) {
          return false;
        }
      }

      // Primary industries filter
      if (filters.primaryIndustries.length > 0) {
        const supplierIndustries = supplier.primaryIndustries ? JSON.parse(supplier.primaryIndustries || '[]') : [];
        if (!filters.primaryIndustries.some(industry => supplierIndustries.includes(industry))) {
          return false;
        }
      }

      // Quality systems filter
      if (filters.qualitySystems.length > 0) {
        const supplierQuality = supplier.qualitySystems ? JSON.parse(supplier.qualitySystems || '[]') : [];
        if (!filters.qualitySystems.some(system => supplierQuality.includes(system))) {
          return false;
        }
      }

      // Country filter
      if (filters.countries.length > 0 && !filters.countries.includes(supplier.country)) {
        return false;
      }

      // City filter
      if (filters.cities.length > 0 && !filters.cities.includes(supplier.city)) {
        return false;
      }

      // Employee count filter
      if (filters.minEmployees && supplier.employeeCount) {
        if (parseInt(supplier.employeeCount) < parseInt(filters.minEmployees)) {
          return false;
        }
      }
      if (filters.maxEmployees && supplier.employeeCount) {
        if (parseInt(supplier.employeeCount) > parseInt(filters.maxEmployees)) {
          return false;
        }
      }

      // Year established filter
      if (filters.minYearEstablished && supplier.yearEstablished) {
        if (parseInt(supplier.yearEstablished) < parseInt(filters.minYearEstablished)) {
          return false;
        }
      }

      // Special capabilities filters
      if (filters.emergencyCapability && !supplier.emergencyCapability) {
        return false;
      }
      if (filters.internationalShipping && !supplier.internationalShipping) {
        return false;
      }

      return true;
    });
  }, [suppliers, filters]);

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

  const getCompletionBadge = (percentage: number) => {
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
        <main className="px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Supplier Management</h2>
          <p className="text-gray-600 mt-2">Manage supplier accounts, profiles, and view quote requests</p>
        </div>

        <Tabs defaultValue="suppliers" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid grid-cols-2 bg-white/80 backdrop-blur-sm">
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="quotes" className="flex items-center gap-2">
                <Quote className="h-4 w-4" />
                Supplier Quotes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="suppliers">

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <Dialog open={showCreateSupplierDialog} onOpenChange={setShowCreateSupplierDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Create New Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Supplier Account</DialogTitle>
              </DialogHeader>
              <Form {...createSupplierForm}>
                <form 
                  onSubmit={createSupplierForm.handleSubmit((data) => createSupplierMutation.mutate(data))} 
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createSupplierForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter supplier name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createSupplierForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createSupplierForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createSupplierForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createSupplierForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createSupplierForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateSupplierDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSupplierMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createSupplierMutation.isPending ? 'Creating...' : 'Create Supplier'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <a href="/admin/purchase-orders" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Purchase Orders</p>
                    <p className="text-xs text-gray-500">Manage supplier POs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                  <p className="text-2xl font-bold text-gray-900">{(suppliers as any[])?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Complete Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(suppliers as any[])?.filter((s: any) => s.profileCompletion >= 80)?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Incomplete Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(suppliers as any[])?.filter((s: any) => s.profileCompletion < 80)?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <Label>Filter by Country</Label>
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
                <Label>Filter by Capabilities</Label>
                <Select onValueChange={(value) => {
                  if (!filters.capabilities.includes(value)) {
                    setFilters(prev => ({ ...prev, capabilities: [...prev.capabilities, value] }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select capabilities" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.capabilities.map((capability) => (
                      <SelectItem key={capability} value={capability}>{capability}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.capabilities.map((capability) => (
                      <Badge key={capability} variant="secondary" className="text-xs">
                        {capability}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => setFilters(prev => ({ 
                            ...prev, 
                            capabilities: prev.capabilities.filter(c => c !== capability) 
                          }))}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers List */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-6 w-6 text-green-600" />
                  Filtered Suppliers ({filteredSuppliers.length} of {(suppliers as any[])?.length || 0})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Manage supplier accounts and send quote requests</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
                    refetchSuppliers();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Refresh
                </Button>
                <Button 
                  onClick={() => setShowCreateSupplierDialog(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Supplier
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {!(suppliers as any[]) || (suppliers as any[]).length === 0 ? 'No Suppliers Registered' : 'No Suppliers Match Filters'}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {!(suppliers as any[]) || (suppliers as any[]).length === 0 
                    ? 'Suppliers will appear here once they register on the platform. Once registered, you can create and send quote requests directly to them.'
                    : 'Try adjusting your filters to see more suppliers.'
                  }
                </p>
                {(suppliers as any[]) && (suppliers as any[]).length > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredSuppliers.map((supplier: any, index) => (
                  <div key={supplier.id} className={`p-6 hover:bg-gray-50 transition-colors ${index === 0 ? 'pt-6' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {supplier.companyName ? supplier.companyName.charAt(0).toUpperCase() : supplier.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-lg text-gray-900">{supplier.companyName || 'No Company Name'}</h3>
                              {supplier.supplierNumber && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                  {supplier.supplierNumber}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{supplier.email}</p>
                          </div>
                          {getCompletionBadge(supplier.profileCompletion)}
                        </div>
                        
                        <div className="space-y-4">
                          {/* Basic Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-400" />
                              <span><strong>Location:</strong> {supplier.country ? `${supplier.city || 'N/A'}, ${supplier.country}` : 'Not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span><strong>Capabilities:</strong> {supplier.manufacturingCapabilities || 'Not specified'}</span>
                            </div>
                            {supplier.specialization && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span><strong>Specialization:</strong> {supplier.specialization}</span>
                              </div>
                            )}
                          </div>

                          {/* Company Assessment Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {supplier.yearEstablished && (
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-blue-400" />
                                <span><strong>Est.:</strong> {supplier.yearEstablished}</span>
                              </div>
                            )}
                            {supplier.numberOfEmployees && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-green-400" />
                                <span><strong>Employees:</strong> {supplier.numberOfEmployees}</span>
                              </div>
                            )}
                            {supplier.facilitySize && (
                              <div className="flex items-center gap-2">
                                <Factory className="h-4 w-4 text-purple-400" />
                                <span><strong>Facility:</strong> {supplier.facilitySize}</span>
                              </div>
                            )}
                            {supplier.qualitySystem && (
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-yellow-500" />
                                <span><strong>Quality:</strong> {supplier.qualitySystem}</span>
                              </div>
                            )}
                          </div>

                          {/* Production Capabilities */}
                          {(supplier.leadTimeCapability || supplier.minimumOrderQuantity || supplier.toleranceCapability) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              {supplier.leadTimeCapability && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-orange-400" />
                                  <span><strong>Lead Time:</strong> {supplier.leadTimeCapability}</span>
                                </div>
                              )}
                              {supplier.minimumOrderQuantity && (
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-indigo-400" />
                                  <span><strong>Min Order:</strong> {supplier.minimumOrderQuantity}</span>
                                </div>
                              )}
                              {supplier.toleranceCapability && (
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-red-400" />
                                  <span><strong>Tolerance:</strong> {supplier.toleranceCapability}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Finishing Capabilities */}
                          {supplier.finishingCapabilities && JSON.parse(supplier.finishingCapabilities || '[]').length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Wrench className="h-4 w-4 text-teal-400" />
                                <span className="font-medium">Finishing Capabilities:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {JSON.parse(supplier.finishingCapabilities || '[]').slice(0, 4).map((capability: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                                    {capability}
                                  </Badge>
                                ))}
                                {JSON.parse(supplier.finishingCapabilities || '[]').length > 4 && (
                                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                    +{JSON.parse(supplier.finishingCapabilities || '[]').length - 4} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Primary Industries */}
                          {supplier.primaryIndustries && JSON.parse(supplier.primaryIndustries || '[]').length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Building className="h-4 w-4 text-blue-400" />
                                <span className="font-medium">Primary Industries:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {JSON.parse(supplier.primaryIndustries || '[]').slice(0, 3).map((industry: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {industry}
                                  </Badge>
                                ))}
                                {JSON.parse(supplier.primaryIndustries || '[]').length > 3 && (
                                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                    +{JSON.parse(supplier.primaryIndustries || '[]').length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Special Capabilities */}
                          {(supplier.emergencyCapability || supplier.internationalShipping) && (
                            <div className="flex items-center gap-4 text-sm">
                              {supplier.emergencyCapability && (
                                <div className="flex items-center gap-1">
                                  <Zap className="h-4 w-4 text-red-500" />
                                  <span className="text-red-600 font-medium">Emergency Orders</span>
                                </div>
                              )}
                              {supplier.internationalShipping && (
                                <div className="flex items-center gap-1">
                                  <Globe className="h-4 w-4 text-blue-500" />
                                  <span className="text-blue-600 font-medium">International Shipping</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-6">
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              setSupplierToView(supplier);
                              setShowViewSupplierDialog(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button 
                            onClick={() => {
                              setSupplierToEdit(supplier);
                              populateEditForm(supplier);
                              setShowEditSupplierDialog(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowCreateQuoteDialog(true);
                            }}
                            size="sm"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <Send className="h-4 w-4" />
                            Create Quote
                          </Button>
                          {!supplier.supplierNumber ? (
                            <Button
                              onClick={() => handleAssignVendorNumber(supplier)}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                            >
                              <Hash className="h-4 w-4" />
                              Assign Vendor #
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleAssignVendorNumber(supplier)}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                            >
                              <Hash className="h-4 w-4" />
                              Change Vendor #
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteSupplier(supplier)}
                            size="sm"
                            variant="destructive"
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                        <Badge variant="outline" className="text-xs justify-center">
                          {supplier.profileCompletion}% Complete
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Supplier Dialog */}
        <Dialog open={showCreateSupplierDialog} onOpenChange={setShowCreateSupplierDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Add New Supplier
              </DialogTitle>
            </DialogHeader>

            <Form {...createSupplierForm}>
              <form onSubmit={createSupplierForm.handleSubmit(handleCreateSupplier)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createSupplierForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createSupplierForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createSupplierForm.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Manufacturing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createSupplierForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createSupplierForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimum 8 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createSupplierForm.control}
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

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateSupplierDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSupplierMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createSupplierMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <UserPlus className="h-4 w-4" />
                        <span>Create Supplier</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete Supplier Account
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this supplier account? This action cannot be undone.
              </p>
              
              {supplierToDelete && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {supplierToDelete.companyName ? supplierToDelete.companyName.charAt(0).toUpperCase() : supplierToDelete.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{supplierToDelete.companyName || 'No Company Name'}</p>
                      <p className="text-sm text-gray-600">{supplierToDelete.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteSupplierMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteSupplier}
                disabled={deleteSupplierMutation.isPending}
              >
                {deleteSupplierMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Supplier</span>
                  </div>
                )}
              </Button>
            </div>
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

              <div className="border-t pt-6">
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

              <div className="border-t pt-6">
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

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
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

        {/* View Supplier Dialog */}
        <Dialog open={showViewSupplierDialog} onOpenChange={setShowViewSupplierDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Supplier Profile Details
              </DialogTitle>
            </DialogHeader>

            {supplierToView && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{supplierToView.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{supplierToView.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{supplierToView.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Company:</span>
                        <span className="font-medium">{supplierToView.companyName || supplierToView.companyNameInput || 'No Company Name'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Website:</span>
                        <span className="font-medium">{supplierToView.website || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Year Established:</span>
                        <span className="font-medium">{supplierToView.yearEstablished || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employees:</span>
                        <span className="font-medium">{supplierToView.numberOfEmployees || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Facility Size:</span>
                        <span className="font-medium">{supplierToView.facilitySize || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quality System:</span>
                        <span className="font-medium">{supplierToView.qualitySystem || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Street Address:</span>
                      <span className="font-medium">{supplierToView.address || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">City:</span>
                      <span className="font-medium">{supplierToView.city || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">State:</span>
                      <span className="font-medium">{supplierToView.state || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Country:</span>
                      <span className="font-medium">{supplierToView.country || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Postal Code:</span>
                      <span className="font-medium">{supplierToView.postalCode || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Capabilities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lead Time:</span>
                      <span className="font-medium">{supplierToView.leadTimeCapability || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Order Quantity:</span>
                      <span className="font-medium">{supplierToView.minimumOrderQuantity || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Part Size:</span>
                      <span className="font-medium">{supplierToView.maxPartSizeCapability || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tolerance:</span>
                      <span className="font-medium">{supplierToView.toleranceCapability || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Emergency Orders:</span>
                      <span className="font-medium">{supplierToView.emergencyCapability ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">International Shipping:</span>
                      <span className="font-medium">{supplierToView.internationalShipping ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setShowViewSupplierDialog(false)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Supplier Dialog */}
        <Dialog open={showEditSupplierDialog} onOpenChange={setShowEditSupplierDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit Supplier Profile
              </DialogTitle>
            </DialogHeader>

            <Form {...editSupplierForm}>
              <form onSubmit={editSupplierForm.handleSubmit(handleEditSupplier)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editSupplierForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="companyNameInput"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC Manufacturing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editSupplierForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="California" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="United States" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="94105" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Company Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editSupplierForm.control}
                      name="yearEstablished"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Established</FormLabel>
                          <FormControl>
                            <Input placeholder="2000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="numberOfEmployees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Employees</FormLabel>
                          <FormControl>
                            <Input placeholder="50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="facilitySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Size</FormLabel>
                          <FormControl>
                            <Input placeholder="10,000 sq ft" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="qualitySystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quality System</FormLabel>
                          <FormControl>
                            <Input placeholder="ISO 9001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Capabilities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Capabilities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editSupplierForm.control}
                      name="leadTimeCapability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Time Capability</FormLabel>
                          <FormControl>
                            <Input placeholder="2-4 weeks" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="minimumOrderQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order Quantity</FormLabel>
                          <FormControl>
                            <Input placeholder="100 pieces" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="maxPartSizeCapability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Part Size Capability</FormLabel>
                          <FormControl>
                            <Input placeholder="12 x 12 x 6 inches" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="toleranceCapability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tolerance Capability</FormLabel>
                          <FormControl>
                            <Input placeholder="±0.005 inches" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Special Capabilities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editSupplierForm.control}
                      name="emergencyCapability"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Emergency Order Capability</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="internationalShipping"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>International Shipping</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Manufacturing Capabilities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Manufacturing Capabilities</h3>
                  <div className="space-y-4">
                    <FormField
                      control={editSupplierForm.control}
                      name="capabilities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturing Capabilities</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {MANUFACTURING_CAPABILITIES.map(capability => (
                                <div key={capability} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={capability}
                                    checked={field.value?.includes(capability) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, capability]);
                                      } else {
                                        field.onChange(currentValue.filter((c: string) => c !== capability));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={capability} className="text-sm cursor-pointer">
                                    {capability}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="finishingCapabilities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Finishing Capabilities</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {FINISHING_CAPABILITIES.map(capability => (
                                <div key={capability} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`finishing-${capability}`}
                                    checked={field.value?.includes(capability) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, capability]);
                                      } else {
                                        field.onChange(currentValue.filter((c: string) => c !== capability));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`finishing-${capability}`} className="text-sm cursor-pointer">
                                    {capability}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="certifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Certifications</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {CERTIFICATIONS.map(certification => (
                                <div key={certification} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={certification}
                                    checked={field.value?.includes(certification) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, certification]);
                                      } else {
                                        field.onChange(currentValue.filter((c: string) => c !== certification));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={certification} className="text-sm cursor-pointer">
                                    {certification}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editSupplierForm.control}
                      name="primaryIndustries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Industries</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {PRIMARY_INDUSTRIES.map(industry => (
                                <div key={industry} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={industry}
                                    checked={field.value?.includes(industry) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, industry]);
                                      } else {
                                        field.onChange(currentValue.filter((i: string) => i !== industry));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={industry} className="text-sm cursor-pointer">
                                    {industry}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditSupplierDialog(false);
                      setSupplierToEdit(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editSupplierMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editSupplierMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Edit className="h-4 w-4" />
                        <span>Update Supplier</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Vendor Number Assignment Dialog */}
        <Dialog open={showVendorNumberDialog} onOpenChange={setShowVendorNumberDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-purple-600" />
                Assign Vendor Number
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {supplierForVendorNumber && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {supplierForVendorNumber.companyName?.charAt(0).toUpperCase() || supplierForVendorNumber.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplierForVendorNumber.companyName || 'No Company Name'}</h3>
                      <p className="text-sm text-gray-600">{supplierForVendorNumber.email}</p>
                      {supplierForVendorNumber.supplierNumber && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 mt-1">
                          Current: {supplierForVendorNumber.supplierNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="vendorNumber">Vendor Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="vendorNumber"
                    placeholder="V0001"
                    value={vendorNumber}
                    onChange={(e) => handleVendorNumberChange(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateVendorNumber}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Generate
                  </Button>
                </div>
                {checkingVendorNumber ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Checking vendor number...</span>
                  </div>
                ) : existingCompanyName ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-800">
                        This vendor number is already used by: <strong>{existingCompanyName}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      The new user will be assigned to this company name automatically.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Format: V0001, V0002, etc. Multiple users from the same company can share the same vendor number to access shared dashboard data.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowVendorNumberDialog(false);
                    setSupplierForVendorNumber(null);
                    setVendorNumber('');
                    setExistingCompanyName(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAssignVendorNumber}
                  disabled={!vendorNumber.trim() || assignVendorNumberMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {assignVendorNumberMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Assigning...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4" />
                      <span>Assign Vendor Number</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

          </TabsContent>

          <TabsContent value="quotes">
            <AdminSupplierQuotes showHeader={false} />
          </TabsContent>
        </Tabs>
      </main>
    </AdminLayout>
  );
}