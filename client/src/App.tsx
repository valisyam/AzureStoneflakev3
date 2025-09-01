import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { getAuthToken } from "@/lib/authUtils";
import { useEffect, lazy, Suspense } from "react";
import { PageLoader } from "@/components/ui/loading-spinner";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import RFQSubmit from "@/pages/rfq-submit";
import RFQSuccess from "@/pages/rfq-success";
import RFQs from "@/pages/rfqs";
import Orders from "@/pages/orders";
import Quotes from "@/pages/quotes";
import History from "@/pages/history";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";

import Admin from "@/pages/admin";
import AdminCustomers from "@/pages/admin/customers";
import AdminCompanies from "@/pages/admin/companies";
import AdminCustomerCompanies from "@/pages/admin/customer-companies";
import AdminSupplierCompanies from "@/pages/admin/supplier-companies";
import AdminSearch from "@/pages/admin/search";
import AdminReports from "@/pages/admin/reports";
import AdminManualCreation from "@/pages/admin/manual-creation";
import AdminSupplierManagement from "@/pages/admin/supplier-management";
import AdminRFQAssignments from "@/pages/admin/rfq-assignments";
import AdminCreateQuote from "@/pages/admin/create-quote";
import AdminSupplierQuotes from "@/pages/admin/supplier-quotes";
import NotFound from "@/pages/not-found";

// Set up auth interceptor
queryClient.setDefaultOptions({
  queries: {
    queryFn: async ({ queryKey }) => {
      const token = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(queryKey.join("/") as string, {
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return await res.json();
    },
  },
});

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/rfq" component={RFQSubmit} />
          <Route path="/rfq/success" component={RFQSuccess} />
          <Route path="/rfqs" component={RFQs} />
          <Route path="/orders" component={Orders} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/history" component={History} />
          <Route path="/profile">
            {() => {
              const ProfileComponent = lazy(() => import("@/pages/profile"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <ProfileComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/messages">
            {() => {
              const MessagesComponent = lazy(() => import("@/pages/messages"));
              return (
                <Suspense fallback={<PageLoader />}>  
                  <MessagesComponent />
                </Suspense>
              );
            }}
          </Route>

          <Route path="/admin" component={Admin} />
          <Route path="/admin/dashboard" component={Admin} />
          <Route path="/admin/customers" component={AdminCustomers} />
          <Route path="/admin/companies" component={AdminCompanies} />
          <Route path="/admin/customer-companies" component={AdminCustomerCompanies} />
          <Route path="/admin/supplier-companies" component={AdminSupplierCompanies} />
          <Route path="/admin/search" component={AdminSearch} />
          <Route path="/admin/reports" component={AdminReports} />
          <Route path="/admin/manual-creation" component={AdminManualCreation} />
          <Route path="/admin/create-quote" component={AdminCreateQuote} />
          <Route path="/admin/messages">
            {() => {
              const AdminMessagesComponent = lazy(() => import("@/pages/admin/messages"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <AdminMessagesComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/admin/quality-checks">
            {() => {
              const QualityChecksComponent = lazy(() => import("@/pages/admin/quality-checks"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <QualityChecksComponent />
                </Suspense>
              );
            }}
          </Route>

          <Route path="/admin/purchase-orders">
            {() => {
              const AdminPurchaseOrdersComponent = lazy(() => import("@/pages/admin/purchase-orders"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <AdminPurchaseOrdersComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/admin/supplier-management">
            {() => {
              const SupplierManagementComponent = lazy(() => import("@/pages/admin/supplier-management"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierManagementComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/admin/supplier-quotes">
            {() => <AdminSupplierQuotes showHeader={true} />}
          </Route>
          
          {/* Supplier routes */}
          <Route path="/supplier">
            {() => {
              const SupplierComponent = lazy(() => import("@/pages/supplier"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/supplier/dashboard">
            {() => {
              const SupplierDashboardComponent = lazy(() => import("@/pages/supplier/dashboard"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierDashboardComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/supplier/profile">
            {() => {
              const SupplierProfileComponent = lazy(() => import("@/pages/supplier/profile"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierProfileComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/supplier/rfqs">
            {() => {
              const SupplierRFQsComponent = lazy(() => import("@/pages/supplier/rfqs"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierRFQsComponent />
                </Suspense>
              );
            }}
          </Route>

          <Route path="/supplier/quotes">
            {() => {
              const SupplierQuotesComponent = lazy(() => import("@/pages/supplier/quotes"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierQuotesComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/supplier/purchase-orders">
            {() => {
              const SupplierPurchaseOrdersComponent = lazy(() => import("@/pages/supplier/purchase-orders"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierPurchaseOrdersComponent />
                </Suspense>
              );
            }}
          </Route>
          <Route path="/supplier/messages">
            {() => {
              const SupplierMessagesComponent = lazy(() => import("@/pages/supplier/messages"));
              return (
                <Suspense fallback={<PageLoader />}>
                  <SupplierMessagesComponent />
                </Suspense>
              );
            }}
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;