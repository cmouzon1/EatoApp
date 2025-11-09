import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, MapPin, Heart, Bell } from "lucide-react";
import { type Truck } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import placeholderTruck from "@assets/generated_images/Orange_food_truck_exterior_7079da09.png";

interface TruckCardProps {
  truck: Truck;
}

export function TruckCard({ truck }: TruckCardProps) {
  const imageUrl = truck.images?.[0] || placeholderTruck;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch user's favorites
  const { data: favorites } = useQuery<{ id: number; truckId: number }[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  // Fetch user's follows
  const { data: follows } = useQuery<{ id: number; truckId: number; alertsEnabled: boolean }[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
  });

  const isFavorited = favorites?.some(f => f.truckId === truck.id);
  const followData = follows?.find(f => f.truckId === truck.id);
  const isFollowing = !!followData;

  // Toggle favorite
  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        const favorite = favorites?.find(f => f.truckId === truck.id);
        if (favorite) {
          return apiRequest("DELETE", `/api/favorites/${favorite.id}`);
        }
      } else {
        return apiRequest("POST", "/api/favorites", { truckId: truck.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited 
          ? `${truck.name} removed from your favorites` 
          : `${truck.name} added to your favorites`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle follow
  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing && followData) {
        return apiRequest("DELETE", `/api/follows/${followData.id}`);
      } else {
        return apiRequest("POST", "/api/follows", { truckId: truck.id, alertsEnabled: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing 
          ? `You unfollowed ${truck.name}` 
          : `You're now following ${truck.name}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to favorite trucks",
        variant: "destructive",
      });
      return;
    }
    favoriteMutation.mutate();
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow trucks",
        variant: "destructive",
      });
      return;
    }
    followMutation.mutate();
  };
  
  return (
    <Link href={`/trucks/${truck.id}`}>
      <Card
        className="overflow-hidden hover-elevate transition-all duration-300 cursor-pointer group"
        data-testid={`card-truck-${truck.id}`}
      >
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={truck.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {truck.isActive && (
            <Badge className="absolute top-3 right-3 bg-green-500 text-white border-0">
              Available
            </Badge>
          )}
          {isAuthenticated && (
            <div className="absolute top-3 left-3 flex gap-2">
              <Button
                size="icon"
                variant={isFavorited ? "default" : "secondary"}
                className="h-8 w-8 rounded-full"
                onClick={handleFavorite}
                disabled={favoriteMutation.isPending}
                data-testid={`button-favorite-${truck.id}`}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant={isFollowing ? "default" : "secondary"}
                className="h-8 w-8 rounded-full"
                onClick={handleFollow}
                disabled={followMutation.isPending}
                data-testid={`button-follow-${truck.id}`}
              >
                <Bell className={`h-4 w-4 ${isFollowing ? "fill-current" : ""}`} />
              </Button>
            </div>
          )}
        </div>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold font-heading mb-1" data-testid={`text-truck-name-${truck.id}`}>
                {truck.name}
              </h3>
              {truck.cuisine && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {truck.cuisine}
                </Badge>
              )}
            </div>

            {truck.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {truck.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {truck.hours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{truck.hours}</span>
                </div>
              )}
              {truck.priceRange && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span>{truck.priceRange}</span>
                </div>
              )}
              {truck.lat && truck.lng && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>Location Available</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
