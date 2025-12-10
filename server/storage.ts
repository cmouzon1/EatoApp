import {
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
  type InsertUser,
  type Truck,
  type InsertTruck,
  type Event,
  type InsertEvent,
  type Favorite,
  type InsertFavorite,
  type Follow,
  type InsertFollow,
  type Schedule,
  type InsertSchedule,
  type Update,
  type InsertUpdate,
  type Invite,
  type InsertInvite,
  type Application,
  type InsertApplication,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Truck operations
  getAllTrucks(): Promise<Truck[]>;
  getTruckById(id: number): Promise<Truck | undefined>;
  getTrucksByOwner(ownerUserId: string): Promise<Truck[]>;
  createTruck(truck: InsertTruck): Promise<Truck>;
  updateTruck(id: number, data: Partial<Truck>): Promise<Truck | undefined>;
  deleteTruck(id: number): Promise<void>;
  
  // Event operations
  getAllEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  getEventsByOrganizer(organizerUserId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;
  
  // Favorites operations
  getFavoritesByUser(userId: string): Promise<Favorite[]>;
  addFavorite(data: InsertFavorite): Promise<Favorite>;
  removeFavorite(id: number): Promise<void>;
  checkFavorite(userId: string, truckId: number): Promise<Favorite | undefined>;
  
  // Follows operations
  getFollowsByUser(userId: string): Promise<Follow[]>;
  addFollow(data: InsertFollow): Promise<Follow>;
  updateFollow(id: number, data: Partial<Follow>): Promise<Follow | undefined>;
  removeFollow(id: number): Promise<void>;
  checkFollow(userId: string, truckId: number): Promise<Follow | undefined>;
  
  // Schedules operations
  getSchedulesByTruck(truckId: number): Promise<Schedule[]>;
  createSchedule(data: InsertSchedule): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;
  
  // Updates operations
  getUpdatesByTruck(truckId: number): Promise<Update[]>;
  createUpdate(data: InsertUpdate): Promise<Update>;
  
  // Invites operations
  getInvitesByEvent(eventId: number): Promise<Invite[]>;
  getInvitesByTruck(truckId: number): Promise<Invite[]>;
  createInvite(data: InsertInvite): Promise<Invite>;
  updateInviteStatus(id: number, status: string): Promise<Invite | undefined>;
  
  // Applications operations
  getApplicationsByEvent(eventId: number): Promise<Application[]>;
  getApplicationsByTruck(truckId: number): Promise<Application[]>;
  createApplication(data: InsertApplication): Promise<Application>;
  updateApplicationStatus(id: number, status: string): Promise<Application | undefined>;
  
  // Analytics
  getTruckAnalytics(truckId: number): Promise<{
    followers: number;
    favorites: number;
    invites: number;
    applications: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData as typeof users.$inferInsert).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
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

  async getTrucksByOwner(ownerUserId: string): Promise<Truck[]> {
    return await db.select().from(trucks).where(eq(trucks.ownerUserId, ownerUserId)).orderBy(desc(trucks.createdAt));
  }

  async createTruck(truckData: InsertTruck): Promise<Truck> {
    const [truck] = await db.insert(trucks).values(truckData as typeof trucks.$inferInsert).returning();
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

  async deleteTruck(id: number): Promise<void> {
    await db.delete(trucks).where(eq(trucks.id, id));
  }

  // Event operations
  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.status, "published")).orderBy(events.date);
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventsByOrganizer(organizerUserId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.organizerUserId, organizerUserId)).orderBy(desc(events.createdAt));
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData as typeof events.$inferInsert).returning();
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

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Favorites operations
  async getFavoritesByUser(userId: string): Promise<Favorite[]> {
    return await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(data: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values(data as typeof favorites.$inferInsert)
      .returning();
    return favorite;
  }

  async removeFavorite(id: number): Promise<void> {
    await db.delete(favorites).where(eq(favorites.id, id));
  }

  async checkFavorite(userId: string, truckId: number): Promise<Favorite | undefined> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.truckId, truckId)));
    return favorite;
  }

  // Follows operations
  async getFollowsByUser(userId: string): Promise<Follow[]> {
    return await db
      .select()
      .from(follows)
      .where(eq(follows.userId, userId))
      .orderBy(desc(follows.createdAt));
  }

  async addFollow(data: InsertFollow): Promise<Follow> {
    const [follow] = await db
      .insert(follows)
      .values(data as typeof follows.$inferInsert)
      .returning();
    return follow;
  }

  async updateFollow(id: number, data: Partial<Follow>): Promise<Follow | undefined> {
    const [follow] = await db
      .update(follows)
      .set(data)
      .where(eq(follows.id, id))
      .returning();
    return follow;
  }

  async removeFollow(id: number): Promise<void> {
    await db.delete(follows).where(eq(follows.id, id));
  }

  async checkFollow(userId: string, truckId: number): Promise<Follow | undefined> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.truckId, truckId)));
    return follow;
  }

  // Schedules operations
  async getSchedulesByTruck(truckId: number): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(eq(schedules.truckId, truckId))
      .orderBy(schedules.date);
  }

  async createSchedule(data: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values(data as typeof schedules.$inferInsert)
      .returning();
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Updates operations
  async getUpdatesByTruck(truckId: number): Promise<Update[]> {
    return await db
      .select()
      .from(updates)
      .where(eq(updates.truckId, truckId))
      .orderBy(desc(updates.createdAt));
  }

  async createUpdate(data: InsertUpdate): Promise<Update> {
    const [update] = await db
      .insert(updates)
      .values(data as typeof updates.$inferInsert)
      .returning();
    return update;
  }

  // Invites operations
  async getInvitesByEvent(eventId: number): Promise<Invite[]> {
    return await db
      .select()
      .from(invites)
      .where(eq(invites.eventId, eventId))
      .orderBy(desc(invites.createdAt));
  }

  async getInvitesByTruck(truckId: number): Promise<Invite[]> {
    return await db
      .select()
      .from(invites)
      .where(eq(invites.truckId, truckId))
      .orderBy(desc(invites.createdAt));
  }

  async createInvite(data: InsertInvite): Promise<Invite> {
    const [invite] = await db
      .insert(invites)
      .values(data as typeof invites.$inferInsert)
      .returning();
    return invite;
  }

  async updateInviteStatus(id: number, status: string): Promise<Invite | undefined> {
    const [invite] = await db
      .update(invites)
      .set({ status: status as "pending" | "accepted" | "declined" })
      .where(eq(invites.id, id))
      .returning();
    return invite;
  }

  // Applications operations
  async getApplicationsByEvent(eventId: number): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.eventId, eventId))
      .orderBy(desc(applications.createdAt));
  }

  async getApplicationsByTruck(truckId: number): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.truckId, truckId))
      .orderBy(desc(applications.createdAt));
  }

  async createApplication(data: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(data as typeof applications.$inferInsert)
      .returning();
    return application;
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set({ status: status as "applied" | "accepted" | "rejected" })
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  // Analytics
  async getTruckAnalytics(truckId: number): Promise<{
    followers: number;
    favorites: number;
    invites: number;
    applications: number;
  }> {
    const [followersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.truckId, truckId));
    
    const [favoritesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(eq(favorites.truckId, truckId));
    
    const [invitesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invites)
      .where(eq(invites.truckId, truckId));
    
    const [applicationsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(eq(applications.truckId, truckId));

    return {
      followers: Number(followersCount.count) || 0,
      favorites: Number(favoritesCount.count) || 0,
      invites: Number(invitesCount.count) || 0,
      applications: Number(applicationsCount.count) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
