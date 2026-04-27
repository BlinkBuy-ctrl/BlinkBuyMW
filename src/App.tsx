import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useScrollToTop } from "@/hooks/useScrollToTop";

// ── Lazy-load all pages for code splitting ──────────────────────────────────
const Home             = lazy(() => import("@/pages/home"));
const LoginPage        = lazy(() => import("@/pages/login"));
const RegisterPage     = lazy(() => import("@/pages/register"));
const ServicesPage     = lazy(() => import("@/pages/services"));
const ServiceDetailPage= lazy(() => import("@/pages/service-detail"));
const JobsPage         = lazy(() => import("@/pages/jobs"));
const JobDetailPage    = lazy(() => import("@/pages/job-detail"));
const MarketplacePage  = lazy(() => import("@/pages/marketplace"));
const MarketplaceDetail= lazy(() => import("@/pages/marketplace-detail"));
const EmergencyPage    = lazy(() => import("@/pages/emergency"));
const MessagesPage     = lazy(() => import("@/pages/messages"));
const ProfilePage      = lazy(() => import("@/pages/profile"));
const DashboardPage    = lazy(() => import("@/pages/dashboard"));
const SettingsPage     = lazy(() => import("@/pages/settings"));
const PostServicePage  = lazy(() => import("@/pages/post-service"));
const PostJobPage      = lazy(() => import("@/pages/post-job"));
const PostItemPage     = lazy(() => import("@/pages/post-item"));
const NotificationsPage= lazy(() => import("@/pages/notifications"));
const AdminPage        = lazy(() => import("@/pages/admin"));
const AboutPage        = lazy(() => import("@/pages/about"));
const NotFound         = lazy(() => import("@/pages/not-found"));

// ── Optimized QueryClient with caching & retry config ────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      retryDelay: 2000,
      refetchOnWindowFocus: false,
      // Never let a query stay loading forever
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 0,
    },
  },
});

// Global error handler — prevent unhandled rejections from freezing UI
queryClient.getQueryCache().config.onError = (error: any) => {
  console.error("[QueryCache]", error?.message || error);
};

const BARE_ROUTES = ["/login", "/register"];

// ── Page loader skeleton ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center animate-pulse">
          <span className="text-white font-black text-sm">B</span>
        </div>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function RouterContent() {
  const [loc] = useLocation();
  const isBare = BARE_ROUTES.includes(loc);

  // ── Fix: scroll to top on every navigation ──────────────────────────────
  useScrollToTop();

  const routes = (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"              component={Home} />
        <Route path="/login"         component={LoginPage} />
        <Route path="/register"      component={RegisterPage} />
        <Route path="/services"      component={ServicesPage} />
        <Route path="/services/:id"  component={ServiceDetailPage} />
        <Route path="/jobs"          component={JobsPage} />
        <Route path="/jobs/:id"      component={JobDetailPage} />
        <Route path="/marketplace"   component={MarketplacePage} />
        <Route path="/marketplace/:id" component={MarketplaceDetail} />
        <Route path="/emergency"     component={EmergencyPage} />
        <Route path="/messages"      component={MessagesPage} />
        <Route path="/messages/:id"  component={MessagesPage} />
        <Route path="/profile/:id"   component={ProfilePage} />
        <Route path="/dashboard"     component={DashboardPage} />
        <Route path="/settings"      component={SettingsPage} />
        <Route path="/post-service"  component={PostServicePage} />
        <Route path="/post-job"      component={PostJobPage} />
        <Route path="/post-item"     component={PostItemPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/admin"         component={AdminPage} />
        <Route path="/about"         component={AboutPage} />
        <Route                       component={NotFound} />
      </Switch>
    </Suspense>
  );

  if (isBare) return routes;
  return <Layout>{routes}</Layout>;
}

function App() {
  const auth = useAuthState();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>
          <TooltipProvider>
            <WouterRouter base="">
              <RouterContent />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
