import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Quote, User, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  customerNumber: string;
}

export default function ManualQuoteForm() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    validUntil: "",
    estimatedDeliveryDate: "",
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

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/quotes/create", data);
    },
    onSuccess: () => {
      toast({
        title: "Quote created",
        description: "Manual quote has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rfqs"] });
      // Reset form
      setSelectedCustomer(null);
      setCustomerSearch("");
      setFormData({
        amount: "",
        validUntil: "",
        estimatedDeliveryDate: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Create quote failed",
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
        description: "Please select a customer to create the quote for",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amount || !formData.validUntil) {
      toast({
        title: "Required fields missing",
        description: "Amount and valid until date are required",
        variant: "destructive",
      });
      return;
    }

    createQuoteMutation.mutate({
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <Quote className="h-6 w-6 text-blue-600" />
          <span>Create Manual Quote</span>
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

          {/* Quote Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Quote Amount ($)
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

            <div className="space-y-2">
              <Label htmlFor="validUntil" className="text-sm font-medium text-gray-700">
                Valid Until
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDeliveryDate" className="text-sm font-medium text-gray-700">
              Estimated Delivery Date (Optional)
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={formData.estimatedDeliveryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Quote Notes (Optional)
            </Label>
            <Textarea
              placeholder="Additional notes for this quote..."
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
                  amount: "",
                  validUntil: "",
                  estimatedDeliveryDate: "",
                  notes: "",
                });
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={createQuoteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createQuoteMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Quote className="h-4 w-4 mr-2" />
                  Create Quote
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}