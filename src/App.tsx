import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ServicesPage from "@/pages/services";
import ServiceDetailPage from "@/pages/service-detail";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import MarketplacePage from "@/pages/marketplace";
import MarketplaceDetailPage from "@/pages/marketplace-detail";
import EmergencyPage from "@/pages/emergency";
import MessagesPage from "@/pages/messages";
import ProfilePage from "@/pages/profile";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import PostServicePage from "@/pages/post-service";
import PostJobPage from "@/pages/post-job";
import PostItemPage from "@/pages/post-item";
import NotificationsPage from "@/pages/notifications";
import AdminPage from "@/pages/admin";
import AboutPage from "@/pages/about";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

const BARE_ROUTES = ["/login", "/register"];

function RouterContent() {
  const [loc] = useLocation();
  const isBare = BARE_ROUTES.includes(loc);

  const routes = (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/services/:id" component={ServiceDetailPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:id" component={JobDetailPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/marketplace/:id" component={MarketplaceDetailPage} />
      <Route path="/emergency" component={EmergencyPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:id" component={MessagesPage} />
      <Route path="/profile/:id" component={ProfilePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/post-service" component={PostServicePage} />
      <Route path="/post-job" component={PostJobPage} />
      <Route path="/post-item" component={PostItemPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );

  if (isBare) return routes;
  return <Layout>{routes}</Layout>;
}

function App() {
  const auth = useAuthState();

  return (
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
  );
}

export default App;
