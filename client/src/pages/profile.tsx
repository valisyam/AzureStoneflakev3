import { useState, useEffect } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Save,
  ArrowLeft,
  Shield,
  Calendar
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCustomerNumber } from "@shared/utils";


interface UserProfile {
  id: string;
  customerNumber?: string; // Add customer number field
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  jobTitle?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessType?: string;
  industryFocus?: string;
  companySize?: string;
  website?: string;
  notes?: string;
  createdAt?: string;
  isVerified?: boolean;
}

const businessTypes = [
  "Manufacturing",
  "Aerospace & Defense",
  "Automotive",
  "Medical Device",
  "Electronics",
  "Energy & Utilities",
  "Consumer Products",
  "Industrial Equipment",
  "Construction",
  "Research & Development",
  "Startup",
  "Other"
];

const companySizes = [
  "1-10 employees",
  "11-50 employees", 
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees"
];

const countries = [
  "United States",
  "Canada"
];

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const canadianProvinces = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
  "Quebec", "Saskatchewan", "Yukon"
];

export default function Profile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset state when country changes
      if (field === 'country') {
        newData.state = '';
      }
      
      return newData;
    });
  };

  // Get appropriate states/provinces based on selected country
  const getStatesProvinces = () => {
    if (formData.country === 'Canada') {
      return canadianProvinces;
    }
    return usStates; // Default to US states for US or any other case
  };

  const getStatePlaceholder = () => {
    if (formData.country === 'Canada') {
      return 'Select province';
    }
    return 'Select state';
  };

  const getZipLabel = () => {
    if (formData.country === 'Canada') {
      return 'Postal Code';
    }
    return 'ZIP Code';
  };

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
          <Link href="/" className="flex items-center text-teal-primary hover:text-teal-700 text-sm font-medium mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
              <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
            </div>
            <div className="flex items-center space-x-3">
              {profile?.isVerified && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-teal-600 hover:bg-teal-700">
                  Edit Profile
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setFormData(profile || {});
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-teal-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName || ""}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName || ""}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    disabled={true}
                    className="mt-1 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact support if needed.</p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle || ""}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="e.g., Engineering Manager, Procurement Director"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-teal-600" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName || ""}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select
                      value={formData.businessType || ""}
                      onValueChange={(value) => handleInputChange("businessType", value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select
                      value={formData.companySize || ""}
                      onValueChange={(value) => handleInputChange("companySize", value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="industryFocus">Industry Focus</Label>
                  <Input
                    id="industryFocus"
                    value={formData.industryFocus || ""}
                    onChange={(e) => handleInputChange("industryFocus", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="e.g., Precision machining, Medical devices, Aerospace components"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Company Website</Label>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="https://www.company.com"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="123 Main Street, Suite 100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Select
                      value={formData.state || ""}
                      onValueChange={(value) => handleInputChange("state", value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={getStatePlaceholder()} />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatesProvinces().map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="zipCode">{getZipLabel()}</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode || ""}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country || ""}
                    onValueChange={(value) => handleInputChange("country", value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="notes">Special Requirements or Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="Any special requirements, certifications, or additional information..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Account Status</span>
                  <Badge className={profile?.isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {profile?.isVerified ? "Verified" : "Pending Verification"}
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-medium">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Customer ID</span>
                  <span className="text-sm font-mono font-medium">
                    {profile?.customerNumber || "Not Assigned"}
                  </span>
                </div>

                <Separator />

                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </CustomerLayout>
  );
}