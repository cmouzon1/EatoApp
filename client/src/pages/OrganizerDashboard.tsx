import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Event as EventType, Booking as BookingType, Truck as TruckType } from "@shared/schema";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, Truck, CheckCircle, X, Check } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function OrganizerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

                      {booking.status === "pending" && (
                        <div className="flex gap-2">
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
                        </div>
                      )}

                      <Button variant="outline" asChild>
                        <Link href={`/trucks/${booking.truck.id}`}>View Truck</Link>
                      </Button>
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
