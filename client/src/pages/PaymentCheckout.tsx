// Reference: blueprint:javascript_stripe for Stripe integration
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import type { Booking, Truck, Event } from '@shared/schema';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
  bookingId: number;
  onSuccess: () => void;
}

const CheckoutForm = ({ bookingId, onSuccess }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?bookingId=${bookingId}`,
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        data-testid="button-submit-payment"
      >
        {isProcessing ? "Processing..." : "Pay Deposit"}
      </Button>
    </form>
  );
};

export default function PaymentCheckout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Get booking ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('bookingId');
    if (id) {
      setBookingId(parseInt(id));
    } else {
      toast({
        title: "Error",
        description: "No booking ID provided",
        variant: "destructive",
      });
      setLocation('/dashboard');
    }
  }, []);

  // Fetch booking details
  const { data: bookingData, isLoading: isLoadingBooking } = useQuery<{
    booking: Booking;
    truck: Truck;
    event: Event;
  }>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  });

  // Create payment intent (server calculates amount)
  useEffect(() => {
    if (!bookingId || !bookingData) return;

    apiRequest("POST", "/api/create-payment-intent", { 
      bookingId 
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
        console.error('Payment intent error:', error);
      });
  }, [bookingId, bookingData]);

  if (isLoadingBooking || !bookingData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  const { booking, truck, event } = bookingData;
  // Calculate display amount (matches server calculation)
  let depositAmount = 100;
  if (booking.proposedPrice) {
    const price = parseFloat(booking.proposedPrice.replace(/[^0-9.]/g, ''));
    if (!isNaN(price) && price > 0) {
      depositAmount = price * 0.25;
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Booking Deposit</h1>
          <p className="text-muted-foreground">
            Secure your booking with {truck.name} for {event.title}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
            <CardDescription>Review the details before completing payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Food Truck:</span>
                <span className="font-medium">{truck.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event:</span>
                <span className="font-medium">{event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event Date:</span>
                <span className="font-medium">
                  {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                </span>
              </div>
              {booking.proposedPrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price:</span>
                  <span className="font-medium">{booking.proposedPrice}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Deposit Amount:</span>
                <span>${depositAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Enter your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                bookingId={bookingId!} 
                onSuccess={() => {
                  toast({
                    title: "Payment Successful",
                    description: "Your booking deposit has been processed",
                  });
                  setLocation('/dashboard');
                }}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
