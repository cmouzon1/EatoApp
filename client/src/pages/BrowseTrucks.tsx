import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck as TruckType } from "@shared/schema";
import { TruckCard } from "@/components/TruckCard";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck } from "lucide-react";

const cuisineFilters = [
  "Mexican",
  "Asian",
  "BBQ",
  "Italian",
  "American",
  "Mediterranean",
  "Desserts",
  "Vegan",
];

export default function BrowseTrucks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const { data: trucks, isLoading } = useQuery<TruckType[]>({
    queryKey: ["/api/trucks", searchQuery, selectedCuisines],
  });

  const filteredTrucks = trucks?.filter((truck) => {
    const matchesSearch = !searchQuery || 
      truck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCuisine = selectedCuisines.length === 0 ||
      (truck.cuisine && selectedCuisines.some(c => 
        truck.cuisine!.toLowerCase().includes(c.toLowerCase())
      ));

    return matchesSearch && matchesCuisine;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/30 border-b sticky top-16 z-40">
        <div className="container mx-auto px-4 py-6">
          <SearchBar
            onSearch={setSearchQuery}
            onFilterChange={setSelectedCuisines}
            filterOptions={cuisineFilters}
            placeholder="Search food trucks by name, cuisine, or description..."
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Truck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold font-heading">
            Browse Food Trucks
          </h1>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredTrucks && filteredTrucks.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTrucks.map((truck) => (
              <TruckCard key={truck.id} truck={truck} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Truck className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Trucks Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCuisines.length > 0
                ? "Try adjusting your search or filters"
                : "No food trucks available at the moment"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
