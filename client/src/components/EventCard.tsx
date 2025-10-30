import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Truck } from "lucide-react";
import { type Event } from "@shared/schema";
import { format } from "date-fns";
import placeholderEvent from "@assets/generated_images/Corporate_event_venue_b6ed369b.png";

interface EventCardProps {
  event: Event;
  bookingStatus?: "pending" | "accepted" | "declined" | null;
}

export function EventCard({ event, bookingStatus }: EventCardProps) {
  const imageUrl = event.images?.[0] || placeholderEvent;
  const eventDate = event.date ? new Date(event.date) : null;

  const statusColors = {
    pending: "bg-amber-500 text-white",
    accepted: "bg-green-500 text-white",
    declined: "bg-gray-500 text-white",
  };

  return (
    <Link href={`/events/${event.id}`}>
      <Card
        className="overflow-hidden hover-elevate transition-all duration-300 cursor-pointer group"
        data-testid={`card-event-${event.id}`}
      >
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {bookingStatus && (
            <Badge className={`absolute top-3 right-3 border-0 ${statusColors[bookingStatus]}`}>
              {bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1)}
            </Badge>
          )}
        </div>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold font-heading mb-2" data-testid={`text-event-title-${event.id}`}>
                {event.title}
              </h3>
              {event.eventType && (
                <Badge variant="secondary" className="rounded-full text-xs capitalize">
                  {event.eventType}
                </Badge>
              )}
            </div>

            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              {eventDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{format(eventDate, "MMM d, yyyy")}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              {event.expectedHeadcount && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{event.expectedHeadcount} attendees</span>
                </div>
              )}
              {event.trucksNeeded && (
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  <span>{event.trucksNeeded} trucks needed</span>
                </div>
              )}
            </div>

            {event.cuisinesNeeded && event.cuisinesNeeded.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {event.cuisinesNeeded.slice(0, 3).map((cuisine, index) => (
                  <Badge key={index} variant="outline" className="text-xs rounded-full">
                    {cuisine}
                  </Badge>
                ))}
                {event.cuisinesNeeded.length > 3 && (
                  <Badge variant="outline" className="text-xs rounded-full">
                    +{event.cuisinesNeeded.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
