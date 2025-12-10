import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertTruckSchema, 
  insertEventSchema, 
  insertUpdateSchema,
  insertScheduleSchema,
  insertInviteSchema,
  insertApplicationSchema,
  users,
} from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "./db";
import { eq } from "drizzle-orm";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY - Stripe features will be disabled');
}
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // ===== AUTH ROUTES =====
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
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
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
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
  app.get('/api/trucks', async (req, res) => {
    try {
      const trucks = await storage.getAllTrucks();
      res.json(trucks);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      res.status(500).json({ message: "Failed to fetch trucks" });
    }
  });

  app.get('/api/trucks/my-trucks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trucks = await storage.getTrucksByOwner(userId);
      res.json(trucks);
    } catch (error) {
      console.error("Error fetching user trucks:", error);
      res.status(500).json({ message: "Failed to fetch trucks" });
    }
  });

  app.get('/api/trucks/:id', async (req, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const truck = await storage.getTruckById(truckId);
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      res.json(truck);
    } catch (error) {
      console.error("Error fetching truck:", error);
      res.status(500).json({ message: "Failed to fetch truck" });
    }
  });

  app.post('/api/trucks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertTruckSchema.parse({ ...req.body, ownerUserId: userId });
      const truck = await storage.createTruck(parsed);
      res.status(201).json(truck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating truck:", error);
      res.status(500).json({ message: "Failed to create truck" });
    }
  });

  app.patch('/api/trucks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const truck = await storage.getTruckById(truckId);
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      const userId = req.user.claims.sub;
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this truck" });
      }
      
      const updatedTruck = await storage.updateTruck(truckId, req.body);
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
      
      const truck = await storage.getTruckById(truckId);
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      const userId = req.user.claims.sub;
      if (truck.ownerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this truck" });
      }
      
      await storage.deleteTruck(truckId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting truck:", error);
      res.status(500).json({ message: "Failed to delete truck" });
    }
  });

  // ===== EVENT ROUTES =====
  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/my-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEventsByOrganizer(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertEventSchema.parse({ ...req.body, organizerUserId: userId });
      const event = await storage.createEvent(parsed);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = req.user.claims.sub;
      if (event.organizerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }
      
      const updatedEvent = await storage.updateEvent(eventId, req.body);
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
      
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userId = req.user.claims.sub;
      if (event.organizerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }
      
      await storage.deleteEvent(eventId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ===== FAVORITES ROUTES =====
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavoritesByUser(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { truckId } = req.body;
      
      const existing = await storage.checkFavorite(userId, truckId);
      if (existing) {
        return res.status(400).json({ message: "Already favorited" });
      }

      const favorite = await storage.addFavorite({ userId, truckId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/favorites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid favorite ID" });
      }
      await storage.removeFavorite(id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // ===== FOLLOWS ROUTES =====
  app.get('/api/follows', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const follows = await storage.getFollowsByUser(userId);
      res.json(follows);
    } catch (error) {
      console.error("Error fetching follows:", error);
      res.status(500).json({ message: "Failed to fetch follows" });
    }
  });

  app.post('/api/follows', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { truckId, alertsEnabled = false } = req.body;
      
      const existing = await storage.checkFollow(userId, truckId);
      if (existing) {
        return res.status(400).json({ message: "Already following" });
      }

      const follow = await storage.addFollow({ userId, truckId, alertsEnabled });
      res.status(201).json(follow);
    } catch (error) {
      console.error("Error adding follow:", error);
      res.status(500).json({ message: "Failed to follow truck" });
    }
  });

  app.patch('/api/follows/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid follow ID" });
      }
      const { alertsEnabled } = req.body;
      const follow = await storage.updateFollow(id, { alertsEnabled });
      res.json(follow);
    } catch (error) {
      console.error("Error updating follow:", error);
      res.status(500).json({ message: "Failed to update follow" });
    }
  });

  app.delete('/api/follows/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid follow ID" });
      }
      await storage.removeFollow(id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing follow:", error);
      res.status(500).json({ message: "Failed to unfollow truck" });
    }
  });

  // ===== SCHEDULES ROUTES =====
  app.get('/api/schedules', async (req, res) => {
    try {
      const truckId = parseInt(req.query.truckId as string);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const schedules = await storage.getSchedulesByTruck(truckId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(parsed);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.delete('/api/schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }
      await storage.deleteSchedule(id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // ===== UPDATES ROUTES =====
  app.get('/api/updates', async (req, res) => {
    try {
      const truckId = parseInt(req.query.truckId as string);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const updates = await storage.getUpdatesByTruck(truckId);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching updates:", error);
      res.status(500).json({ message: "Failed to fetch updates" });
    }
  });

  app.post('/api/updates', isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertUpdateSchema.parse(req.body);
      const update = await storage.createUpdate(parsed);
      res.status(201).json(update);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating update:", error);
      res.status(500).json({ message: "Failed to create update" });
    }
  });

  // ===== TRUCK ANALYTICS =====
  app.get('/api/truck/analytics', async (req, res) => {
    try {
      const truckId = parseInt(req.query.truckId as string);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const analytics = await storage.getTruckAnalytics(truckId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ===== INVITES ROUTES =====
  app.get('/api/events/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const invites = await storage.getInvitesByEvent(eventId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.get('/api/trucks/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const invites = await storage.getInvitesByTruck(truckId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.post('/api/events/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const { truckId } = req.body;
      const invite = await storage.createInvite({ eventId, truckId });
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.patch('/api/invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invite ID" });
      }
      const { status } = req.body;
      const invite = await storage.updateInviteStatus(id, status);
      res.json(invite);
    } catch (error) {
      console.error("Error updating invite:", error);
      res.status(500).json({ message: "Failed to update invite" });
    }
  });

  // ===== APPLICATIONS ROUTES =====
  app.get('/api/events/:id/applications', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const applications = await storage.getApplicationsByEvent(eventId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get('/api/trucks/:id/applications', isAuthenticated, async (req: any, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      const applications = await storage.getApplicationsByTruck(truckId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/events/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const { truckId, note } = req.body;
      const application = await storage.createApplication({ eventId, truckId, note });
      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.patch('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid application ID" });
      }
      const { status } = req.body;
      const application = await storage.updateApplicationStatus(id, status);
      res.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // ===== SUBSCRIPTION ROUTES =====
  app.post('/api/subscription/create-checkout-session', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.subscriptionStatus === 'active' && user.subscriptionTier !== 'free') {
        return res.status(400).json({ error: 'Active paid subscription already exists' });
      }

      const updatedUser = await storage.updateUser(userId, {
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        subscriptionRole: user.role,
      });

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
            await storage.updateUser(userId, {
              subscriptionTier: tier as "free" | "basic" | "pro",
              subscriptionStatus: 'active',
              subscriptionRole: role as "user" | "truck" | "org",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            });
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object as Stripe.Subscription;
          const deletedCustId = deletedSub.customer as string;

          const [userToCancel] = await db
            .select()
            .from(users)
            .where(eq(users.stripeCustomerId, deletedCustId))
            .limit(1);

          if (userToCancel) {
            await storage.updateUser(userToCancel.id, {
              subscriptionStatus: 'canceled',
            });
          }
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
