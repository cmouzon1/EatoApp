import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Event as EventType } from "@shared/schema";
import { EventCard } from "@/components/EventCard";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InteractiveMap } from "@/components/InteractiveMap";
import { Calendar, Map, Grid3X3 } from "lucide-react";

const eventTypeFilters = [
  "Corporate",
  "Festival",
  "Wedding",
  "Private",
  "Community",
  "Fundraiser",
];

export default function BrowseEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const { data: events, isLoading } = useQuery<EventType[]>({
    queryKey: ["/api/events", searchQuery, selectedTypes],
  });

  const filteredEvents = events?.filter((event) => {
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedTypes.length === 0 ||
      (event.eventType && selectedTypes.some(t => 
        event.eventType!.toLowerCase() === t.toLowerCase()
      ));

    return matchesSearch && matchesType && event.isActive;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/30 border-b sticky top-16 z-40">
        <div className="container mx-auto px-4 py-6">
          <SearchBar
            onSearch={setSearchQuery}
            onFilterChange={setSelectedTypes}
            filterOptions={eventTypeFilters}
            placeholder="Search events by name, location, or description..."
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">
              Find Events
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              data-testid="button-map-view"
            >
              <Map className="h-4 w-4 mr-2" />
              Map
            </Button>
          </div>
        </div>

        {viewMode === "map" ? (
          isLoading ? (
            <Skeleton className="h-[600px] w-full rounded-lg" />
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <InteractiveMap events={filteredEvents} />
          ) : (
            <div className="text-center py-20">
              <Calendar className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedTypes.length > 0
                  ? "Try adjusting your search or filters"
                  : "No events available at the moment"}
              </p>
            </div>
          )
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Calendar className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedTypes.length > 0
                ? "Try adjusting your search or filters"
                : "No events available at the moment"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
