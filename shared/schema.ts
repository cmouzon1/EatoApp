import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  integer,
  real,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  name: varchar("name"),
  role: varchar("role", { enum: ["user", "truck", "org"] }),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: varchar("subscription_tier", { enum: ["free", "basic", "pro"] }).default("free"),
  subscriptionRole: varchar("subscription_role", { enum: ["user", "truck", "org"] }),
  subscriptionStatus: varchar("subscription_status", { enum: ["none", "active", "past_due", "canceled"] }).default("none"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trucks table
export const trucks = pgTable("trucks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  cuisine: text("cuisine"),
  description: text("description"),
  city: text("city"),
  lat: real("lat"),
  lng: real("lng"),
  photoUrl: text("photo_url"),
  social: jsonb("social").$type<{ instagram?: string; facebook?: string; website?: string; email?: string }>(),
  hours: text("hours"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizerUserId: varchar("organizer_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  locationName: text("location_name"),
  lat: real("lat"),
  lng: real("lng"),
  minTrucks: integer("min_trucks"),
  maxTrucks: integer("max_trucks"),
  expectedAttendance: integer("expected_attendance"),
  cuisinePreferences: jsonb("cuisine_preferences").$type<string[]>(),
  status: varchar("status", { enum: ["draft", "published", "closed"] }).default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Favorites table - users can favorite trucks
export const favorites = pgTable("favorites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follows table - users can follow trucks with alert preferences
export const follows = pgTable("follows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  alertsEnabled: boolean("alerts_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedules table - truck location schedules
export const schedules = pgTable("schedules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  title: text("title"),
  date: timestamp("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  lat: real("lat"),
  lng: real("lng"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Updates table - truck status posts/announcements
export const updates = pgTable("updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invites table - organizers invite trucks to events
export const invites = pgTable("invites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => events.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  status: varchar("status", { enum: ["pending", "accepted", "declined"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Applications table - trucks apply to events
export const applications = pgTable("applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => events.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  note: text("note"),
  status: varchar("status", { enum: ["applied", "accepted", "rejected"] }).default("applied"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  trucks: many(trucks),
  events: many(events),
  favorites: many(favorites),
  follows: many(follows),
}));

export const trucksRelations = relations(trucks, ({ one, many }) => ({
  owner: one(users, {
    fields: [trucks.ownerUserId],
    references: [users.id],
  }),
  favorites: many(favorites),
  follows: many(follows),
  schedules: many(schedules),
  updates: many(updates),
  invites: many(invites),
  applications: many(applications),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerUserId],
    references: [users.id],
  }),
  invites: many(invites),
  applications: many(applications),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  truck: one(trucks, {
    fields: [favorites.truckId],
    references: [trucks.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, {
    fields: [follows.userId],
    references: [users.id],
  }),
  truck: one(trucks, {
    fields: [follows.truckId],
    references: [trucks.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  truck: one(trucks, {
    fields: [schedules.truckId],
    references: [trucks.id],
  }),
}));

export const updatesRelations = relations(updates, ({ one }) => ({
  truck: one(trucks, {
    fields: [updates.truckId],
    references: [trucks.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  event: one(events, {
    fields: [invites.eventId],
    references: [events.id],
  }),
  truck: one(trucks, {
    fields: [invites.truckId],
    references: [trucks.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  event: one(events, {
    fields: [applications.eventId],
    references: [events.id],
  }),
  truck: one(trucks, {
    fields: [applications.truckId],
    references: [trucks.id],
  }),
}));

// Zod schemas for validation
export const userSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().optional().nullable(),
  role: z.enum(["user", "truck", "org"]).optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
  stripeSubscriptionId: z.string().optional().nullable(),
  subscriptionTier: z.enum(["free", "basic", "pro"]).optional().nullable(),
  subscriptionRole: z.enum(["user", "truck", "org"]).optional().nullable(),
  subscriptionStatus: z.enum(["none", "active", "past_due", "canceled"]).optional().nullable(),
});

export const truckSchema = createSelectSchema(trucks);
export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = typeof trucks.$inferInsert;
export const insertTruckSchema = z.object({
  ownerUserId: z.string(),
  name: z.string().min(1),
  cuisine: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  social: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    website: z.string().optional(),
    email: z.string().optional(),
  }).optional().nullable(),
  hours: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const eventSchema = createSelectSchema(events);
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export const insertEventSchema = z.object({
  organizerUserId: z.string(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.coerce.date().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  locationName: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  minTrucks: z.number().optional().nullable(),
  maxTrucks: z.number().optional().nullable(),
  expectedAttendance: z.number().optional().nullable(),
  cuisinePreferences: z.array(z.string()).optional().nullable(),
  status: z.enum(["draft", "published", "closed"]).optional(),
});

export const favoriteSchema = createSelectSchema(favorites);
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
export const insertFavoriteSchema = z.object({
  userId: z.string(),
  truckId: z.number(),
});

export const followSchema = createSelectSchema(follows);
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = typeof follows.$inferInsert;
export const insertFollowSchema = z.object({
  userId: z.string(),
  truckId: z.number(),
  alertsEnabled: z.boolean().optional(),
});

export const scheduleSchema = createSelectSchema(schedules);
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
export const insertScheduleSchema = z.object({
  truckId: z.number(),
  title: z.string().optional().nullable(),
  date: z.coerce.date(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const updateSchema = createSelectSchema(updates);
export type Update = typeof updates.$inferSelect;
export type InsertUpdate = typeof updates.$inferInsert;
export const insertUpdateSchema = z.object({
  truckId: z.number(),
  message: z.string().min(1),
});

export const inviteSchema = createSelectSchema(invites);
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
export const insertInviteSchema = z.object({
  eventId: z.number(),
  truckId: z.number(),
  status: z.enum(["pending", "accepted", "declined"]).optional(),
});

export const applicationSchema = createSelectSchema(applications);
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
export const insertApplicationSchema = z.object({
  eventId: z.number(),
  truckId: z.number(),
  note: z.string().optional().nullable(),
  status: z.enum(["applied", "accepted", "rejected"]).optional(),
});
