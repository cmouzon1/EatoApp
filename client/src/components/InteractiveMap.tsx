import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "wouter";
import { MapPin, Truck as TruckIcon, Calendar, DollarSign, Users } from "lucide-react";
import type { Truck, Event } from "@shared/schema";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const truckIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <circle cx="16" cy="16" r="15" fill="hsl(25 95% 53%)" stroke="white" stroke-width="2"/>
      <path d="M14 18V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14M17 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4" 
        fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

const eventIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <circle cx="16" cy="16" r="15" fill="hsl(240 4.8% 95.9%)" stroke="white" stroke-width="2"/>
      <rect width="14" height="14" x="9" y="7" rx="2" ry="2" 
        fill="none" stroke="hsl(240 5.9% 10%)" stroke-width="1.5"/>
      <line x1="18" x2="18" y1="5" y2="9" stroke="hsl(240 5.9% 10%)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="14" x2="14" y1="5" y2="9" stroke="hsl(240 5.9% 10%)" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="9" x2="23" y1="13" y2="13" stroke="hsl(240 5.9% 10%)" stroke-width="1.5"/>
    </svg>
  `),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -40],
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useMemo(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

interface InteractiveMapProps {
  trucks?: Truck[];
  events?: Event[];
  className?: string;
}

export function InteractiveMap({ 
  trucks = [], 
  events = [], 
  className = "h-[600px] w-full rounded-lg overflow-hidden shadow-lg"
}: InteractiveMapProps) {
  const markers = useMemo(() => [
    ...(trucks
      .filter(truck => truck.lat && truck.lng)
      .map(truck => ({
        type: "truck" as const,
        position: [truck.lat!, truck.lng!] as [number, number],
        data: truck,
      }))),
    ...(events
      .filter(event => event.lat && event.lng)
      .map(event => ({
        type: "event" as const,
        position: [event.lat!, event.lng!] as [number, number],
        data: event,
      }))),
  ], [trucks, events]);

  const { center, zoom } = useMemo(() => {
    if (markers.length === 0) {
      return { center: [37.7749, -122.4194] as [number, number], zoom: 12 };
    }

    const latitudes = markers.map(m => m.position[0]);
    const longitudes = markers.map(m => m.position[1]);
    const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
    const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
    
    const latDiff = Math.max(...latitudes) - Math.min(...latitudes);
    const lngDiff = Math.max(...longitudes) - Math.min(...longitudes);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let calculatedZoom = 12;
    if (maxDiff > 10) calculatedZoom = 6;
    else if (maxDiff > 5) calculatedZoom = 8;
    else if (maxDiff > 2) calculatedZoom = 10;
    else if (maxDiff > 0.5) calculatedZoom = 11;
    else if (markers.length === 1) calculatedZoom = 14;
    
    return { center: [centerLat, centerLng] as [number, number], zoom: calculatedZoom };
  }, [markers]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      scrollWheelZoom={true}
      data-testid="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />
      
      {markers.map((marker, index) => (
        <Marker
          key={`${marker.type}-${marker.data.id}-${index}`}
          position={marker.position}
          icon={marker.type === "truck" ? truckIcon : eventIcon}
        >
          <Popup maxWidth={300}>
            {marker.type === "truck" ? (
              <TruckPopup truck={marker.data as Truck} />
            ) : (
              <EventPopup event={marker.data as Event} />
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function TruckPopup({ truck }: { truck: Truck }) {
  return (
    <div className="p-2 min-w-[250px]">
      <div className="flex items-start gap-2 mb-2">
        <TruckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-base mb-1">{truck.name}</h3>
          {truck.cuisine && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {truck.cuisine}
            </span>
          )}
        </div>
      </div>
      
      {truck.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {truck.description}
        </p>
      )}
      
      <div className="space-y-1 text-sm mb-3">
        {truck.hours && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{truck.hours}</span>
          </div>
        )}
        {truck.priceRange && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{truck.priceRange}</span>
          </div>
        )}
      </div>
      
      <Link href={`/trucks/${truck.id}`}>
        <a className="text-sm text-primary hover:underline font-medium">
          View Details →
        </a>
      </Link>
    </div>
  );
}

function EventPopup({ event }: { event: Event }) {
  const eventDate = event.date ? new Date(event.date).toLocaleDateString() : null;
  
  return (
    <div className="p-2 min-w-[250px]">
      <div className="flex items-start gap-2 mb-2">
        <Calendar className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-base mb-1">{event.title}</h3>
          {event.eventType && (
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {event.eventType}
            </span>
          )}
        </div>
      </div>
      
      {event.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {event.description}
        </p>
      )}
      
      <div className="space-y-1 text-sm mb-3">
        {event.location && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{event.location}</span>
          </div>
        )}
        {eventDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{eventDate}</span>
          </div>
        )}
        {event.expectedHeadcount && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{event.expectedHeadcount} attendees</span>
          </div>
        )}
      </div>
      
      <Link href={`/events/${event.id}`}>
        <a className="text-sm text-primary hover:underline font-medium">
          View Details →
        </a>
      </Link>
    </div>
  );
}
