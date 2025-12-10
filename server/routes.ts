import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertTruckSchema, 
  insertEventSchema, 
  insertUpdateSchema,
  insertScheduleSchema,
  insertInviteSchema,
  insertApplicationSchema,
  insertFavoriteSchema,
  insertFollowSchema,
  users,
  trucks,
  events,
  favorites,
  follows,
  schedules,
  updates,
  invites,
  applications,
  type User,
  type InsertTruck,
  type InsertEvent,
  type InsertSchedule,
  type InsertUpdate,
} from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { db, type Db } from "./db";
import { eq, and, ilike, or, gte, lte, sql } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY - Stripe features will be disabled');
}
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
  : null;

// Helper to find or create user by email
export async function getOrCreateUserByEmail(database: Db, email: string): Promise<User> {
  const [existingUser] = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (existingUser) {
    return existingUser;
  }
  
  const [newUser] = await database
    .insert(users)
    .values({
      email,
      role: "user",
      subscriptionTier: "free",
      subscriptionStatus: "none",
    })
    .returning();
  
  return newUser;
}

// Main routes function
export function applyRoutes(app: Express): Server {

  // ===== HEALTH CHECK =====
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ===== AUTH ROUTES =====
  app.get('/api/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        user,
        subscription: {
          role: user.subscriptionRole || user.role,
          tier: user.subscriptionTier || "free",
          status: user.subscriptionStatus || "none",
        },
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Legacy auth endpoint for compatibility
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const hasCompletedProfile = !!user.role;
      
      res.json({
        ...user,
        hasCompletedProfile,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ===== PROFILE ROUTES =====
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const profileSchema = z.object({
        name: z.string().optional(),
        role: z.enum(["user", "truck", "org"]).optional(),
      });
      
      const validatedData = profileSchema.parse(req.body);
      
      if (currentUser.role && validatedData.role && currentUser.role !== validatedData.role) {
        return res.status(403).json({ 
          message: "Role cannot be changed once set." 
        });
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== TRUCK ROUTES =====
  // GET /api/trucks – list trucks with optional filters: city, cuisine, q
  app.get('/api/trucks', async (req, res) => {
    try {
      const { city, cuisine, q } = req.query;
      
      let query = db.select().from(trucks).where(eq(trucks.isActive, true));
      
      const conditions = [eq(trucks.isActive, true)];
      
      if (city && typeof city === 'string') {
        conditions.push(ilike(trucks.city, `%${city}%`));
      }
      if (cuisine && typeof cuisine === 'string') {
        conditions.push(ilike(trucks.cuisine, `%${cuisine}%`));
      }
      if (q && typeof q === 'string') {
        conditions.push(
          or(
            ilike(trucks.name, `%${q}%`),
            ilike(trucks.description, `%${q}%`),
            ilike(trucks.cuisine, `%${q}%`)
          )!
        );
      }
      
      const result = await db
        .select()
        .from(trucks)
        .where(and(...conditions));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      res.status(500).json({ message: "Failed to fetch trucks" });
    }
  });

  // GET /api/trucks/my-trucks
  app.get('/api/trucks/my-trucks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await db
        .select()
        .from(trucks)
        .where(eq(trucks.ownerUserId, userId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching user trucks:", error);
      res.status(500).json({ message: "Failed to fetch trucks" });
    }
  });

  // GET /api/trucks/:id
  app.get('/api/trucks/:id', async (req, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      res.json(truck);
    } catch (error) {
      console.error("Error fetching truck:", error);
      res.status(500).json({ message: "Failed to fetch truck" });
    }
  });

  // POST /api/trucks – create truck for current user
  app.post('/api/trucks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertTruckSchema.parse({ ...req.body, ownerUserId: userId }) as InsertTruck;
      const [truck] = await db
        .insert(trucks)
        .values(parsed)
        .returning();
      res.status(201).json(truck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating truck:", error);
      res.status(500).json({ message: "Failed to create truck" });
    }
  });

  // PUT /api/trucks/:id – update only if current user owns the truck
  app.put('/api/trucks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      const userId = req.user.id;
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this truck" });
      }
      
      const [updatedTruck] = await db
        .update(trucks)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(trucks.id, truckId))
        .returning();
      
      res.json(updatedTruck);
    } catch (error) {
      console.error("Error updating truck:", error);
      res.status(500).json({ message: "Failed to update truck" });
    }
  });

  // Keep PATCH for backward compatibility
  app.patch('/api/trucks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      const userId = req.user.id;
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this truck" });
      }
      
      const [updatedTruck] = await db
        .update(trucks)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(trucks.id, truckId))
        .returning();
      
      res.json(updatedTruck);
    } catch (error) {
      console.error("Error updating truck:", error);
      res.status(500).json({ message: "Failed to update truck" });
    }
  });

  app.delete('/api/trucks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      const userId = req.user.id;
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this truck" });
      }
      
      await db.delete(trucks).where(eq(trucks.id, truckId));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting truck:", error);
      res.status(500).json({ message: "Failed to delete truck" });
    }
  });

  // ===== EVENT ROUTES =====
  // GET /api/events – list events with optional filters: date range, city, status
  app.get('/api/events', async (req, res) => {
    try {
      const { city, status, startDate, endDate } = req.query;
      
      const conditions = [];
      
      if (city && typeof city === 'string') {
        conditions.push(ilike(events.locationName, `%${city}%`));
      }
      if (status && typeof status === 'string') {
        conditions.push(eq(events.status, status as "draft" | "published" | "closed"));
      }
      if (startDate && typeof startDate === 'string') {
        conditions.push(gte(events.date, new Date(startDate)));
      }
      if (endDate && typeof endDate === 'string') {
        conditions.push(lte(events.date, new Date(endDate)));
      }
      
      const result = conditions.length > 0
        ? await db.select().from(events).where(and(...conditions))
        : await db.select().from(events);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/my-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await db
        .select()
        .from(events)
        .where(eq(events.organizerUserId, userId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // GET /api/events/:id
  app.get('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // POST /api/events – create event for current organizer
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertEventSchema.parse({ ...req.body, organizerUserId: userId }) as InsertEvent;
      const [event] = await db
        .insert(events)
        .values(parsed)
        .returning();
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // PUT /api/events/:id – update only if current user is organizer
  app.put('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = req.user.id;
      if (event.organizerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }
      
      const [updatedEvent] = await db
        .update(events)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning();
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Keep PATCH for backward compatibility
  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = req.user.id;
      if (event.organizerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }
      
      const [updatedEvent] = await db
        .update(events)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning();
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = req.user.id;
      if (event.organizerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }
      
      await db.delete(events).where(eq(events.id, eventId));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ===== FAVORITES ROUTES =====
  // GET /api/favorites
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await db
        .select()
        .from(favorites)
        .where(eq(favorites.userId, userId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  // POST /api/favorites – body: { truckId }
  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bodySchema = z.object({ truckId: z.number() });
      const { truckId } = bodySchema.parse(req.body);
      
      const [existing] = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.truckId, truckId)))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ message: "Already favorited" });
      }

      const [favorite] = await db
        .insert(favorites)
        .values({ userId, truckId })
        .returning();
      
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  // DELETE /api/favorites/:id
  app.delete('/api/favorites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid favorite ID" });
      }
      
      const userId = req.user.id;
      const [favorite] = await db
        .select()
        .from(favorites)
        .where(eq(favorites.id, id))
        .limit(1);
      
      if (!favorite) {
        return res.status(404).json({ message: "Favorite not found" });
      }
      
      if (favorite.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await db.delete(favorites).where(eq(favorites.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // ===== FOLLOWS ROUTES =====
  // GET /api/follows
  app.get('/api/follows', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await db
        .select()
        .from(follows)
        .where(eq(follows.userId, userId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching follows:", error);
      res.status(500).json({ message: "Failed to fetch follows" });
    }
  });

  // POST /api/follows – { truckId, alertsEnabled }
  app.post('/api/follows', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bodySchema = z.object({
        truckId: z.number(),
        alertsEnabled: z.boolean().optional().default(false),
      });
      const { truckId, alertsEnabled } = bodySchema.parse(req.body);
      
      const [existing] = await db
        .select()
        .from(follows)
        .where(and(eq(follows.userId, userId), eq(follows.truckId, truckId)))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ message: "Already following" });
      }

      const [follow] = await db
        .insert(follows)
        .values({ userId, truckId, alertsEnabled })
        .returning();
      
      res.status(201).json(follow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding follow:", error);
      res.status(500).json({ message: "Failed to follow truck" });
    }
  });

  // PATCH /api/follows/:id – toggle alertsEnabled
  app.patch('/api/follows/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid follow ID" });
      }
      
      const userId = req.user.id;
      const [follow] = await db
        .select()
        .from(follows)
        .where(eq(follows.id, id))
        .limit(1);
      
      if (!follow) {
        return res.status(404).json({ message: "Follow not found" });
      }
      
      if (follow.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const bodySchema = z.object({ alertsEnabled: z.boolean() });
      const { alertsEnabled } = bodySchema.parse(req.body);
      
      const [updatedFollow] = await db
        .update(follows)
        .set({ alertsEnabled })
        .where(eq(follows.id, id))
        .returning();
      
      res.json(updatedFollow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating follow:", error);
      res.status(500).json({ message: "Failed to update follow" });
    }
  });

  // DELETE /api/follows/:id
  app.delete('/api/follows/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid follow ID" });
      }
      
      const userId = req.user.id;
      const [follow] = await db
        .select()
        .from(follows)
        .where(eq(follows.id, id))
        .limit(1);
      
      if (!follow) {
        return res.status(404).json({ message: "Follow not found" });
      }
      
      if (follow.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await db.delete(follows).where(eq(follows.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing follow:", error);
      res.status(500).json({ message: "Failed to unfollow truck" });
    }
  });

  // ===== SCHEDULES ROUTES =====
  // GET /api/schedules?truckId=...
  app.get('/api/schedules', async (req, res) => {
    try {
      const truckId = parseInt(req.query.truckId as string);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid or missing truck ID" });
      }
      const result = await db
        .select()
        .from(schedules)
        .where(eq(schedules.truckId, truckId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // POST /api/schedules – create schedule for a truck the user owns
  app.post('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertScheduleSchema.parse(req.body) as InsertSchedule;
      
      // Verify user owns the truck
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, parsed.truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to create schedule for this truck" });
      }
      
      const [schedule] = await db
        .insert(schedules)
        .values(parsed)
        .returning();
      
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // DELETE /api/schedules/:id
  app.delete('/api/schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }
      
      const userId = req.user.id;
      
      // Get the schedule and verify ownership through truck
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.id, id))
        .limit(1);
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, schedule.truckId))
        .limit(1);
      
      if (!truck || truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this schedule" });
      }
      
      await db.delete(schedules).where(eq(schedules.id, id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // ===== UPDATES ROUTES =====
  // GET /api/updates?truckId=...
  app.get('/api/updates', async (req, res) => {
    try {
      const truckId = parseInt(req.query.truckId as string);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid or missing truck ID" });
      }
      const result = await db
        .select()
        .from(updates)
        .where(eq(updates.truckId, truckId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching updates:", error);
      res.status(500).json({ message: "Failed to fetch updates" });
    }
  });

  // POST /api/updates – post status update for a truck the user owns
  app.post('/api/updates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const parsed = insertUpdateSchema.parse(req.body) as InsertUpdate;
      
      // Verify user owns the truck
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, parsed.truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to post updates for this truck" });
      }
      
      const [update] = await db
        .insert(updates)
        .values(parsed)
        .returning();
      
      res.status(201).json(update);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating update:", error);
      res.status(500).json({ message: "Failed to create update" });
    }
  });

  // ===== EVENT ↔ TRUCK MATCHING =====
  // POST /api/events/:id/invite – organizer invites a truck
  app.post('/api/events/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const userId = req.user.id;
      
      // Verify user is the organizer
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.organizerUserId !== userId) {
        return res.status(403).json({ message: "Only the organizer can invite trucks" });
      }
      
      const bodySchema = z.object({ truckId: z.number() });
      const { truckId } = bodySchema.parse(req.body);
      
      // Check if invite already exists
      const [existing] = await db
        .select()
        .from(invites)
        .where(and(eq(invites.eventId, eventId), eq(invites.truckId, truckId)))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ message: "Invite already exists" });
      }
      
      const [invite] = await db
        .insert(invites)
        .values({ eventId, truckId })
        .returning();
      
      res.status(201).json(invite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  // GET /api/events/:id/invites
  app.get('/api/events/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const result = await db
        .select()
        .from(invites)
        .where(eq(invites.eventId, eventId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  // POST /api/events/:id/apply – truck applies to event
  app.post('/api/events/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const userId = req.user.id;
      
      const bodySchema = z.object({
        truckId: z.number(),
        note: z.string().optional(),
      });
      const { truckId, note } = bodySchema.parse(req.body);
      
      // Verify user owns the truck
      const [truck] = await db
        .select()
        .from(trucks)
        .where(eq(trucks.id, truckId))
        .limit(1);
      
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "You can only apply with trucks you own" });
      }
      
      // Check if application already exists
      const [existing] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.eventId, eventId), eq(applications.truckId, truckId)))
        .limit(1);
      
      if (existing) {
        return res.status(400).json({ message: "Application already exists" });
      }
      
      const [application] = await db
        .insert(applications)
        .values({ eventId, truckId, note })
        .returning();
      
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // GET /api/events/:id/applicants
  app.get('/api/events/:id/applicants', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const result = await db
        .select()
        .from(applications)
        .where(eq(applications.eventId, eventId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Additional routes for managing invite/application status
  app.patch('/api/invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invite ID" });
      }
      
      const bodySchema = z.object({
        status: z.enum(["pending", "accepted", "declined"]),
      });
      const { status } = bodySchema.parse(req.body);
      
      const [invite] = await db
        .update(invites)
        .set({ status })
        .where(eq(invites.id, id))
        .returning();
      
      res.json(invite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating invite:", error);
      res.status(500).json({ message: "Failed to update invite" });
    }
  });

  app.patch('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid application ID" });
      }
      
      const bodySchema = z.object({
        status: z.enum(["applied", "accepted", "rejected"]),
      });
      const { status } = bodySchema.parse(req.body);
      
      const [application] = await db
        .update(applications)
        .set({ status })
        .where(eq(applications.id, id))
        .returning();
      
      res.json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Additional helper routes for trucks
  app.get('/api/trucks/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const result = await db
        .select()
        .from(invites)
        .where(eq(invites.truckId, truckId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.get('/api/trucks/:id/applications', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const result = await db
        .select()
        .from(applications)
        .where(eq(applications.truckId, truckId));
      res.json(result);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ===== TRUCK ANALYTICS =====
  // GET /api/truck/analytics?truckId=...
  app.get('/api/truck/analytics', async (req, res) => {
    try {
      const truckId = parseInt(req.query.truckId as string);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid or missing truck ID" });
      }
      
      // Get counts using separate queries
      const [followersResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.truckId, truckId));
      
      const [favoritesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(favorites)
        .where(eq(favorites.truckId, truckId));
      
      const [invitesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invites)
        .where(eq(invites.truckId, truckId));
      
      const [applicationsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(eq(applications.truckId, truckId));
      
      res.json({
        followers: followersResult?.count || 0,
        favorites: favoritesResult?.count || 0,
        invites: invitesResult?.count || 0,
        applications: applicationsResult?.count || 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ===== SUBSCRIPTION ROUTES =====
  app.post('/api/subscription/create-checkout-session', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
      }

      const userId = req.user.id;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || !user.email) {
        return res.status(400).json({ error: 'User email required' });
      }

      const { tier = 'basic' } = req.body || {};
      
      if (!['basic', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }

      if (!user.role) {
        return res.status(400).json({ error: 'User role not set' });
      }

      const priceMap: Record<string, string | undefined> = {
        'truck_basic': process.env.STRIPE_PRICE_TRUCK_BASIC,
        'truck_pro': process.env.STRIPE_PRICE_TRUCK_PRO,
        'org_basic': process.env.STRIPE_PRICE_ORG_BASIC,
        'org_pro': process.env.STRIPE_PRICE_ORG_PRO,
        'user_basic': process.env.STRIPE_PRICE_USER_BASIC,
        'user_pro': process.env.STRIPE_PRICE_USER_PRO,
      };

      const priceKey = `${user.role}_${tier}`;
      const priceId = priceMap[priceKey];

      if (!priceId) {
        return res.status(500).json({ error: `Subscription pricing not configured for ${user.role} ${tier} plan` });
      }

      const baseUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'http://localhost:5000';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription`,
        metadata: { tier, userId, role: user.role },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        status: user.subscriptionStatus || 'none',
        tier: user.subscriptionTier || 'free',
        role: user.subscriptionRole,
      });
    } catch (error: any) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/subscription/activate-free', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.subscriptionStatus === 'active' && user.subscriptionTier !== 'free') {
        return res.status(400).json({ error: 'Active paid subscription already exists' });
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          subscriptionRole: user.role,
        })
        .where(eq(users.id, userId))
        .returning();

      res.json({
        status: updatedUser?.subscriptionStatus,
        tier: updatedUser?.subscriptionTier,
        role: updatedUser?.subscriptionRole,
      });
    } catch (error: any) {
      console.error('Activate free tier error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/subscription/webhook', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
      
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = req.body;
      }

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier || 'basic';
          const role = session.metadata?.role;

          if (userId) {
            await db
              .update(users)
              .set({
                subscriptionTier: tier as "free" | "basic" | "pro",
                subscriptionStatus: 'active',
                subscriptionRole: role as "user" | "truck" | "org",
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
              })
              .where(eq(users.id, userId));
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object as Stripe.Subscription;
          const deletedCustId = deletedSub.customer as string;

          await db
            .update(users)
            .set({ subscriptionStatus: 'canceled' })
            .where(eq(users.stripeCustomerId, deletedCustId));
          break;
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Subscription webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Main entry point - combines auth setup and routes
export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  return applyRoutes(app);
}
