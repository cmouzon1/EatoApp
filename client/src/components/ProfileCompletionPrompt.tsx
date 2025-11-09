import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function ProfileCompletionPrompt() {
  const [, setLocation] = useLocation();
  const { hasCompletedProfile, isLoading } = useAuth();

  useEffect(() => {
    // If profile is completed, redirect to home
    if (!isLoading && hasCompletedProfile) {
      setLocation("/");
    }
  }, [hasCompletedProfile, isLoading, setLocation]);

  const handleCompleteProfile = () => {
    setLocation("/profile");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserCircle className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription className="text-base">
            Free registration required to access platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">It's completely free to register!</h3>
            <p className="text-sm text-muted-foreground">
              Complete your profile to unlock full access to Eato's marketplace. You can browse food trucks, discover events, and connect with the community.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">What you'll get:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Browse all food trucks and events</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Save your favorite vendors</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Book trucks for your events (as event organizer)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">List your food truck (as truck owner)</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Registration is free. Optional paid subscriptions unlock premium features like analytics and priority placement.
            </p>
          </div>

          <Button 
            onClick={handleCompleteProfile} 
            className="w-full"
            size="lg"
            data-testid="button-complete-profile"
          >
            Complete Profile (Free)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
