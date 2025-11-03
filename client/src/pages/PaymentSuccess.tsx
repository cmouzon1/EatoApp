import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(true);
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('bookingId');
  const paymentIntentId = params.get('payment_intent');

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentIntentId) {
        setIsConfirming(false);
        return;
      }

      try {
        await apiRequest("POST", "/api/confirm-payment", { paymentIntentId });
        
        // Invalidate booking queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
        
        setIsConfirming(false);
      } catch (error) {
        console.error('Payment confirmation error:', error);
        toast({
          title: "Warning",
          description: "Payment succeeded but confirmation is pending. Your booking will be updated shortly.",
        });
        setIsConfirming(false);
      }
    };

    confirmPayment();
  }, [paymentIntentId]);

  if (isConfirming) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Confirming payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your booking deposit has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              You'll receive a confirmation email shortly with all the details of your booking.
            </p>
            <p className="text-sm text-muted-foreground">
              The food truck owner will be notified and will coordinate with you about the final details.
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/dashboard')} 
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
