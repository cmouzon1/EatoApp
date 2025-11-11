import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function DevTools() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Developer Tools</h1>
        <p className="text-muted-foreground">Quick actions for testing marketplace features</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <UserQuickActions userId={user?.id} toast={toast} />
        <TruckQuickActions toast={toast} />
      </div>
    </div>
  );
}

function UserQuickActions({ userId, toast }: { userId?: string; toast: any }) {
  const [truckId, setTruckId] = useState("");

  async function addFavorite() {
    try {
      await apiRequest("POST", "/api/favorites", { truckId: Number(truckId) });
      toast({ title: "Success", description: "Truck favorited!" });
      setTruckId("");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to favorite truck",
        variant: "destructive" 
      });
    }
  }

  async function addFollow() {
    try {
      await apiRequest("POST", "/api/follows", { truckId: Number(truckId), alertsEnabled: true });
      toast({ title: "Success", description: "Following truck with alerts enabled!" });
      setTruckId("");
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to follow truck",
        variant: "destructive" 
      });
    }
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Quick Actions</CardTitle>
          <CardDescription>Please log in to use these features</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Quick Actions</CardTitle>
        <CardDescription>Add favorites and follows for testing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Truck ID</label>
          <Input
            type="number"
            placeholder="Enter truck ID"
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
            data-testid="input-devtools-truck-id"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={addFavorite} 
            disabled={!truckId}
            data-testid="button-add-favorite"
          >
            Add Favorite
          </Button>
          <Button 
            onClick={addFollow} 
            variant="secondary"
            disabled={!truckId}
            data-testid="button-add-follow"
          >
            Follow + Alerts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TruckQuickActions({ toast }: { toast: any }) {
  const [truckId, setTruckId] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    latitude: "",
    longitude: "",
    notes: "",
  });
  const [updateForm, setUpdateForm] = useState({
    title: "",
    content: "",
  });

  const onScheduleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setScheduleForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onUpdateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUpdateForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function addSchedule() {
    try {
      await apiRequest("POST", "/api/schedules", {
        truckId: Number(truckId),
        location: scheduleForm.location,
        date: scheduleForm.date,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        latitude: scheduleForm.latitude ? parseFloat(scheduleForm.latitude) : null,
        longitude: scheduleForm.longitude ? parseFloat(scheduleForm.longitude) : null,
        notes: scheduleForm.notes || null,
      });
      toast({ title: "Success", description: "Schedule added!" });
      setScheduleForm({
        location: "",
        date: "",
        startTime: "",
        endTime: "",
        latitude: "",
        longitude: "",
        notes: "",
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add schedule",
        variant: "destructive" 
      });
    }
  }

  async function postUpdate() {
    try {
      await apiRequest("POST", "/api/updates", {
        truckId: Number(truckId),
        title: updateForm.title,
        content: updateForm.content,
      });
      toast({ title: "Success", description: "Update posted!" });
      setUpdateForm({ title: "", content: "" });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to post update",
        variant: "destructive" 
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Truck Quick Actions</CardTitle>
        <CardDescription>Add schedules and updates for testing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Truck ID</label>
          <Input
            type="number"
            placeholder="Enter truck ID"
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
            data-testid="input-devtools-truck-id-2"
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Add Schedule</h3>
          <Input
            name="location"
            placeholder="Location"
            value={scheduleForm.location}
            onChange={onScheduleChange}
            data-testid="input-schedule-location"
          />
          <Input
            name="date"
            type="date"
            placeholder="Date"
            value={scheduleForm.date}
            onChange={onScheduleChange}
            data-testid="input-schedule-date"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              name="startTime"
              type="time"
              placeholder="Start Time"
              value={scheduleForm.startTime}
              onChange={onScheduleChange}
              data-testid="input-schedule-start"
            />
            <Input
              name="endTime"
              type="time"
              placeholder="End Time"
              value={scheduleForm.endTime}
              onChange={onScheduleChange}
              data-testid="input-schedule-end"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              name="latitude"
              placeholder="Latitude"
              value={scheduleForm.latitude}
              onChange={onScheduleChange}
              data-testid="input-schedule-lat"
            />
            <Input
              name="longitude"
              placeholder="Longitude"
              value={scheduleForm.longitude}
              onChange={onScheduleChange}
              data-testid="input-schedule-lng"
            />
          </div>
          <Textarea
            name="notes"
            placeholder="Notes (optional)"
            value={scheduleForm.notes}
            onChange={onScheduleChange}
            data-testid="input-schedule-notes"
          />
          <Button 
            onClick={addSchedule} 
            disabled={!truckId || !scheduleForm.location || !scheduleForm.date}
            data-testid="button-add-schedule"
          >
            Add Schedule
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Post Update</h3>
          <Input
            name="title"
            placeholder="Update title"
            value={updateForm.title}
            onChange={onUpdateChange}
            data-testid="input-update-title-dev"
          />
          <Textarea
            name="content"
            placeholder="Update message"
            value={updateForm.content}
            onChange={onUpdateChange}
            data-testid="input-update-content-dev"
          />
          <Button 
            onClick={postUpdate}
            disabled={!truckId || !updateForm.title || !updateForm.content}
            data-testid="button-post-update"
          >
            Post Update
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
