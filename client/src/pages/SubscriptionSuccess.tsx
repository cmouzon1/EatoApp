import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardPath, getRoleDisplayName } from "@/lib/navigation";

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const { userRole, subscription } = useAuth();

  useEffect(() => {
    // Invalidate queries to refresh user data with subscription info
    queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, []);

  const handleGoToDashboard = () => {
    // Route to appropriate destination based on user role
    const dashboardPath = getDashboardPath(userRole);
    setLocation(dashboardPath);
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
          {subscription && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Your plan:</span>
              <Badge variant="default" className="text-sm capitalize">
                {subscription.tier}
              </Badge>
            </div>
          )}
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              You now have access to all the features included in your subscription tier as a <strong>{getRoleDisplayName(userRole)}</strong>.
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
            {userRole === "user" ? "Start Browsing" : "Go to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
