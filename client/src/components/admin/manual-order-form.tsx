import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Package, User, Calendar, DollarSign, Wrench } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  customerNumber: string;
}

const materials = [
  "Aluminum",
  "Steel",
  "Stainless Steel",
  "Titanium",
  "Brass",
  "Copper",
  "Plastic",
  "Carbon Fiber",
  "Other"
];

const finishingOptions = [
  "None",
  "Anodizing",
  "Powder Coating",
  "Plating",
  "Polishing",
  "Sandblasting",
  "Painting",
  "Other"
];

export default function ManualOrderForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "",
    material: "",
    materialGrade: "",
    finishing: "",
    tolerance: "",
    quantity: "",
    amount: "",
    estimatedCompletion: "",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search customers query
  const searchQuery = useQuery({
    queryKey: ["/api/admin/search", customerSearch],
    enabled: customerSearch.length >= 2,
    queryFn: async () => {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(customerSearch)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to search customers");
      return response.json();
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/orders/create", data);
    },
    onSuccess: () => {
      toast({
        title: "Order created",
        description: "Manual order has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfqs"] });
      // Reset form
      setSelectedCustomer(null);
      setCustomerSearch("");
      setFormData({
        projectName: "",
        material: "",
        materialGrade: "",
        finishing: "",
        tolerance: "",
        quantity: "",
        amount: "",
        estimatedCompletion: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Create order failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    if (value.length >= 2) {
      setShowResults(true);
    } else {
      setShowResults(false);
      setSearchResults([]);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowResults(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast({
        title: "Customer required",
        description: "Please select a customer to create the order for",
        variant: "destructive",
      });
      return;
    }

    const required = ["projectName", "material", "tolerance", "quantity", "amount"];
    const missing = required.filter(field => !formData[field as keyof typeof formData]);
    
    if (missing.length > 0) {
      toast({
        title: "Required fields missing",
        description: `Please fill in: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      customerId: selectedCustomer.id,
      ...formData,
    });
  };

  // Update search results when query data changes
  React.useEffect(() => {
    if (searchQuery.data && customerSearch.length >= 2) {
      setSearchResults(searchQuery.data);
    }
  }, [searchQuery.data, customerSearch]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
        <CardTitle className="flex items-center space-x-2 text-green-900">
          <Package className="h-6 w-6 text-green-600" />
          <span>Create Manual Order</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer" className="text-sm font-medium text-gray-700">
              Select Customer
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, company, email, or customer ID..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Search Results */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.company} • {customer.customerNumber} • {customer.email}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {showResults && searchQuery.isLoading && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-sm text-gray-500">Searching...</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Selected Customer Display */}
            {selectedCustomer && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2 text-green-800">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{selectedCustomer.name}</span>
                  <span className="text-green-600">({selectedCustomer.customerNumber})</span>
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {selectedCustomer.company} • {selectedCustomer.email}
                </div>
              </div>
            )}
          </div>

          {/* Project Details */}
          <div className="space-y-2">
            <Label htmlFor="projectName" className="text-sm font-medium text-gray-700">
              Project Name
            </Label>
            <Input
              type="text"
              placeholder="Enter project name..."
              value={formData.projectName}
              onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
              required
            />
          </div>

          {/* Material and Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material" className="text-sm font-medium text-gray-700">
                Material
              </Label>
              <Select value={formData.material} onValueChange={(value) => setFormData(prev => ({ ...prev, material: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="materialGrade" className="text-sm font-medium text-gray-700">
                Material Grade (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g., 6061-T6, 304, etc."
                value={formData.materialGrade}
                onChange={(e) => setFormData(prev => ({ ...prev, materialGrade: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="finishing" className="text-sm font-medium text-gray-700">
                Finishing
              </Label>
              <Select value={formData.finishing} onValueChange={(value) => setFormData(prev => ({ ...prev, finishing: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select finishing" />
                </SelectTrigger>
                <SelectContent>
                  {finishingOptions.map((finishing) => (
                    <SelectItem key={finishing} value={finishing}>
                      {finishing}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerance" className="text-sm font-medium text-gray-700">
                Tolerance
              </Label>
              <Input
                type="text"
                placeholder="e.g., ±0.1mm, ±0.005in"
                value={formData.tolerance}
                onChange={(e) => setFormData(prev => ({ ...prev, tolerance: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Quantity and Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                Quantity
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Order Amount ($)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCompletion" className="text-sm font-medium text-gray-700">
              Estimated Completion Date (Optional)
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={formData.estimatedCompletion}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedCompletion: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Order Notes (Optional)
            </Label>
            <Textarea
              placeholder="Additional notes for this order..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedCustomer(null);
                setCustomerSearch("");
                setFormData({
                  projectName: "",
                  material: "",
                  materialGrade: "",
                  finishing: "",
                  tolerance: "",
                  quantity: "",
                  amount: "",
                  estimatedCompletion: "",
                  notes: "",
                });
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={createOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createOrderMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}