import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Eye, Plus, DollarSign } from "lucide-react";
import { RFQ, SalesQuote } from "@shared/schema";
import { Link } from "wouter";

export default function ProjectsOverview() {
  const { data: rfqs, isLoading: loadingRfqs } = useQuery<RFQ[]>({
    queryKey: ["/api/rfqs"],
  });

  const { data: quotes, isLoading: loadingQuotes } = useQuery<SalesQuote[]>({
    queryKey: ["/api/quotes"],
  });

  const isLoading = loadingRfqs || loadingQuotes;

  // Get recent projects (RFQs with potential quotes)
  const recentProjects = rfqs?.slice(0, 4) || [];

  const getProjectQuote = (rfqId: string) => {
    return quotes?.find(quote => quote.rfqId === rfqId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "reviewing": return "bg-yellow-100 text-yellow-800";
      case "quoted": return "bg-green-100 text-green-800";
      case "accepted": return "bg-emerald-100 text-emerald-800";
      case "declined": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "new": return "New";
      case "reviewing": return "Under Review";
      case "quoted": return "Quote Available";
      case "accepted": return "Accepted";
      case "declined": return "Declined";
      default: return status;
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FolderOpen className="h-5 w-5 text-teal-600" />
            Recent Projects
          </CardTitle>
          <Link href="/rfqs">
            <Button variant="outline" size="sm" className="h-8">
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-xl space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : recentProjects.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((project) => {
                const quote = getProjectQuote(project.id);
                return (
                  <div 
                    key={project.id} 
                    className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                          {project.projectName}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {project.material} • Qty: {project.quantity}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Badge className={`${getStatusColor(project.status || 'new')} text-xs px-2 py-1`}>
                          {getStatusDisplay(project.status || 'new')}
                        </Badge>
                        {quote && (
                          <div className="flex items-center text-sm text-teal-600 font-medium">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${parseFloat(quote.amount || '0').toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {rfqs && rfqs.length > 4 && (
              <div className="text-center pt-4 border-t border-gray-100">
                <Link href="/rfqs">
                  <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700">
                    View {rfqs.length - 4} more projects →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No projects yet</h3>
            <p className="text-sm text-gray-500 mb-4">Start by submitting your first RFQ</p>
            <Link href="/rfq">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-4 w-4 mr-1" />
                Submit RFQ
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}