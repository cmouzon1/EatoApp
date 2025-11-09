import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Truck as TruckType, User, Schedule, Update } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { ArrowLeft, Clock, DollarSign, MapPin, Phone, Globe, Instagram, Facebook, Calendar, Megaphone } from "lucide-react";
import { format } from "date-fns";
import placeholderTruck from "@assets/generated_images/Orange_food_truck_exterior_7079da09.png";
import placeholderFood from "@assets/generated_images/Gourmet_tacos_close-up_f3279562.png";

export default function TruckDetail() {
  const [, params] = useRoute("/trucks/:id");
  const truckId = params?.id ? parseInt(params.id) : null;

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: truck, isLoading } = useQuery<TruckType>({
    queryKey: [`/api/trucks/${truckId}`],
    enabled: !!truckId,
  });

  const { data: schedules } = useQuery<Schedule[]>({
    queryKey: [`/api/schedules?truckId=${truckId}`],
    enabled: !!truckId,
  });

  const { data: updates } = useQuery<Update[]>({
    queryKey: [`/api/updates?truckId=${truckId}`],
    enabled: !!truckId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="aspect-video w-full mb-8 rounded-lg" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-20 w-full mb-8" />
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Truck Not Found</h2>
        <Button asChild>
          <Link href="/trucks">Browse All Trucks</Link>
        </Button>
      </div>
    );
  }

  const mainImage = truck.images?.[0] || placeholderTruck;
  const menuItems = (truck.menuItems as any[]) || [];
  const socialLinks = (truck.socialLinks as any) || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
          <Link href="/trucks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trucks
          </Link>
        </Button>

        {/* Main Image */}
        <div className="aspect-video w-full rounded-lg overflow-hidden mb-8 bg-muted">
          <img
            src={mainImage}
            alt={truck.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold font-heading" data-testid="text-truck-name">
                  {truck.name}
                </h1>
                {truck.isActive && (
                  <Badge className="bg-green-500 text-white">Available</Badge>
                )}
                {truck.cuisine && (
                  <Badge variant="secondary" className="rounded-full">{truck.cuisine}</Badge>
                )}
              </div>

              {truck.description && (
                <p className="text-lg text-muted-foreground">{truck.description}</p>
              )}
            </div>

            {/* Key Info */}
            <Card>
              <CardContent className="p-6 grid sm:grid-cols-2 gap-4">
                {truck.hours && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Hours</p>
                      <p className="text-muted-foreground">{truck.hours}</p>
                    </div>
                  </div>
                )}
                {truck.priceRange && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Price Range</p>
                      <p className="text-muted-foreground">{truck.priceRange}</p>
                    </div>
                  </div>
                )}
                {truck.lat && truck.lng && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">View on Map</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Menu */}
            {menuItems.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 font-heading">Menu</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {menuItems.map((item: any, index: number) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="aspect-square relative bg-muted">
                        <img
                          src={item.imageUrl || placeholderFood}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.price && (
                            <span className="font-medium text-primary">${item.price}</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Schedule */}
            {schedules && schedules.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 font-heading flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Where to Find Us
                </h2>
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} data-testid={`schedule-${schedule.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{schedule.location}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(schedule.date), "EEEE, MMMM d, yyyy")}
                            </p>
                            {schedule.startTime && schedule.endTime && (
                              <p className="text-sm text-muted-foreground">
                                {schedule.startTime} - {schedule.endTime}
                              </p>
                            )}
                            {schedule.notes && (
                              <p className="text-sm mt-2">{schedule.notes}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Updates & Announcements */}
            {updates && updates.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 font-heading flex items-center gap-2">
                  <Megaphone className="h-6 w-6" />
                  Latest Updates
                </h2>
                <div className="space-y-3">
                  {updates.map((update) => (
                    <Card key={update.id} data-testid={`update-${update.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{update.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {format(new Date(update.createdAt), "MMMM d, yyyy")}
                            </p>
                            <p className="text-sm">{update.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Book This Truck</h3>
                <p className="text-sm text-muted-foreground">
                  Browse available events and send a booking request to connect with event organizers.
                </p>
                <Button className="w-full" asChild data-testid="button-browse-events">
                  <Link href="/events">Browse Events</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Availability Calendar */}
            {truckId && (
              <AvailabilityCalendar 
                truckId={truckId} 
                isOwner={user?.id === truck.ownerId} 
              />
            )}

            {/* Social Links */}
            {(socialLinks.website || socialLinks.instagram || socialLinks.facebook) && (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold">Connect</h3>
                  <div className="space-y-2">
                    {socialLinks.website && (
                      <a
                        href={socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    )}
                    {socialLinks.facebook && (
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
