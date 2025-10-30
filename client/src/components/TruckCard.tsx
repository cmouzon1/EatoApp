import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, MapPin } from "lucide-react";
import { type Truck } from "@shared/schema";
import placeholderTruck from "@assets/generated_images/Orange_food_truck_exterior_7079da09.png";

interface TruckCardProps {
  truck: Truck;
}

export function TruckCard({ truck }: TruckCardProps) {
  const imageUrl = truck.images?.[0] || placeholderTruck;
  
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
