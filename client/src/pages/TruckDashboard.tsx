import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Truck as TruckType, 
  Booking as BookingType, 
  Event as EventType, 
  Schedule, 
  Update, 
  Invite as InviteType,
  Application as ApplicationType,
  insertScheduleSchema, 
  insertUpdateSchema,
  insertApplicationSchema 
} from "@shared/schema";
import { z } from "zod";

// Extended schema for schedule form to accept string dates from HTML input
const scheduleFormSchema = insertScheduleSchema.extend({
  date: z.coerce.date(),
});
import { TruckCard } from "@/components/TruckCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Plus, Calendar, DollarSign, CheckCircle, Crown, Sparkles, BarChart3, Heart, Users, Bell, Megaphone, MapPin, Trash2, Mail, Send, X, Check } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
        <div className="mb-12">
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

        {/* Received Invites & Applications - only show if truck owner has trucks */}
        {trucks && trucks.length > 0 && <ReceivedInvites trucks={trucks} />}
        {trucks && trucks.length > 0 && <ApplicationManagement trucks={trucks} />}
        
        {/* Schedule & Updates Management - only show if truck owner has trucks */}
        {trucks && trucks.length > 0 && <ScheduleManagement trucks={trucks} />}
        {trucks && trucks.length > 0 && <UpdateManagement trucks={trucks} />}
      </div>
    </div>
  );
}

// Schedule Management Component
function ScheduleManagement({ trucks }: { trucks: TruckType[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<number>(trucks[0]?.id || 0);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      truckId: selectedTruckId,
      location: "",
      date: new Date().toISOString().split('T')[0] as any, // Today's date in YYYY-MM-DD format
      startTime: "09:00",
      endTime: "17:00",
      notes: "",
    },
  });

  // Sync form truckId when selectedTruckId changes
  useEffect(() => {
    form.setValue("truckId", selectedTruckId);
  }, [selectedTruckId, form]);

  const { data: schedules } = useQuery<Schedule[]>({
    queryKey: [`/api/schedules?truckId=${selectedTruckId}`],
    enabled: !!selectedTruckId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof scheduleFormSchema>) => {
      return apiRequest("POST", "/api/schedules", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules?truckId=${selectedTruckId}`] });
      toast({
        title: "Schedule added",
        description: "Your schedule has been added successfully",
      });
      setIsOpen(false);
      form.reset({ truckId: selectedTruckId, location: "", date: "", startTime: "", endTime: "", notes: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest("DELETE", `/api/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules?truckId=${selectedTruckId}`] });
      toast({
        title: "Schedule deleted",
        description: "Schedule has been removed",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof insertScheduleSchema>) => {
    createMutation.mutate({ ...values, truckId: selectedTruckId });
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Schedule
        </h2>
        <div className="flex items-center gap-3">
          {trucks.length > 1 && (
            <Select value={selectedTruckId.toString()} onValueChange={(val) => setSelectedTruckId(parseInt(val))}>
              <SelectTrigger className="w-48" data-testid="select-truck-schedule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id.toString()} data-testid={`select-item-truck-${truck.id}`}>
                    {truck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-schedule">
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-schedule">
              <DialogHeader>
                <DialogTitle>Add Schedule</DialogTitle>
                <DialogDescription>
                  Let customers know where and when they can find you
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main St, Downtown" data-testid="input-schedule-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-schedule-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" value={field.value || ""} data-testid="input-schedule-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="time" value={field.value || ""} data-testid="input-schedule-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} placeholder="Special menu items, parking info, etc." data-testid="input-schedule-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="button-submit-schedule">
                    {createMutation.isPending ? "Adding..." : "Add Schedule"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {schedules && schedules.length > 0 ? (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(schedule.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-schedule-${schedule.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Schedules Yet</h3>
            <p className="text-muted-foreground text-center">
              Add your location schedule so customers know where to find you
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Update Management Component
function UpdateManagement({ trucks }: { trucks: TruckType[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<number>(trucks[0]?.id || 0);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertUpdateSchema>>({
    resolver: zodResolver(insertUpdateSchema),
    defaultValues: {
      truckId: selectedTruckId,
      title: "",
      content: "",
    },
  });

  // Sync form truckId when selectedTruckId changes
  useEffect(() => {
    form.setValue("truckId", selectedTruckId);
  }, [selectedTruckId, form]);

  const { data: updates } = useQuery<Update[]>({
    queryKey: [`/api/updates?truckId=${selectedTruckId}`],
    enabled: !!selectedTruckId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertUpdateSchema>) => {
      return apiRequest("POST", "/api/updates", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/updates?truckId=${selectedTruckId}`] });
      toast({
        title: "Update posted",
        description: "Your update has been posted successfully",
      });
      setIsOpen(false);
      form.reset({ truckId: selectedTruckId, title: "", content: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post update. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (updateId: number) => {
      return apiRequest("DELETE", `/api/updates/${updateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/updates?truckId=${selectedTruckId}`] });
      toast({
        title: "Update deleted",
        description: "Update has been removed",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof insertUpdateSchema>) => {
    createMutation.mutate({ ...values, truckId: selectedTruckId });
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          Updates & Announcements
        </h2>
        <div className="flex items-center gap-3">
          {trucks.length > 1 && (
            <Select value={selectedTruckId.toString()} onValueChange={(val) => setSelectedTruckId(parseInt(val))}>
              <SelectTrigger className="w-48" data-testid="select-truck-update">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id.toString()} data-testid={`select-item-truck-update-${truck.id}`}>
                    {truck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-update">
                <Plus className="mr-2 h-4 w-4" />
                Post Update
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-update">
              <DialogHeader>
                <DialogTitle>Post Update</DialogTitle>
                <DialogDescription>
                  Share news, menu changes, or special announcements with your followers
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="New menu item, special offer, etc." data-testid="input-update-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Tell your followers what's new..." rows={4} data-testid="input-update-content" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createMutation.isPending} className="w-full" data-testid="button-submit-update">
                    {createMutation.isPending ? "Posting..." : "Post Update"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {updates && updates.length > 0 ? (
        <div className="space-y-3">
          {updates.map((update) => (
            <Card key={update.id} data-testid={`card-update-${update.id}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{update.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {format(new Date(update.createdAt), "MMMM d, yyyy")}
                    </p>
                    <p className="text-sm">{update.content}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(update.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-update-${update.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Updates Yet</h3>
            <p className="text-muted-foreground text-center">
              Post updates to keep your followers informed about news and special offers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Received Invites Component
function ReceivedInvites({ trucks }: { trucks: TruckType[] }) {
  const [selectedTruckId, setSelectedTruckId] = useState<number>(trucks[0]?.id || 0);
  const { toast } = useToast();

  // Fetch invites for selected truck
  const { data: invites } = useQuery<(InviteType & { event: EventType })[]>({
    queryKey: [`/api/invites?truckId=${selectedTruckId}`],
    enabled: !!selectedTruckId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ inviteId, status }: { inviteId: number; status: string }) => {
      return apiRequest("PATCH", `/api/invites/${inviteId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invites?truckId=${selectedTruckId}`] });
      toast({
        title: "Invite updated",
        description: "Invite status has been updated",
      });
    },
  });

  const statusColors: { [key: string]: string } = {
    pending: "bg-amber-500",
    accepted: "bg-green-500",
    declined: "bg-gray-500",
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
          <Mail className="h-6 w-6" />
          Received Invites
        </h2>
        {trucks.length > 1 && (
          <Select value={selectedTruckId.toString()} onValueChange={(val) => setSelectedTruckId(parseInt(val))}>
            <SelectTrigger className="w-48" data-testid="select-truck-invites">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trucks.map((truck) => (
                <SelectItem key={truck.id} value={truck.id.toString()} data-testid={`select-item-truck-invites-${truck.id}`}>
                  {truck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {invites && invites.length > 0 ? (
        <div className="grid gap-4">
          {invites.map((invite) => (
            <Card key={invite.id} className="hover-elevate" data-testid={`invite-card-${invite.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{invite.event.title}</h3>
                      <Badge className={`${statusColors[invite.status]} text-white border-0`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </Badge>
                    </div>
                    {invite.event.date && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(invite.event.date), "MMMM d, yyyy")}
                      </p>
                    )}
                    {invite.event.location && (
                      <p className="text-sm text-muted-foreground">
                        {invite.event.location}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {invite.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ inviteId: invite.id, status: "accepted" })}
                          disabled={updateMutation.isPending}
                          data-testid={`button-accept-invite-${invite.id}`}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMutation.mutate({ inviteId: invite.id, status: "declined" })}
                          disabled={updateMutation.isPending}
                          data-testid={`button-decline-invite-${invite.id}`}
                        >
                          <X className="mr-1.5 h-4 w-4" />
                          Decline
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild data-testid={`button-view-event-${invite.event.id}`}>
                      <Link href={`/events/${invite.event.id}`}>View Event</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              No invites yet. Event organizers can invite you to their events!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Application Management Component
function ApplicationManagement({ trucks }: { trucks: TruckType[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<number>(trucks[0]?.id || 0);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertApplicationSchema>>({
    resolver: zodResolver(insertApplicationSchema),
    defaultValues: {
      truckId: selectedTruckId,
      eventId: 0,
      note: "",
      status: "applied",
    },
  });

  // Sync form truckId when selectedTruckId changes
  useEffect(() => {
    form.setValue("truckId", selectedTruckId);
  }, [selectedTruckId, form]);

  // Fetch all events for application
  const { data: allEvents } = useQuery<EventType[]>({
    queryKey: ["/api/events"],
  });

  // Fetch applications for selected truck
  const { data: applications } = useQuery<(ApplicationType & { event: EventType })[]>({
    queryKey: [`/api/applications?truckId=${selectedTruckId}`],
    enabled: !!selectedTruckId,
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertApplicationSchema>) => {
      return apiRequest("POST", "/api/applications", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/applications?truckId=${selectedTruckId}`] });
      toast({
        title: "Application submitted",
        description: "Your application has been submitted to the event",
      });
      setIsOpen(false);
      form.reset({ truckId: selectedTruckId, eventId: 0, note: "", status: "applied" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof insertApplicationSchema>) => {
    createMutation.mutate({ ...values, truckId: selectedTruckId });
  };

  // Filter out events already applied to
  const appliedEventIds = applications?.map(app => app.eventId) || [];
  const availableEvents = allEvents?.filter(event => !appliedEventIds.includes(event.id)) || [];

  const statusColors: { [key: string]: string } = {
    applied: "bg-amber-500",
    accepted: "bg-green-500",
    rejected: "bg-gray-500",
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
          <Send className="h-6 w-6" />
          Applications
        </h2>
        <div className="flex items-center gap-3">
          {trucks.length > 1 && (
            <Select value={selectedTruckId.toString()} onValueChange={(val) => setSelectedTruckId(parseInt(val))}>
              <SelectTrigger className="w-48" data-testid="select-truck-application">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id.toString()} data-testid={`select-item-truck-application-${truck.id}`}>
                    {truck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-apply-event" disabled={availableEvents.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                Apply to Event
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-application">
              <DialogHeader>
                <DialogTitle>Apply to Event</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Event</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={(val) => field.onChange(parseInt(val))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-event-application">
                              <SelectValue placeholder="Choose an event to apply to" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableEvents.map((event) => (
                              <SelectItem key={event.id} value={event.id.toString()} data-testid={`select-item-event-application-${event.id}`}>
                                {event.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Note (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell the organizer why you're a great fit for this event..."
                            {...field}
                            value={field.value || ""}
                            data-testid="input-application-note"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      data-testid="button-cancel-application"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-application"
                    >
                      {createMutation.isPending ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Display submitted applications */}
      {applications && applications.length > 0 ? (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover-elevate" data-testid={`application-card-${app.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{app.event.title}</h3>
                    {app.event.date && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(app.event.date), "MMMM d, yyyy")}
                      </p>
                    )}
                    {app.note && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{app.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[app.status]} text-white border-0`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </Badge>
                    <Button variant="outline" size="sm" asChild data-testid={`button-view-event-app-${app.event.id}`}>
                      <Link href={`/events/${app.event.id}`}>View Event</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Send className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              No applications yet. Browse events and apply to the ones you're interested in!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
