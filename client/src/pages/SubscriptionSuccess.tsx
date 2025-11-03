import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const { isTruckOwner } = useAuth();

  useEffect(() => {
    // Invalidate subscription status query to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
  }, []);

  const handleGoToDashboard = () => {
    // Route to appropriate dashboard based on user role
    if (isTruckOwner) {
      setLocation('/dashboard/truck');
    } else {
      setLocation('/dashboard/organizer');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
          <CardDescription>
            Your subscription has been successfully activated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              You now have access to all the features included in your subscription tier.
            </p>
            <p className="text-sm text-muted-foreground">
              You'll receive a confirmation email shortly with your subscription details.
            </p>
          </div>
          <Button 
            onClick={handleGoToDashboard} 
            className="w-full"
            data-testid="button-go-to-dashboard"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
