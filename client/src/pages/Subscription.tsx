import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SubscriptionStatus = {
  status: string;
  tier: string;
  currentPeriodEnd?: string;
};

// Role-specific pricing
const PRICING = {
  truck_owner: {
    basic: { price: "$49", description: "Starter tools for food trucks" },
    pro: { price: "$149", description: "Advanced tools for fleets and growth" }
  },
  event_organizer: {
    basic: { price: "$49", description: "Perfect for small recurring venues" },
    pro: { price: "$99", description: "Unlimited events and premium features" }
  },
  user: {
    basic: { price: "$4.99", description: "Enhanced discovery features" },
    pro: { price: "$19.99", description: "Pro tools for power users" }
  }
};

export default function Subscription() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to manage subscriptions",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: subscriptionStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: isAuthenticated,
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: string) => {
      console.log("[Subscription] Creating checkout for tier:", tier);
      const response = await apiRequest("POST", "/api/subscription/create-checkout-session", { tier });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Subscription] API error:", response.status, errorData);
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[Subscription] Checkout response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("[Subscription] Success handler called with:", data);
      if (data.url) {
        console.log("[Subscription] Redirecting to:", data.url);
        setIsRedirecting(true);
        window.location.href = data.url;
      } else {
        console.error("[Subscription] No URL in response");
        toast({
          title: "Error",
          description: "No checkout URL received from server",
          variant: "destructive",
        });
        setIsRedirecting(false);
      }
    },
    onError: (error: any) => {
      console.error("[Subscription] Mutation error:", error);
      setIsRedirecting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (tier: string) => {
    createCheckoutMutation.mutate(tier);
  };

  const activateFreeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/activate-free", {});
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to activate free tier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Free tier activated",
        description: "You can now use Eato for free!",
      });
      // Redirect to appropriate dashboard based on user role
      const role = user?.userRole || 'user';
      const dashboardPath = role === 'truck_owner' 
        ? '/dashboard/truck' 
        : role === 'event_organizer' 
        ? '/dashboard/organizer' 
        : '/trucks';
      window.location.href = dashboardPath;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate free tier",
        variant: "destructive",
      });
    },
  });

  const handleContinueFree = () => {
    activateFreeMutation.mutate();
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTier = subscriptionStatus?.tier || 'basic';
  const isActive = subscriptionStatus?.status === 'active';

  // Get role-specific pricing
  const userRole = user?.userRole || 'user';
  const pricing = PRICING[userRole as keyof typeof PRICING] || PRICING.user;

  // Get role display name
  const roleDisplay = {
    truck_owner: "Food Truck",
    event_organizer: "Event Organizer",
    user: "Foodie"
  }[userRole] || "User";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            {roleDisplay} subscription plans tailored for your needs
          </p>
        </div>

        {isActive && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-700 dark:text-green-300">
              You are currently subscribed to the <strong>{currentTier}</strong> plan
            </p>
          </div>
        )}

        {/* Free Tier Option */}
        {!isActive && (
          <Card className="border-2 border-primary">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Continue with Free Tier</h3>
                  <p className="text-muted-foreground">
                    Start using Eato for free! Upgrade anytime to unlock premium features.
                  </p>
                </div>
                <Button
                  onClick={handleContinueFree}
                  disabled={activateFreeMutation.isPending}
                  size="lg"
                  className="w-full max-w-md mx-auto"
                  data-testid="button-continue-free"
                >
                  {activateFreeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    'Continue with Free'
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  No credit card required • Upgrade anytime
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Divider */}
        {!isActive && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">
                Or choose a premium plan
              </span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Basic Plan */}
          <Card className={currentTier === 'basic' && isActive ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Basic</CardTitle>
                {currentTier === 'basic' && isActive && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </div>
              <CardDescription>{pricing.basic.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{pricing.basic.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>List your food truck</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Receive booking requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Basic support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Calendar management</span>
                </li>
              </ul>
              <Button
                className="w-full"
                variant={currentTier === 'basic' && isActive ? "outline" : "default"}
                onClick={() => handleSubscribe('basic')}
                disabled={createCheckoutMutation.isPending || isRedirecting || (currentTier === 'basic' && isActive)}
                data-testid="button-subscribe-basic"
              >
                {createCheckoutMutation.isPending || isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : currentTier === 'basic' && isActive ? (
                  'Current Plan'
                ) : (
                  'Subscribe to Basic'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className={currentTier === 'pro' && isActive ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pro</CardTitle>
                {currentTier === 'pro' && isActive && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </div>
              <CardDescription>{pricing.pro.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{pricing.pro.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Everything in Basic</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Priority listing placement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Featured badge on listings</span>
                </li>
              </ul>
              <Button
                className="w-full"
                variant={currentTier === 'pro' && isActive ? "outline" : "default"}
                onClick={() => handleSubscribe('pro')}
                disabled={createCheckoutMutation.isPending || isRedirecting || (currentTier === 'pro' && isActive)}
                data-testid="button-subscribe-pro"
              >
                {createCheckoutMutation.isPending || isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : currentTier === 'pro' && isActive ? (
                  'Current Plan'
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
