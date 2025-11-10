import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTruckSchema, insertEventSchema, insertBookingSchema, insertTruckUnavailabilitySchema, subscriptions } from "@shared/schema";
import { z } from "zod";
import { sendNewBookingNotification, sendBookingAcceptedNotification, sendBookingDeclinedNotification } from "./email";
import Stripe from "stripe";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Reference: blueprint:javascript_stripe for Stripe integration
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if profile is completed (has role set)
      const hasCompletedProfile = !!user.userRole;
      
      // Get subscription info
      const subscription = await storage.getSubscriptionByUserId(userId);
      
      res.json({
        ...user,
        hasCompletedProfile,
        subscription: subscription ? {
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get current user to check if role is already set
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate input
      const profileSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phoneNumber: z.string().optional(),
        bio: z.string().optional(),
        userRole: z.enum(["truck_owner", "event_organizer", "user"]).optional(),
      });
      
      const validatedData = profileSchema.parse(req.body);
      
      // Prevent role changes if role is already set
      if (currentUser.userRole && validatedData.userRole && currentUser.userRole !== validatedData.userRole) {
        return res.status(403).json({ 
          message: "Role cannot be changed once set. Please sign out and create a new account to use a different role." 
        });
      }
      
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
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

  // Truck routes
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
      const validatedData = insertTruckSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const truck = await storage.createTruck(validatedData);
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
      const userId = req.user.claims.sub;
      const truckId = parseInt(req.params.id);
      
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const existingTruck = await storage.getTruckById(truckId);
      if (!existingTruck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      if (existingTruck.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this truck" });
      }
      
      // Partial validation for updates
      const updateSchema = insertTruckSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      const updatedTruck = await storage.updateTruck(truckId, validatedData);
      res.json(updatedTruck);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating truck:", error);
      res.status(500).json({ message: "Failed to update truck" });
    }
  });

  // Truck unavailability routes
  app.get('/api/trucks/:id/unavailability', async (req, res) => {
    try {
      const truckId = parseInt(req.params.id);
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const unavailability = await storage.getUnavailabilityByTruck(truckId);
      res.json(unavailability);
    } catch (error) {
      console.error("Error fetching truck unavailability:", error);
      res.status(500).json({ message: "Failed to fetch unavailability" });
    }
  });

  app.post('/api/trucks/:id/unavailability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const truckId = parseInt(req.params.id);
      
      if (isNaN(truckId)) {
        return res.status(400).json({ message: "Invalid truck ID" });
      }
      
      const truck = await storage.getTruckById(truckId);
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      if (truck.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this truck" });
      }
      
      // Extend schema to coerce string dates to Date objects
      const schema = insertTruckUnavailabilitySchema.extend({
        blockedDate: z.coerce.date(),
      });
      
      const validatedData = schema.parse({
        ...req.body,
        truckId,
      });
      
      const unavailability = await storage.addUnavailability(validatedData);
      res.status(201).json(unavailability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding unavailability:", error);
      res.status(500).json({ message: "Failed to add unavailability" });
    }
  });

  app.delete('/api/unavailability/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unavailabilityId = parseInt(req.params.id);
      
      if (isNaN(unavailabilityId)) {
        return res.status(400).json({ message: "Invalid unavailability ID" });
      }
      
      // Get the unavailability record to check truck ownership
      const unavailability = await storage.getUnavailabilityById(unavailabilityId);
      if (!unavailability) {
        return res.status(404).json({ message: "Unavailability record not found" });
      }
      
      // Get the truck to check ownership
      const truck = await storage.getTruckById(unavailability.truckId);
      if (!truck) {
        return res.status(404).json({ message: "Truck not found" });
      }
      
      if (truck.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to remove this unavailability" });
      }
      
      await storage.removeUnavailability(unavailabilityId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing unavailability:", error);
      res.status(500).json({ message: "Failed to remove unavailability" });
    }
  });

  // Event routes
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
      const validatedData = insertEventSchema.parse({
        ...req.body,
        organizerId: userId,
      });
      
      const event = await storage.createEvent(validatedData);
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
      const userId = req.user.claims.sub;
      const eventId = parseInt(req.params.id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const existingEvent = await storage.getEventById(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (existingEvent.organizerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }
      
      // Partial validation for updates
      const updateSchema = insertEventSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      
      const updatedEvent = await storage.updateEvent(eventId, validatedData);
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Booking routes
  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(validatedData);
      
      // Fetch related data for email notifications
      const [truck, event] = await Promise.all([
        storage.getTruckById(booking.truckId),
        storage.getEventById(booking.eventId),
      ]);
      
      if (truck && event) {
        const [truckOwner, eventOrganizer] = await Promise.all([
          storage.getUser(truck.ownerId),
          storage.getUser(event.organizerId),
        ]);
        
        // Send email notifications (don't block response on email send)
        if (truckOwner && eventOrganizer) {
          sendNewBookingNotification({
            booking,
            truck,
            event,
            truckOwner,
            eventOrganizer,
          }).catch((error) => {
            console.error('Failed to send new booking notification:', error);
          });
        }
      }
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get('/api/bookings/my-truck-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingIds = await storage.getBookingsByTruckOwner(userId);
      
      // Fetch full details for each booking with related truck and event
      const bookingsWithDetails = await Promise.all(
        bookingIds.map(async (booking) => {
          const truck = await storage.getTruckById(booking.truckId);
          const event = await storage.getEventById(booking.eventId);
          return { ...booking, truck, event };
        })
      );
      
      res.json(bookingsWithDetails);
    } catch (error) {
      console.error("Error fetching truck bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/my-event-bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingIds = await storage.getBookingsByEventOrganizer(userId);
      
      // Fetch full details for each booking with related truck and event
      const bookingsWithDetails = await Promise.all(
        bookingIds.map(async (booking) => {
          const truck = await storage.getTruckById(booking.truckId);
          const event = await storage.getEventById(booking.eventId);
          return { ...booking, truck, event };
        })
      );
      
      res.json(bookingsWithDetails);
    } catch (error) {
      console.error("Error fetching event bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch('/api/bookings/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }
      
      if (!['pending', 'accepted', 'declined', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedBooking = await storage.updateBookingStatus(bookingId, status);
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Send email notifications for status changes
      if (status === 'accepted' || status === 'declined') {
        const [truck, event] = await Promise.all([
          storage.getTruckById(updatedBooking.truckId),
          storage.getEventById(updatedBooking.eventId),
        ]);
        
        if (truck && event) {
          const [truckOwner, eventOrganizer] = await Promise.all([
            storage.getUser(truck.ownerId),
            storage.getUser(event.organizerId),
          ]);
          
          if (truckOwner && eventOrganizer) {
            const emailData = {
              booking: updatedBooking,
              truck,
              event,
              truckOwner,
              eventOrganizer,
            };
            
            // Send appropriate notification based on status
            const emailPromise = status === 'accepted'
              ? sendBookingAcceptedNotification(emailData)
              : sendBookingDeclinedNotification(emailData);
            
            emailPromise.catch((error) => {
              console.error(`Failed to send booking ${status} notification:`, error);
            });
          }
        }
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  // Get single booking with details (for payment checkout)
  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingId = parseInt(req.params.id);

      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Fetch related truck and event
      const [truck, event] = await Promise.all([
        storage.getTruckById(booking.truckId),
        storage.getEventById(booking.eventId),
      ]);

      if (!truck || !event) {
        return res.status(404).json({ message: "Related data not found" });
      }

      // Verify user is authorized (either truck owner or event organizer)
      if (truck.ownerId !== userId && event.organizerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this booking" });
      }

      res.json({ booking, truck, event });
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Stripe payment routes - Reference: blueprint:javascript_stripe
  app.post('/api/create-payment-intent', isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId } = req.body;
      const userId = req.user.claims.sub;

      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
      }

      // Verify the booking exists and user is the event organizer
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify booking is accepted
      if (booking.status !== "accepted") {
        return res.status(400).json({ message: "Booking must be accepted before payment" });
      }

      const event = await storage.getEventById(booking.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.organizerId !== userId) {
        return res.status(403).json({ message: "Not authorized to pay for this booking" });
      }

      // Server-side deposit calculation: 25% of proposed price or $100 default
      let depositAmount = 10000; // $100 default in cents
      if (booking.proposedPrice) {
        const price = parseFloat(booking.proposedPrice.replace(/[^0-9.]/g, ''));
        if (!isNaN(price) && price > 0) {
          depositAmount = Math.round(price * 0.25 * 100); // 25% in cents
        }
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: depositAmount,
        currency: "usd",
        metadata: {
          bookingId: bookingId.toString(),
          eventId: booking.eventId.toString(),
          truckId: booking.truckId.toString(),
        },
      });

      // Update booking with payment intent ID and amount
      await storage.updateBookingPayment(bookingId, {
        paymentIntentId: paymentIntent.id,
        depositAmount: depositAmount,
        paymentStatus: "pending",
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Confirm payment status after Stripe redirect (for development/testing)
  app.post('/api/confirm-payment', isAuthenticated, async (req: any, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment Intent ID is required" });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const bookingId = paymentIntent.metadata?.bookingId;
        
        if (bookingId) {
          await storage.updateBookingPayment(parseInt(bookingId), {
            paymentStatus: "paid",
          });
          console.log(`Payment confirmed for booking #${bookingId}`);
          res.json({ success: true, bookingId });
        } else {
          res.status(400).json({ message: "Booking ID not found in payment metadata" });
        }
      } else {
        res.status(400).json({ message: `Payment status is ${paymentIntent.status}, not succeeded` });
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Error confirming payment: " + error.message });
    }
  });

  // Stripe webhook to handle payment confirmations
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify webhook signature for payment events
      const webhookSecret = process.env.STRIPE_PAYMENT_WEBHOOK_SECRET;
      
      if (webhookSecret && sig) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
          console.log('✓ Payment webhook signature verified');
        } catch (err: any) {
          console.error('⚠️  Payment webhook signature verification failed:', err.message);
          return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
        }
      } else {
        // Development mode without signature verification
        console.log('⚠️  Payment webhook running without signature verification (development mode)');
        event = req.body;
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const bookingId = paymentIntent.metadata?.bookingId;

          if (bookingId) {
            await storage.updateBookingPayment(parseInt(bookingId), {
              paymentStatus: "paid",
            });
            console.log(`Payment succeeded for booking #${bookingId}`);
          }
          break;

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          const failedBookingId = failedIntent.metadata?.bookingId;

          if (failedBookingId) {
            await storage.updateBookingPayment(parseInt(failedBookingId), {
              paymentStatus: "unpaid",
            });
            console.log(`Payment failed for booking #${failedBookingId}`);
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Subscription routes for tiered user plans
  app.post('/api/subscription/create-checkout-session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ error: 'User email required' });
      }

      const { tier = 'basic' } = req.body || {};
      
      if (!['basic', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }

      if (!user.userRole) {
        return res.status(400).json({ error: 'User role not set. Please complete your profile first.' });
      }

      // Map role + tier to Stripe Price ID
      const role = user.userRole;
      const priceMap: Record<string, string | undefined> = {
        'truck_owner_basic': process.env.STRIPE_PRICE_TRUCK_BASIC,
        'truck_owner_pro': process.env.STRIPE_PRICE_TRUCK_PRO,
        'event_organizer_basic': process.env.STRIPE_PRICE_ORG_BASIC,
        'event_organizer_pro': process.env.STRIPE_PRICE_ORG_PRO,
        'user_basic': process.env.STRIPE_PRICE_USER_BASIC,
        'user_pro': process.env.STRIPE_PRICE_USER_PRO,
      };

      const priceKey = `${role}_${tier}`;
      const priceId = priceMap[priceKey];

      console.log(`[DEBUG] Subscription request: role=${role}, tier=${tier}, priceKey=${priceKey}`);
      console.log(`[DEBUG] Price ID from env: ${priceId}`);
      console.log(`[DEBUG] All configured Price IDs:`, {
        user_basic: process.env.STRIPE_PRICE_USER_BASIC,
        user_pro: process.env.STRIPE_PRICE_USER_PRO,
        truck_owner_basic: process.env.STRIPE_PRICE_TRUCK_BASIC,
        truck_owner_pro: process.env.STRIPE_PRICE_TRUCK_PRO,
        event_organizer_basic: process.env.STRIPE_PRICE_ORG_BASIC,
        event_organizer_pro: process.env.STRIPE_PRICE_ORG_PRO,
      });

      if (!priceId) {
        console.error(`Missing Stripe price ID for ${priceKey}`);
        return res.status(500).json({ error: `Subscription pricing not configured for ${role} ${tier} plan` });
      }

      // Construct the base URL based on environment
      const baseUrl = process.env.REPLIT_DEPLOYMENT 
        ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'http://localhost:5000';

      const successUrl = `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/subscription`;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { tier, userId, role },
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
      const subscription = await storage.getSubscriptionByUserId(userId);
      
      if (!subscription) {
        return res.json({ status: 'none', tier: 'free' });
      }

      res.json({
        status: subscription.status,
        tier: subscription.tier,
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
    } catch (error: any) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Free tier activation (no Stripe required)
  app.post('/api/subscription/activate-free', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if subscription already exists
      const existing = await storage.getSubscriptionByUserId(userId);
      
      // If already has active free tier, return success (idempotent)
      if (existing && existing.tier === 'free' && existing.status === 'active') {
        return res.json({
          status: existing.status,
          tier: existing.tier,
          currentPeriodEnd: existing.currentPeriodEnd,
        });
      }

      // If has active paid subscription, don't downgrade
      if (existing && existing.status === 'active' && existing.tier !== 'free') {
        return res.status(400).json({ error: 'Active paid subscription already exists' });
      }

      // Create or update to free tier subscription
      const subscription = await storage.upsertSubscription({
        userId,
        tier: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      });

      res.json({
        status: subscription.status,
        tier: subscription.tier,
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
    } catch (error: any) {
      console.error('Activate free tier error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Subscription webhook handler
  app.post('/api/subscription/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify webhook signature for subscription events
      const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
      
      if (webhookSecret && sig) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
          console.log('✓ Subscription webhook signature verified');
        } catch (err: any) {
          console.error('⚠️  Subscription webhook signature verification failed:', err.message);
          return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
        }
      } else {
        // Development mode without signature verification
        console.log('⚠️  Subscription webhook running without signature verification (development mode)');
        event = req.body;
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier || 'basic';
          const custId = session.customer as string;

          if (userId) {
            await storage.upsertSubscription({
              userId,
              tier: tier as 'basic' | 'pro',
              status: 'active',
              stripeCustomerId: custId,
              stripeSubscriptionId: session.subscription as string,
            });
            console.log(`Subscription activated for user #${userId}`);
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.created':
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          const subStatus = sub.status;
          const currentPeriodEnd = (sub as any).current_period_end 
            ? new Date((sub as any).current_period_end * 1000) 
            : null;

          // Find subscription by Stripe customer ID
          const existingSub = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeCustomerId, customerId))
            .limit(1);

          if (existingSub.length > 0) {
            const priceId = sub.items?.data?.[0]?.price?.id || '';
            const subTier = priceId === process.env.STRIPE_PRICE_PRO ? 'pro' : 'basic';

            await storage.updateSubscription(existingSub[0].userId, {
              tier: subTier as 'basic' | 'pro',
              status: subStatus as any,
              currentPeriodEnd,
              stripeSubscriptionId: sub.id,
            });
            console.log(`Subscription updated for customer ${customerId}`);
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object as Stripe.Subscription;
          const deletedCustId = deletedSub.customer as string;

          // Find and cancel subscription
          const subToCancel = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeCustomerId, deletedCustId))
            .limit(1);

          if (subToCancel.length > 0) {
            await storage.updateSubscription(subToCancel[0].userId, {
              status: 'canceled',
            });
            console.log(`Subscription canceled for customer ${deletedCustId}`);
          }
          break;

        default:
          console.log(`Unhandled subscription event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Subscription webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // ===== USER FEATURES =====
  // Favorites routes
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
      
      // Check if already favorited
      const existing = await storage.checkFavorite(userId, truckId);
      if (existing) {
        return res.status(400).json({ message: "Truck already in favorites" });
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

  // Follows routes
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
      
      // Check if already following
      const existing = await storage.checkFollow(userId, truckId);
      if (existing) {
        return res.status(400).json({ message: "Already following this truck" });
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

  // ===== TRUCK FEATURES =====
  // Schedules routes
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
      const { truckId, title, date, startTime, endTime, lat, lng, note } = req.body;
      
      const schedule = await storage.createSchedule({
        truckId,
        title,
        date: new Date(date),
        startTime,
        endTime,
        lat,
        lng,
        note,
      });
      
      res.status(201).json(schedule);
    } catch (error) {
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

  // Updates/Posts routes
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
      const { truckId, message } = req.body;
      
      const update = await storage.createUpdate({ truckId, message });
      res.status(201).json(update);
    } catch (error) {
      console.error("Error creating update:", error);
      res.status(500).json({ message: "Failed to create update" });
    }
  });

  // Truck analytics route
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

  // ===== ORGANIZER FEATURES =====
  // Invites routes
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

  app.post('/api/events/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const { truckId } = req.body;
      
      const invite = await storage.createInvite({
        eventId,
        truckId,
      });
      
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

  // Applications routes
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
      
      const application = await storage.createApplication({
        eventId,
        truckId,
        note,
      });
      
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

  const httpServer = createServer(app);
  return httpServer;
}
