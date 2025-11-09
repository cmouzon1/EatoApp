import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Truck as TruckType, Booking as BookingType, Event as EventType, Schedule, Update } from "@shared/schema";
import { TruckCard } from "@/components/TruckCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Truck, Plus, Calendar, DollarSign, CheckCircle, Crown, Sparkles, BarChart3, Heart, Users, Bell } from "lucide-react";
import { format } from "date-fns";

export default function TruckDashboard() {
  const { user, isAuthenticated, isLoading, isTruckOwner, subscription } = useAuth();
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

  const { data: trucks, isLoading: trucksLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks/my-trucks"],
    enabled: isAuthenticated,
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<(BookingType & { event: EventType; truck: TruckType })[]>({
    queryKey: ["/api/bookings/my-truck-bookings"],
    enabled: isAuthenticated,
  });

  // Get analytics for the first truck (if exists)
  const firstTruckId = trucks?.[0]?.id;
  const { data: analytics } = useQuery<{
    followers: number;
    favorites: number;
    invites: number;
    applications: number;
  }>({
    queryKey: [`/api/truck/analytics?truckId=${firstTruckId}`],
    enabled: !!firstTruckId,
  });

  if (isLoading || trucksLoading) {
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
            <Truck className="h-10 w-10 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">
              My Trucks
            </h1>
          </div>
          <Button asChild data-testid="button-create-truck">
            <Link href="/trucks/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Truck
            </Link>
          </Button>
        </div>

        {/* Subscription Prompt */}
        {(!subscription || subscription.status !== 'active') && (
          <Alert className="mb-8 border-primary/50 bg-primary/5" data-testid="alert-subscription-prompt">
            <Crown className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Unlock Your Full Potential
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-muted-foreground">
                You're currently using the free tier. Upgrade to access premium features like:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                <li>Priority placement in search results</li>
                <li>Advanced analytics and booking insights</li>
                <li>Multiple truck profiles</li>
                <li>Custom branding and promotional tools</li>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild data-testid="button-view-subscription">
                  <Link href="/subscription">
                    <Crown className="mr-2 h-4 w-4" />
                    View Subscription Plans
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/trucks/new">
                    Continue with Free
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trucks?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted Bookings</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{acceptedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-followers">
                {analytics?.followers || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-favorites">
                {analytics?.favorites || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Trucks */}
        {trucks && trucks.length > 0 ? (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 font-heading">Your Trucks</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trucks.map((truck) => (
                <TruckCard key={truck.id} truck={truck} />
              ))}
            </div>
          </div>
        ) : (
          <Card className="mb-12">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trucks Yet</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Create your first truck profile to start receiving booking requests
              </p>
              <Button asChild>
                <Link href="/trucks/new">Create Your First Truck</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Bookings */}
        <div>
          <h2 className="text-2xl font-bold mb-6 font-heading">Booking Requests</h2>
          {bookingsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="hover-elevate transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{booking.event.title}</h3>
                          <Badge className={`${statusColors[booking.status]} text-white border-0`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Truck className="h-4 w-4" />
                            {booking.truck.name}
                          </span>
                          {booking.event.date && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(booking.event.date), "MMM d, yyyy")}
                            </span>
                          )}
                          {booking.proposedPrice && (
                            <span className="flex items-center gap-1.5">
                              <DollarSign className="h-4 w-4" />
                              {booking.proposedPrice}
                            </span>
                          )}
                        </div>
                        {booking.message && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {booking.message}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" asChild>
                        <Link href={`/events/${booking.event.id}`}>View Event</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Booking Requests</h3>
                <p className="text-muted-foreground mb-4 text-center">
                  Browse available events to send booking requests
                </p>
                <Button asChild>
                  <Link href="/events">Browse Events</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
