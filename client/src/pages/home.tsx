import { useQuery } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import StatsCards from "@/components/dashboard/stats-cards";
import QuickActions from "@/components/dashboard/quick-actions";
// import RecentActivity from "@/components/dashboard/recent-activity";
import OrderProgress from "@/components/dashboard/order-progress";
import ProjectsOverview from "@/components/dashboard/projects-overview";
import { DashboardStats } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import stoneflakeLogo from "@assets/Stoneflake_LOGO_EmblemTeal_Transparent-01_1753899395053.png";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plus, FileText } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Extract first name from full name
  const firstName = user?.name?.split(' ')[0] || '';

  // Role-based routing
  useEffect(() => {
    if (user) {
      if (user.email === "vineeth@stone-flake.com" || user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "supplier") {
        setLocation("/supplier/dashboard");
      }
    }
  }, [user, setLocation]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <CustomerLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {firstName}!
          </h2>
          <p className="text-gray-600 mt-2">Manage your manufacturing projects and track orders</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : stats ? (
          <>
            {/* Welcome section for new customers */}
            {stats.activeRfqs === 0 && stats.activeOrders === 0 && stats.pendingQuotes === 0 && stats.totalSpent === 0 && (
              <div className="mb-8 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-2xl p-8">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <img 
                      src={stoneflakeLogo} 
                      alt="Stoneflake Logo" 
                      className="h-16 w-auto"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to S-Hub!</h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Ready to bring your manufacturing projects to life? Start by submitting your first Request for Quote (RFQ) 
                    and let our expert team provide you with competitive pricing and delivery options.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/rfq" className="inline-flex items-center px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">
                      <Plus className="w-5 h-5 mr-2" />
                      Submit Your First RFQ
                    </Link>
                    <Link href="/rfqs-page" className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                      <FileText className="w-5 h-5 mr-2" />
                      Learn About RFQs
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            <StatsCards stats={stats} />
            <QuickActions />
            
            {/* Two-column layout for enhanced dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Left column - Order Progress */}
              <div>
                <OrderProgress />
              </div>
              
              {/* Right column - Projects Overview */}
              <div>
                <ProjectsOverview />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Failed to load dashboard data</p>
          </div>
        )}
      </main>
    </CustomerLayout>
  );
}
