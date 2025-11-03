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
      const response = await apiRequest("POST", "/api/subscription/create-checkout-session", { tier });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
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

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTier = subscriptionStatus?.tier || 'basic';
  const isActive = subscriptionStatus?.status === 'active';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Select the perfect subscription tier for your food truck business
          </p>
        </div>

        {isActive && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-700 dark:text-green-300">
              You are currently subscribed to the <strong>{currentTier}</strong> plan
            </p>
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
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$9</span>
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
              <CardDescription>For professional food truck operators</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$29</span>
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
