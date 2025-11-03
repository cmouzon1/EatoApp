import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTruckSchema, insertEventSchema, insertBookingSchema, insertTruckUnavailabilitySchema } from "@shared/schema";
import { z } from "zod";
import { sendNewBookingNotification, sendBookingAcceptedNotification, sendBookingDeclinedNotification } from "./email";
import Stripe from "stripe";

// Reference: blueprint:javascript_stripe for Stripe integration
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate input
      const profileSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phoneNumber: z.string().optional(),
        bio: z.string().optional(),
        userRole: z.enum(["truck_owner", "event_organizer"]).optional(),
      });
      
      const validatedData = profileSchema.parse(req.body);
      
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

  // Stripe webhook to handle payment confirmations
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // In production, you'd use a webhook secret for verification
      // For now, we'll just parse the event
      event = req.body;

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

  const httpServer = createServer(app);
  return httpServer;
}
