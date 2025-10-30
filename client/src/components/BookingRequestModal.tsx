import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const bookingFormSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters"),
  proposedPrice: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  truckId: number;
  eventTitle: string;
  truckName: string;
}

export function BookingRequestModal({
  open,
  onOpenChange,
  eventId,
  truckId,
  eventTitle,
  truckName,
}: BookingRequestModalProps) {
  const { toast } = useToast();
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      message: "",
      proposedPrice: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      return await apiRequest("POST", "/api/bookings", {
        truckId,
        eventId,
        message: data.message,
        proposedPrice: data.proposedPrice || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-truck-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-event-bookings"] });
      toast({
        title: "Booking Request Sent!",
        description: "The event organizer will review your application.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send booking request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: BookingFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">Send Booking Request</DialogTitle>
          <DialogDescription>
            Apply to provide catering for <span className="font-semibold">{eventTitle}</span> with{" "}
            <span className="font-semibold">{truckName}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Message <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Introduce your food truck and explain why you'd be a great fit for this event..."
                      rows={5}
                      data-testid="input-booking-message"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tell the organizer about your food truck, menu offerings, and experience
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proposedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Pricing (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., $500 flat fee or $15 per person"
                      data-testid="input-proposed-price"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide your pricing structure or rates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={mutation.isPending}
                data-testid="button-cancel-booking"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-booking">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
