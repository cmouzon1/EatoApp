import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Event as EventType, Booking as BookingType, Truck as TruckType, Invite as InviteType, insertInviteSchema } from "@shared/schema";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Plus, Truck, CheckCircle, X, Check, CreditCard, Crown, Sparkles, UserPlus, Send } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function OrganizerDashboard() {
  const { user, isAuthenticated, isLoading, subscription } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: events, isLoading: eventsLoading } = useQuery<EventType[]>({
    queryKey: ["/api/events/my-events"],
    enabled: isAuthenticated,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<(BookingType & { truck: TruckType; event: EventType })[]>({
    queryKey: ["/api/bookings/my-event-bookings"],
    enabled: isAuthenticated,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-event-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my-truck-bookings"] });
      toast({
        title: "Status Updated",
        description: "Booking status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking status",
        variant: "destructive",
      });
    },
  });

  if (isLoading || eventsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: "bg-amber-500",
    accepted: "bg-green-500",
    declined: "bg-gray-500",
    completed: "bg-blue-500",
  };

  const pendingCount = bookings?.filter(b => b.status === "pending").length || 0;
  const acceptedCount = bookings?.filter(b => b.status === "accepted").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="h-10 w-10 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">
              My Events
            </h1>
          </div>
          <Button asChild data-testid="button-create-event">
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Subscription Prompt */}
        {(!subscription || subscription.status !== 'active') && (
          <Alert className="mb-8 border-primary/50 bg-primary/5" data-testid="alert-subscription-prompt">
            <Crown className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Unlock Premium Event Features
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-muted-foreground">
                You're currently using the free tier. Upgrade to access premium features like:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Unlimited event listings</li>
                <li>Priority access to top-rated food trucks</li>
                <li>Advanced event analytics and attendee insights</li>
                <li>Automated vendor matching recommendations</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild data-testid="button-view-subscription">
                  <Link href="/subscription">
                    <Crown className="mr-2 h-4 w-4" />
                    View Subscription Plans
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/events/new">
                    Continue with Free
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="flex flex-row items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{events?.length || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-row items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Applications</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-row items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Accepted Trucks</p>
                <p className="text-2xl font-bold">{acceptedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* My Events */}
        {events && events.length > 0 ? (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 font-heading">Your Events</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : (
          <Card className="mb-12">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Create your first event to start receiving applications from food trucks
              </p>
              <Button asChild>
                <Link href="/events/new">Create Your First Event</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invite Management */}
        {events && events.length > 0 && <InviteManagement events={events} />}

        {/* Truck Applications */}
        <div>
          <h2 className="text-2xl font-bold mb-6 font-heading">Truck Applications</h2>
          {bookingsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="hover-elevate transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold">{booking.truck.name}</h3>
                          <Badge className={`${statusColors[booking.status]} text-white border-0`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          {booking.truck.cuisine && (
                            <Badge variant="outline" className="rounded-full">
                              {booking.truck.cuisine}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            For: {booking.event.title}
                          </span>
                          {booking.event.date && (
                            <span>
                              {format(new Date(booking.event.date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>

                        {booking.message && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm text-foreground">
                              {booking.message}
                            </p>
                          </div>
                        )}

                        {booking.proposedPrice && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Proposed Pricing:</span>
                            <span className="text-muted-foreground">{booking.proposedPrice}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {booking.status === "pending" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "accepted" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-accept-${booking.id}`}
                            >
                              <Check className="mr-1.5 h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: "declined" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-decline-${booking.id}`}
                            >
                              <X className="mr-1.5 h-4 w-4" />
                              Decline
                            </Button>
                          </>
                        )}
                        
                        {booking.status === "accepted" && booking.paymentStatus !== "paid" && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setLocation(`/payment-checkout?bookingId=${booking.id}`)}
                            data-testid={`button-pay-deposit-${booking.id}`}
                          >
                            <CreditCard className="mr-1.5 h-4 w-4" />
                            Pay Deposit
                          </Button>
                        )}
                        
                        {booking.paymentStatus === "paid" && (
                          <Badge className="bg-green-500 text-white border-0">
                            <CheckCircle className="mr-1.5 h-3 w-3" />
                            Deposit Paid
                          </Badge>
                        )}

                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/trucks/${booking.truck.id}`}>View Truck</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Truck className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground text-center">
                  Food trucks will apply to your events once you create them
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Invite Management Component
function InviteManagement({ events }: { events: EventType[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number>(events[0]?.id || 0);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertInviteSchema>>({
    resolver: zodResolver(insertInviteSchema),
    defaultValues: {
      eventId: selectedEventId,
      truckId: 0,
      status: "pending",
    },
  });

  // Sync form eventId when selectedEventId changes
  useEffect(() => {
    form.setValue("eventId", selectedEventId);
  }, [selectedEventId, form]);

  // Fetch all trucks for invitation
  const { data: allTrucks } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks"],
  });

  // Fetch invites for selected event
  const { data: invites } = useQuery<(InviteType & { truck: TruckType })[]>({
    queryKey: [`/api/invites?eventId=${selectedEventId}`],
    enabled: !!selectedEventId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertInviteSchema>) => {
      return apiRequest("POST", "/api/invites", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invites?eventId=${selectedEventId}`] });
      toast({
        title: "Invite sent",
        description: "Truck has been invited to your event",
      });
      setIsOpen(false);
      form.reset({ eventId: selectedEventId, truckId: 0, status: "pending" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ inviteId, status }: { inviteId: number; status: string }) => {
      return apiRequest("PATCH", `/api/invites/${inviteId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invites?eventId=${selectedEventId}`] });
      toast({
        title: "Invite updated",
        description: "Invite status has been updated",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof insertInviteSchema>) => {
    createMutation.mutate({ ...values, eventId: selectedEventId });
  };

  // Filter out already invited trucks
  const invitedTruckIds = invites?.map(inv => inv.truckId) || [];
  const availableTrucks = allTrucks?.filter(truck => !invitedTruckIds.includes(truck.id)) || [];

  const statusColors: { [key: string]: string } = {
    pending: "bg-amber-500",
    accepted: "bg-green-500",
    declined: "bg-gray-500",
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
          <UserPlus className="h-6 w-6" />
          Invite Trucks
        </h2>
        <div className="flex items-center gap-3">
          {events.length > 1 && (
            <Select value={selectedEventId.toString()} onValueChange={(val) => setSelectedEventId(parseInt(val))}>
              <SelectTrigger className="w-48" data-testid="select-event-invite">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()} data-testid={`select-item-event-${event.id}`}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-send-invite" disabled={availableTrucks.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Send Invite
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-invite">
              <DialogHeader>
                <DialogTitle>Invite Truck to Event</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="truckId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Truck</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(val) => field.onChange(parseInt(val))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-truck-invite">
                              <SelectValue placeholder="Choose a truck to invite" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableTrucks.map((truck) => (
                              <SelectItem key={truck.id} value={truck.id.toString()} data-testid={`select-item-truck-invite-${truck.id}`}>
                                {truck.name} {truck.cuisine && `- ${truck.cuisine}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      data-testid="button-cancel-invite"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-invite"
                    >
                      {createMutation.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Display sent invites */}
      {invites && invites.length > 0 ? (
        <div className="grid gap-4">
          {invites.map((invite) => (
            <Card key={invite.id} className="hover-elevate" data-testid={`invite-card-${invite.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold">{invite.truck.name}</p>
                      {invite.truck.cuisine && (
                        <p className="text-sm text-muted-foreground">{invite.truck.cuisine}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[invite.status]} text-white border-0`}>
                      {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </Badge>
                    <Button variant="outline" size="sm" asChild data-testid={`button-view-truck-${invite.truck.id}`}>
                      <Link href={`/trucks/${invite.truck.id}`}>View Truck</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Send className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              No invites sent yet. Start inviting trucks to your event!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
