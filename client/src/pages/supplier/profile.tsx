import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Building, MapPin, Award, Wrench } from 'lucide-react';
import { PageLoader } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import SupplierLayout from '@/components/layout/SupplierLayout';

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

const COUNTRIES = [
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'Germany', 'France', 
  'Italy', 'Spain', 'Netherlands', 'Sweden', 'China', 'Japan', 'South Korea', 
  'India', 'Singapore', 'Australia', 'Brazil', 'Argentina'
];

const STATES_PROVINCES = {
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ],
  'Canada': [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ],
  'Mexico': [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México',
    'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
    'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ],
  'Australia': [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
    'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ],
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
    'Lakshadweep', 'Puducherry'
  ]
} as Record<string, string[]>;

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

const QUALITY_SYSTEMS = [
  'ISO 9001',
  'AS9100 (Aerospace)',
  'TS 16949 (Automotive)',
  'ISO 13485 (Medical)',
  'Custom Quality System',
  'No Formal System'
];

const EMPLOYEE_RANGES = [
  '1-10',
  '11-50',
  '51-100',
  '101-500',
  '500+',
  'Undisclosed'
];

const FACILITY_SIZES = [
  'Under 5,000 sq ft',
  '5,000 - 25,000 sq ft',
  '25,000 - 100,000 sq ft',
  '100,000 - 500,000 sq ft',
  'Over 500,000 sq ft'
];

const EMPLOYEE_COUNTS = [
  '1-10',
  '11-50',
  '51-100',
  '101-500',
  '501-1000',
  '1000+'
];

interface SupplierProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  capabilities: string;
  finishingCapabilities: string;
  certifications: string;
  // Enhanced supplier assessment fields
  yearEstablished: string;
  numberOfEmployees: string;
  facilitySize: string;
  primaryIndustries: string;
  qualitySystem: string;
  leadTimeCapability: string;
  minimumOrderQuantity: string;
  maxPartSizeCapability: string;
  toleranceCapability: string;
  emergencyCapability: boolean;
  internationalShipping: boolean;
}

export default function SupplierProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery<SupplierProfile>({
    queryKey: ['/api/supplier/profile'],
    enabled: !!user && user.role === 'supplier',
    refetchOnWindowFocus: false, // Prevent refetch when switching back to tab
    staleTime: 5 * 60 * 1000 // Consider data fresh for 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/supplier/profile', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your supplier profile has been updated successfully."
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return <PageLoader role="supplier" />;
  }

  const calculateCompletionPercentage = (profileData: any) => {
    const fields = [
      profileData?.name,
      profileData?.email,
      profileData?.phone,
      profileData?.website,
      profileData?.address,
      profileData?.city,
      profileData?.country,
      profileData?.capabilities && JSON.parse(profileData.capabilities || '[]').length > 0,
      profileData?.certifications && JSON.parse(profileData.certifications || '[]').length > 0
    ];
    
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletionPercentage(profile);
  const capabilities = profile?.capabilities ? JSON.parse(profile.capabilities) : [];
  const certifications = profile?.certifications ? JSON.parse(profile.certifications) : [];

  // Ensure profile has default structure to prevent TypeScript errors
  const profileData = profile || {
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postalCode: '',
    capabilities: '[]',
    finishingCapabilities: '[]',
    certifications: '[]',
    yearEstablished: '',
    numberOfEmployees: '',
    facilitySize: '',
    primaryIndustries: '[]',
    qualitySystem: '',
    leadTimeCapability: '',
    minimumOrderQuantity: '',
    maxPartSizeCapability: '',
    toleranceCapability: '',
    emergencyCapability: false,
    internationalShipping: false
  };

  const ProfileForm = () => {
    const [formData, setFormData] = useState({
      name: profileData.name || '',
      phone: profileData.phone || '',
      website: profileData.website || '',
      address: profileData.address || '',
      city: profileData.city || '',
      state: profileData.state || '',
      country: profileData.country || 'United States',
      postalCode: profileData.postalCode || '',
      capabilities: capabilities,
      finishingCapabilities: JSON.parse(profileData.finishingCapabilities || '[]'),
      certifications: certifications,
      // New assessment fields
      yearEstablished: profileData.yearEstablished || '',
      numberOfEmployees: profileData.numberOfEmployees || '',
      facilitySize: profileData.facilitySize || '',
      primaryIndustries: JSON.parse(profileData.primaryIndustries || '[]'),
      qualitySystem: profileData.qualitySystem || '',
      leadTimeCapability: profileData.leadTimeCapability || '',
      minimumOrderQuantity: profileData.minimumOrderQuantity || '',
      maxPartSizeCapability: profileData.maxPartSizeCapability || '',
      toleranceCapability: profileData.toleranceCapability || '',
      emergencyCapability: profileData.emergencyCapability || false,
      internationalShipping: profileData.internationalShipping || false
    });

    // Available states/provinces for selected country
    const availableStates = STATES_PROVINCES[formData.country] || [];

    // Handle country change and reset state
    const handleCountryChange = (country: string) => {
      setFormData(prev => ({
        ...prev,
        country,
        state: '' // Reset state when country changes
      }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateProfileMutation.mutate({
        ...formData,
        capabilities: JSON.stringify(formData.capabilities),
        finishingCapabilities: JSON.stringify(formData.finishingCapabilities),
        certifications: JSON.stringify(formData.certifications),
        primaryIndustries: JSON.stringify(formData.primaryIndustries)
      });
    };

    const toggleCapability = (capability: string) => {
      setFormData(prev => ({
        ...prev,
        capabilities: prev.capabilities.includes(capability)
          ? prev.capabilities.filter((c: string) => c !== capability)
          : [...prev.capabilities, capability]
      }));
    };

    const toggleCertification = (certification: string) => {
      setFormData(prev => ({
        ...prev,
        certifications: prev.certifications.includes(certification)
          ? prev.certifications.filter((c: string) => c !== certification)
          : [...prev.certifications, certification]
      }));
    };

    const toggleFinishingCapability = (capability: string) => {
      setFormData(prev => ({
        ...prev,
        finishingCapabilities: prev.finishingCapabilities.includes(capability)
          ? prev.finishingCapabilities.filter((c: string) => c !== capability)
          : [...prev.finishingCapabilities, capability]
      }));
    };

    const togglePrimaryIndustry = (industry: string) => {
      setFormData(prev => ({
        ...prev,
        primaryIndustries: prev.primaryIndustries.includes(industry)
          ? prev.primaryIndustries.filter((i: string) => i !== industry)
          : [...prev.primaryIndustries, industry]
      }));
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.yourcompany.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                {availableStates.length > 0 ? (
                  <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state/province" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Enter state/province"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Select value={formData.country} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manufacturing Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Manufacturing Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {MANUFACTURING_CAPABILITIES.map(capability => (
                <div key={capability} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={capability}
                    checked={formData.capabilities.includes(capability)}
                    onChange={() => toggleCapability(capability)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={capability} className="text-sm cursor-pointer">
                    {capability}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Finishing Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Finishing Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FINISHING_CAPABILITIES.map(capability => (
                <div key={capability} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`finishing-${capability}`}
                    checked={formData.finishingCapabilities.includes(capability)}
                    onChange={() => toggleFinishingCapability(capability)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`finishing-${capability}`} className="text-sm cursor-pointer">
                    {capability}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CERTIFICATIONS.map(certification => (
                <div key={certification} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={certification}
                    checked={formData.certifications.includes(certification)}
                    onChange={() => toggleCertification(certification)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={certification} className="text-sm cursor-pointer">
                    {certification}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Assessment Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="yearEstablished">Year Established</Label>
                <Input
                  id="yearEstablished"
                  value={formData.yearEstablished}
                  onChange={(e) => setFormData(prev => ({ ...prev, yearEstablished: e.target.value }))}
                  placeholder="e.g., 1995"
                />
              </div>
              <div>
                <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                <Select value={formData.numberOfEmployees} onValueChange={(value) => setFormData(prev => ({ ...prev, numberOfEmployees: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee count" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_COUNTS.map((count) => (
                      <SelectItem key={count} value={count}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="facilitySize">Facility Size</Label>
                <Select value={formData.facilitySize} onValueChange={(value) => setFormData(prev => ({ ...prev, facilitySize: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility size" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACILITY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="qualitySystem">Quality System</Label>
                <Input
                  id="qualitySystem"
                  value={formData.qualitySystem}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualitySystem: e.target.value }))}
                  placeholder="e.g., ISO 9001:2015"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Production Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="leadTimeCapability">Lead Time Capability</Label>
                <Input
                  id="leadTimeCapability"
                  value={formData.leadTimeCapability}
                  onChange={(e) => setFormData(prev => ({ ...prev, leadTimeCapability: e.target.value }))}
                  placeholder="e.g., 2-4 weeks standard"
                />
              </div>
              <div>
                <Label htmlFor="minimumOrderQuantity">Minimum Order Quantity</Label>
                <Input
                  id="minimumOrderQuantity"
                  value={formData.minimumOrderQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderQuantity: e.target.value }))}
                  placeholder="e.g., 1 piece, 100 pieces"
                />
              </div>
              <div>
                <Label htmlFor="maxPartSizeCapability">Max Part Size Capability</Label>
                <Input
                  id="maxPartSizeCapability"
                  value={formData.maxPartSizeCapability}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPartSizeCapability: e.target.value }))}
                  placeholder="e.g., 500mm x 300mm x 200mm"
                />
              </div>
              <div>
                <Label htmlFor="toleranceCapability">Tolerance Capability</Label>
                <Input
                  id="toleranceCapability"
                  value={formData.toleranceCapability}
                  onChange={(e) => setFormData(prev => ({ ...prev, toleranceCapability: e.target.value }))}
                  placeholder="e.g., ±0.05mm, ±0.002in"
                />
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emergencyCapability"
                    checked={formData.emergencyCapability}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyCapability: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="emergencyCapability" className="text-sm cursor-pointer">
                    Emergency/Rush Orders
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="internationalShipping"
                    checked={formData.internationalShipping}
                    onChange={(e) => setFormData(prev => ({ ...prev, internationalShipping: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="internationalShipping" className="text-sm cursor-pointer">
                    International Shipping
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Primary Industries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Primary Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRIMARY_INDUSTRIES.map(industry => (
                <div key={industry} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`industry-${industry}`}
                    checked={formData.primaryIndustries.includes(industry)}
                    onChange={() => togglePrimaryIndustry(industry)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`industry-${industry}`} className="text-sm cursor-pointer">
                    {industry}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    );
  };

  if (isEditing) {
    return (
      <SupplierLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Edit Supplier Profile</h1>
          </div>
          <ProfileForm />
        </div>
      </SupplierLayout>
    );
  }

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Supplier Profile</h1>
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        </div>

      {/* Profile Completion Card */}
      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Profile Completion</h3>
              <p className="text-sm text-gray-600">Complete your profile to receive more RFQ opportunities</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{completionPercentage}%</div>
              {completionPercentage === 100 ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          {completionPercentage < 100 && (
            <p className="text-sm text-gray-500 mt-2">
              Complete all sections to maximize your RFQ opportunities
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Company Name</Label>
              <p className="text-sm">{profile?.name || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Email</Label>
              <p className="text-sm">{profile?.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Phone</Label>
              <p className="text-sm">{profile?.phone || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Website</Label>
              <p className="text-sm">
                {profile?.website ? (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                    {profile.website}
                  </a>
                ) : 'Not provided'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Address</Label>
              <p className="text-sm">{profile?.address || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">City</Label>
              <p className="text-sm">{profile?.city || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Country</Label>
              <p className="text-sm">{profile?.country || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturing Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Manufacturing Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capabilities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability: string) => (
                <Badge key={capability} variant="secondary" className="bg-orange-100 text-orange-800">
                  {capability}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No capabilities specified</p>
          )}
        </CardContent>
      </Card>

      {/* Finishing Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Finishing Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {JSON.parse(profile?.finishingCapabilities || '[]').length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {JSON.parse(profile?.finishingCapabilities || '[]').map((capability: string) => (
                <Badge key={capability} variant="secondary" className="bg-blue-100 text-blue-800">
                  {capability}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No finishing capabilities specified</p>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {certifications.map((certification: string) => (
                <Badge key={certification} variant="secondary" className="bg-green-100 text-green-800">
                  {certification}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No certifications specified</p>
          )}
        </CardContent>
      </Card>

      {/* Supplier Assessment Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Year Established</Label>
              <p className="text-sm">{profile?.yearEstablished || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Number of Employees</Label>
              <p className="text-sm">{profile?.numberOfEmployees || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Facility Size</Label>
              <p className="text-sm">{profile?.facilitySize || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Quality System</Label>
              <p className="text-sm">{profile?.qualitySystem || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Production Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Lead Time Capability</Label>
              <p className="text-sm">{profile?.leadTimeCapability || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Minimum Order Quantity</Label>
              <p className="text-sm">{profile?.minimumOrderQuantity || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Max Part Size Capability</Label>
              <p className="text-sm">{profile?.maxPartSizeCapability || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Tolerance Capability</Label>
              <p className="text-sm">{profile?.toleranceCapability || 'Not provided'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Emergency Capability</Label>
                <p className="text-sm">{profile?.emergencyCapability ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">International Shipping</Label>
                <p className="text-sm">{profile?.internationalShipping ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary Industries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Primary Industries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {JSON.parse(profile?.primaryIndustries || '[]').length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {JSON.parse(profile?.primaryIndustries || '[]').map((industry: string) => (
                <Badge key={industry} variant="secondary" className="bg-purple-100 text-purple-800">
                  {industry}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No primary industries specified</p>
          )}
        </CardContent>
      </Card>
      </div>
    </SupplierLayout>
  );
}