import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText, Package, DollarSign, CheckCircle } from "lucide-react";
import { RFQ, SalesOrder, SalesQuote } from "@shared/schema";

interface ActivityItem {
  id: string;
  type: "rfq" | "quote" | "order" | "payment";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function RecentActivity() {
  const { data: rfqs } = useQuery<RFQ[]>({
    queryKey: ["/api/rfqs"],
  });

  const { data: quotes } = useQuery<SalesQuote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: orders } = useQuery<(SalesOrder & { rfq: RFQ })[]>({
    queryKey: ["/api/orders"],
  });

  // Create activity timeline from various data sources
  const activities: ActivityItem[] = [];

  // Add RFQ activities
  rfqs?.forEach(rfq => {
    if (rfq.createdAt) {
      const timestamp = typeof rfq.createdAt === 'string' ? rfq.createdAt : new Date(rfq.createdAt).toISOString();
      activities.push({
        id: rfq.id,
        type: "rfq",
        title: `RFQ Submitted: ${rfq.projectName}`,
        description: `Material: ${rfq.material} • Quantity: ${rfq.quantity}`,
        timestamp,
        status: rfq.status || undefined,
        icon: FileText
      });
    }
  });

  // Add quote activities
  quotes?.forEach(quote => {
    if (quote.createdAt) {
      const timestamp = typeof quote.createdAt === 'string' ? quote.createdAt : new Date(quote.createdAt).toISOString();
      const amount = quote.amount ? parseFloat(quote.amount) : 0;
      activities.push({
        id: quote.id,
        type: "quote",
        title: `Quote Received: ${quote.rfqId}`,
        description: `Quote amount: $${amount.toLocaleString()}`,
        timestamp,
        status: quote.status || undefined,
        icon: DollarSign
      });
    }
  });

  // Add order activities
  orders?.forEach(order => {
    const timestamp = order.orderDate || new Date().toISOString();
    activities.push({
      id: order.id,
      type: "order",
      title: `Order in Progress: ${order.rfq.projectName}`,
      description: `Status: ${order.orderStatus?.replace('_', ' ') || 'Unknown'}`,
      timestamp: timestamp,
      status: order.orderStatus || undefined,
      icon: Package
    });
  });

  // Sort by timestamp (most recent first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Take only the most recent 5 activities
  const recentActivities = activities.slice(0, 5);

  const getStatusColor = (type: string, status?: string) => {
    if (type === "rfq") {
      switch (status) {
        case "new": return "bg-blue-100 text-blue-800";
        case "quoted": return "bg-green-100 text-green-800";
        case "accepted": return "bg-emerald-100 text-emerald-800";
        default: return "bg-gray-100 text-gray-800";
      }
    }
    if (type === "quote") {
      switch (status) {
        case "pending": return "bg-yellow-100 text-yellow-800";
        case "accepted": return "bg-green-100 text-green-800";
        case "declined": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
      }
    }
    if (type === "order") {
      switch (status) {
        case "pending": return "bg-blue-100 text-blue-800";
        case "manufacturing": return "bg-purple-100 text-purple-800";
        case "shipped": return "bg-green-100 text-green-800";
        case "delivered": return "bg-emerald-100 text-emerald-800";
        default: return "bg-gray-100 text-gray-800";
      }
    }
    return "bg-gray-100 text-gray-800";
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    return time.toLocaleDateString();
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="h-5 w-5 text-teal-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!rfqs && !quotes && !orders ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3 group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                    {activity.status && (
                      <Badge className={`${getStatusColor(activity.type, activity.status)} mt-2 text-xs`}>
                        {activity.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    )}
                  </div>
                  {index < recentActivities.length - 1 && (
                    <div className="absolute left-8 mt-12 w-px h-6 bg-gray-200" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No recent activity</h3>
            <p className="text-sm text-gray-500">Your project activities will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}