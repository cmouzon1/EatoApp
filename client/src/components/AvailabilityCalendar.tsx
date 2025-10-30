import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { TruckUnavailability } from "@shared/schema";

interface AvailabilityCalendarProps {
  truckId: number;
  isOwner: boolean;
}

export function AvailabilityCalendar({ truckId, isOwner }: AvailabilityCalendarProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");

  const { data: unavailability, isLoading } = useQuery<TruckUnavailability[]>({
    queryKey: [`/api/trucks/${truckId}/unavailability`],
  });

  const addMutation = useMutation({
    mutationFn: async ({ date, reason }: { date: Date; reason?: string }) => {
      return apiRequest("POST", `/api/trucks/${truckId}/unavailability`, {
        blockedDate: date.toISOString(),
        reason: reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trucks/${truckId}/unavailability`] });
      setSelectedDate(undefined);
      setReason("");
      toast({
        title: "Date blocked",
        description: "The date has been marked as unavailable.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to block date. Please try again.",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/unavailability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trucks/${truckId}/unavailability`] });
      toast({
        title: "Date unblocked",
        description: "The date is now available again.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unblock date. Please try again.",
      });
    },
  });

  const blockedDates = unavailability?.map((u) => new Date(u.blockedDate)) || [];

  const handleDateSelect = (date: Date | undefined) => {
    if (!isOwner || !date) return;
    setSelectedDate(date);
  };

  const handleAddUnavailability = () => {
    if (!selectedDate) return;
    addMutation.mutate({ date: selectedDate, reason });
  };

  const handleRemoveUnavailability = (id: number) => {
    removeMutation.mutate(id);
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(
      (blocked) =>
        blocked.getFullYear() === date.getFullYear() &&
        blocked.getMonth() === date.getMonth() &&
        blocked.getDate() === date.getDate()
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <CardTitle>Availability Calendar</CardTitle>
        </div>
        <CardDescription>
          {isOwner
            ? "Click on dates to mark them as unavailable for bookings"
            : "View truck availability for catering bookings"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={!isOwner || addMutation.isPending}
            modifiers={{
              blocked: blockedDates,
            }}
            modifiersClassNames={{
              blocked: "bg-destructive/20 text-destructive line-through hover:bg-destructive/30",
            }}
            className="rounded-md border"
            data-testid="availability-calendar"
          />
        </div>

        {isOwner && selectedDate && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="block-reason">
                Blocking: {selectedDate.toLocaleDateString()}
              </Label>
              <Input
                id="block-reason"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={addMutation.isPending}
                data-testid="input-block-reason"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddUnavailability}
                disabled={addMutation.isPending}
                data-testid="button-block-date"
              >
                {addMutation.isPending ? "Blocking..." : "Block Date"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(undefined);
                  setReason("");
                }}
                disabled={addMutation.isPending}
                data-testid="button-cancel-block"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isOwner && unavailability && unavailability.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Blocked Dates</h4>
            <div className="space-y-2">
              {unavailability.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-md"
                  data-testid={`blocked-date-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {new Date(item.blockedDate).toLocaleDateString()}
                    </p>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveUnavailability(item.id)}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-${item.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
