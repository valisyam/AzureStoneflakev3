import { Card, CardContent } from "@/components/ui/card";
import { FileText, ShoppingCart, Clock, DollarSign } from "lucide-react";
import { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  // Check if user is new (no activity)
  const isNewUser = stats.activeRfqs === 0 && stats.activeOrders === 0 && stats.pendingQuotes === 0 && stats.totalSpent === 0;

  const cards = [
    {
      title: "Active RFQs",
      value: stats.activeRfqs,
      icon: FileText,
      bgColor: "bg-teal-primary/10",
      iconColor: "text-teal-primary",
      subtitle: isNewUser ? "Submit your first request" : undefined,
    },
    {
      title: "Active Orders",
      value: stats.activeOrders,
      icon: ShoppingCart,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
      subtitle: isNewUser ? "Orders will appear here" : undefined,
    },
    {
      title: "Pending Quotes",
      value: stats.pendingQuotes,
      icon: Clock,
      bgColor: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
      subtitle: isNewUser ? "Quotes from your RFQs" : undefined,
    },
    {
      title: "Total Spent",
      value: `$${stats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      bgColor: "bg-navy-secondary/10",
      iconColor: "text-navy-secondary",
      subtitle: isNewUser ? "Track your investment" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.title} className="rounded-2xl shadow-sm border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-2 ${card.bgColor} rounded-lg`}>
                <card.icon className={`${card.iconColor} text-xl h-6 w-6`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
