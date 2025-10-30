import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Event as EventType, Truck as TruckType } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingRequestModal } from "@/components/BookingRequestModal";
import { ArrowLeft, Calendar, MapPin, Users, Truck, DollarSign } from "lucide-react";
import { format } from "date-fns";
import placeholderEvent from "@assets/generated_images/Corporate_event_venue_b6ed369b.png";

export default function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const eventId = params?.id ? parseInt(params.id) : null;
  const { user, isAuthenticated, isTruckOwner } = useAuth();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<number | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery<EventType>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const { data: userTrucks } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks/my-trucks"],
    enabled: isAuthenticated && isTruckOwner,
  });

  if (eventLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="aspect-video w-full mb-8 rounded-lg" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-20 w-full mb-8" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
        <Button asChild>
          <Link href="/events">Browse All Events</Link>
        </Button>
      </div>
    );
  }

  const mainImage = event.images?.[0] || placeholderEvent;
  const eventDate = event.date ? new Date(event.date) : null;

  const handleBooking = (truckId: number) => {
    setSelectedTruckId(truckId);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>

        {/* Main Image */}
        <div className="aspect-video w-full rounded-lg overflow-hidden mb-8 bg-muted">
          <img
            src={mainImage}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold font-heading" data-testid="text-event-title">
                  {event.title}
                </h1>
                {event.eventType && (
                  <Badge variant="secondary" className="rounded-full capitalize">
                    {event.eventType}
                  </Badge>
                )}
              </div>

              {event.description && (
                <p className="text-lg text-muted-foreground">{event.description}</p>
              )}
            </div>

            {/* Event Details */}
            <Card>
              <CardContent className="p-6 grid sm:grid-cols-2 gap-4">
                {eventDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-muted-foreground">
                        {format(eventDate, "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                )}
                {event.expectedHeadcount && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Expected Attendees</p>
                      <p className="text-muted-foreground">{event.expectedHeadcount} people</p>
                    </div>
                  </div>
                )}
                {event.trucksNeeded && (
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Trucks Needed</p>
                      <p className="text-muted-foreground">{event.trucksNeeded} trucks</p>
                    </div>
                  </div>
                )}
                {event.budget && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Budget</p>
                      <p className="text-muted-foreground">{event.budget}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cuisines Needed */}
            {event.cuisinesNeeded && event.cuisinesNeeded.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 font-heading">Cuisines Requested</h2>
                <div className="flex flex-wrap gap-2">
                  {event.cuisinesNeeded.map((cuisine, index) => (
                    <Badge key={index} variant="outline" className="text-base px-4 py-2 rounded-full">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking */}
          <div className="space-y-6">
            {isTruckOwner && userTrucks && userTrucks.length > 0 ? (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Apply with Your Truck</h3>
                  <p className="text-sm text-muted-foreground">
                    Select one of your trucks to send a booking request
                  </p>
                  <div className="space-y-2">
                    {userTrucks.map((truck) => (
                      <Button
                        key={truck.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleBooking(truck.id)}
                        data-testid={`button-apply-truck-${truck.id}`}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        {truck.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : !isAuthenticated ? (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Interested?</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in to apply for this event with your food truck
                  </p>
                  <Button className="w-full" asChild data-testid="button-sign-in">
                    <a href="/api/login">Sign In to Apply</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Apply for This Event</h3>
                  <p className="text-sm text-muted-foreground">
                    You need to set up a truck profile to apply for events
                  </p>
                  <Button className="w-full" asChild>
                    <Link href="/dashboard/truck">Create Truck Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {selectedTruckId && (
        <BookingRequestModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          eventId={event.id}
          truckId={selectedTruckId}
          eventTitle={event.title}
          truckName={userTrucks?.find(t => t.id === selectedTruckId)?.name || ""}
        />
      )}
    </div>
  );
}
