import {
  users,
  trucks,
  events,
  bookings,
  truckUnavailability,
  subscriptions,
  type User,
  type UpsertUser,
  type Truck,
  type InsertTruck,
  type Event,
  type InsertEvent,
  type Booking,
  type InsertBooking,
  type TruckUnavailability,
  type InsertTruckUnavailability,
  type Subscription,
  type InsertSubscription,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Truck operations
  getAllTrucks(): Promise<Truck[]>;
  getTruckById(id: number): Promise<Truck | undefined>;
  getTrucksByOwner(ownerId: string): Promise<Truck[]>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  updateTruck(id: number, data: Partial<Truck>): Promise<Truck | undefined>;
  
  // Event operations
  getAllEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  getEventsByOrganizer(organizerId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined>;
  
  // Booking operations
  getAllBookings(): Promise<Booking[]>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingsByTruck(truckId: number): Promise<Booking[]>;
  getBookingsByEvent(eventId: number): Promise<Booking[]>;
  getBookingsByTruckOwner(ownerId: string): Promise<Booking[]>;
  getBookingsByEventOrganizer(organizerId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updateBookingPayment(id: number, data: Partial<Booking>): Promise<Booking | undefined>;
  
  // Truck unavailability operations
  getUnavailabilityById(id: number): Promise<TruckUnavailability | undefined>;
  getUnavailabilityByTruck(truckId: number): Promise<TruckUnavailability[]>;
  addUnavailability(data: InsertTruckUnavailability): Promise<TruckUnavailability>;
  removeUnavailability(id: number): Promise<void>;
  
  // Subscription operations
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  upsertSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // Handle unique email constraint violation
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        // Check if a user with this email already exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, userData.email!));
        if (existingUser) {
          // Update the existing user's ID to match the new OIDC sub
          const [updatedUser] = await db
            .update(users)
            .set({ 
              id: userData.id,
              ...userData,
              updatedAt: new Date() 
            })
            .where(eq(users.email, userData.email!))
            .returning();
          return updatedUser;
        }
      }
      throw error;
    }
  }

  async updateUserProfile(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Truck operations
  async getAllTrucks(): Promise<Truck[]> {
    return await db.select().from(trucks).where(eq(trucks.isActive, true)).orderBy(desc(trucks.createdAt));
  }

  async getTruckById(id: number): Promise<Truck | undefined> {
    const [truck] = await db.select().from(trucks).where(eq(trucks.id, id));
    return truck;
  }

  async getTrucksByOwner(ownerId: string): Promise<Truck[]> {
    return await db.select().from(trucks).where(eq(trucks.ownerId, ownerId)).orderBy(desc(trucks.createdAt));
  }

  async createTruck(truckData: InsertTruck): Promise<Truck> {
    const [truck] = await db.insert(trucks).values(truckData).returning();
    return truck;
  }

  async updateTruck(id: number, data: Partial<Truck>): Promise<Truck | undefined> {
    const [truck] = await db
      .update(trucks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trucks.id, id))
      .returning();
    return truck;
  }

  // Event operations
  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.isActive, true)).orderBy(events.date);
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.organizerId, organizerId)).orderBy(desc(events.createdAt));
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData).returning();
    return event;
  }

  async updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  // Booking operations
  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByTruck(truckId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.truckId, truckId)).orderBy(desc(bookings.createdAt));
  }

  async getBookingsByEvent(eventId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.eventId, eventId)).orderBy(desc(bookings.createdAt));
  }

  async getBookingsByTruckOwner(ownerId: string): Promise<Booking[]> {
    const result = await db
      .select({
        booking: bookings,
      })
      .from(bookings)
      .innerJoin(trucks, eq(bookings.truckId, trucks.id))
      .where(eq(trucks.ownerId, ownerId))
      .orderBy(desc(bookings.createdAt));
    
    return result.map(r => r.booking);
  }

  async getBookingsByEventOrganizer(organizerId: string): Promise<Booking[]> {
    const result = await db
      .select({
        booking: bookings,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(events.organizerId, organizerId))
      .orderBy(desc(bookings.createdAt));
    
    return result.map(r => r.booking);
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(bookingData).returning();
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async updateBookingPayment(id: number, data: Partial<Booking>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Truck unavailability operations
  async getUnavailabilityById(id: number): Promise<TruckUnavailability | undefined> {
    const [unavailable] = await db
      .select()
      .from(truckUnavailability)
      .where(eq(truckUnavailability.id, id));
    return unavailable;
  }

  async getUnavailabilityByTruck(truckId: number): Promise<TruckUnavailability[]> {
    return await db
      .select()
      .from(truckUnavailability)
      .where(eq(truckUnavailability.truckId, truckId))
      .orderBy(truckUnavailability.blockedDate);
  }

  async addUnavailability(data: InsertTruckUnavailability): Promise<TruckUnavailability> {
    const [unavailable] = await db
      .insert(truckUnavailability)
      .values(data)
      .returning();
    return unavailable;
  }

  async removeUnavailability(id: number): Promise<void> {
    await db
      .delete(truckUnavailability)
      .where(eq(truckUnavailability.id, id));
  }

  // Subscription operations
  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async upsertSubscription(data: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    return subscription;
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return subscription;
  }
}

export const storage = new DatabaseStorage();
