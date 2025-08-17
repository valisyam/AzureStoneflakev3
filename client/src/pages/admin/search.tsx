import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Mail, Building2, FileText, ShoppingCart, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface SearchResult {
  id: string;
  name: string;
  email: string;
  company?: string;
  type: 'customer';
  rfqCount: number;
  orderCount: number;
  recentActivity: string;
}

export default function AdminSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: searchResults, isLoading, refetch } = useQuery<SearchResult[]>({
    queryKey: ["/api/admin/search", searchQuery],
    enabled: false, // Don't auto-fetch, only on manual search
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setHasSearched(true);
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Search Customers</h2>
          <p className="text-gray-600 mt-2">Find customers by name, email, or company</p>
        </div>

        <Card className="rounded-2xl shadow-sm border border-gray-100 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={!searchQuery.trim() || isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!hasSearched ? (
          <Card className="rounded-2xl shadow-sm border border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start Searching</h3>
              <p className="text-gray-500 text-center">
                Enter a customer name, email, or company to find their information and activity.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="space-y-4">
            {searchResults.map((result) => (
              <Card key={result.id} className="rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-5 w-5 text-teal-primary" />
                        <h3 className="text-lg font-semibold text-gray-900">{result.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {result.email}
                        </div>
                        {result.company && (
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2" />
                            {result.company}
                          </div>
                        )}
                        <div className="text-gray-500">
                          Last activity: {result.recentActivity}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1 text-blue-500" />
                          <span className="font-medium">{result.rfqCount}</span>
                          <span className="text-gray-500 ml-1">RFQs</span>
                        </div>
                        <div className="flex items-center">
                          <ShoppingCart className="h-4 w-4 mr-1 text-green-500" />
                          <span className="font-medium">{result.orderCount}</span>
                          <span className="text-gray-500 ml-1">Orders</span>
                        </div>
                      </div>
                    </div>
                    
                    <Link href={`/admin/customers/${result.id}`}>
                      <Button variant="outline" size="sm" className="ml-4">
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl shadow-sm border border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-500 text-center">
                No customers found matching "{searchQuery}". Try a different search term.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </AdminLayout>
  );
}