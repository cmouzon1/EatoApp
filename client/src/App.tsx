import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import Landing from "@/pages/Landing";
import BrowseTrucks from "@/pages/BrowseTrucks";
import BrowseEvents from "@/pages/BrowseEvents";
import TruckDetail from "@/pages/TruckDetail";
import EventDetail from "@/pages/EventDetail";
import TruckDashboard from "@/pages/TruckDashboard";
import OrganizerDashboard from "@/pages/OrganizerDashboard";
import Profile from "@/pages/Profile";
import PaymentCheckout from "@/pages/PaymentCheckout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Subscription from "@/pages/Subscription";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={BrowseTrucks} />
        </>
      )}
      
      <Route path="/trucks" component={BrowseTrucks} />
      <Route path="/trucks/:id" component={TruckDetail} />
      <Route path="/events" component={BrowseEvents} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/dashboard/truck" component={TruckDashboard} />
      <Route path="/dashboard/organizer" component={OrganizerDashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/payment-checkout" component={PaymentCheckout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/subscription-success" component={SubscriptionSuccess} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-1">
            <Router />
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
