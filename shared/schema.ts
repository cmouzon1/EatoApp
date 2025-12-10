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

// Users table (required for Replit Auth + user roles)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userRole: varchar("user_role", { enum: ["truck_owner", "event_organizer", "user"] }),
  phoneNumber: varchar("phone_number"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions table for tiered user plans
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  tier: varchar("tier", { enum: ["free", "basic", "pro"] }).notNull().default("free"),
  status: varchar("status", { 
    enum: ["active", "canceled", "past_due", "incomplete", "trialing", "none"] 
  }).notNull().default("none"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  trucks: many(trucks),
  events: many(events),
  bookingsAsTruck: many(bookings, { relationName: "truckOwner" }),
  bookingsAsOrganizer: many(bookings, { relationName: "eventOrganizer" }),
  subscription: one(subscriptions),
}));

// Trucks table
export const trucks = pgTable("trucks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  cuisine: text("cuisine"),
  description: text("description"),
  images: text("images").array(),
  menuItems: jsonb("menu_items"), // Array of {name, description, price, imageUrl}
  priceRange: varchar("price_range"), // $, $$, $$$
  lat: real("lat"),
  lng: real("lng"),
  hours: text("hours"),
  socialLinks: jsonb("social_links"), // {instagram, facebook, website}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Truck unavailability table (for calendar blocking) - defined before trucksRelations
export const truckUnavailability = pgTable("truck_unavailability", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  blockedDate: timestamp("blocked_date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trucksRelations = relations(trucks, ({ one, many }) => ({
  owner: one(users, {
    fields: [trucks.ownerId],
    references: [users.id],
  }),
  bookings: many(bookings),
  unavailableDates: many(truckUnavailability),
}));

export const truckUnavailabilityRelations = relations(truckUnavailability, ({ one }) => ({
  truck: one(trucks, {
    fields: [truckUnavailability.truckId],
    references: [trucks.id],
  }),
}));

// Events table
export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date"),
  location: text("location"),
  lat: real("lat"),
  lng: real("lng"),
  expectedHeadcount: integer("expected_headcount"),
  cuisinesNeeded: text("cuisines_needed").array(),
  trucksNeeded: integer("trucks_needed"),
  budget: text("budget"),
  eventType: varchar("event_type"), // corporate, festival, wedding, private
  images: text("images").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

// Bookings/Applications table
export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  status: varchar("status", { enum: ["pending", "accepted", "declined", "completed"] }).default("pending"),
  message: text("message"),
  proposedPrice: text("proposed_price"),
  organizerNotes: text("organizer_notes"),
  paymentStatus: varchar("payment_status", { enum: ["unpaid", "pending", "paid", "refunded"] }).default("unpaid"),
  paymentIntentId: varchar("payment_intent_id"),
  depositAmount: integer("deposit_amount"), // Amount in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  truck: one(trucks, {
    fields: [bookings.truckId],
    references: [trucks.id],
  }),
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertTruckSchema = createInsertSchema(trucks).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTruckUnavailabilitySchema = createInsertSchema(truckUnavailability).omit({
  id: true as const,
  createdAt: true as const,
});

// TypeScript types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = z.infer<typeof insertTruckSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type TruckUnavailability = typeof truckUnavailability.$inferSelect;
export type InsertTruckUnavailability = z.infer<typeof insertTruckUnavailabilitySchema>;

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Favorites table - users can favorite trucks
export const favorites = pgTable("favorites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Follows table - users can follow trucks with alert preferences
export const follows = pgTable("follows", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  alertsEnabled: boolean("alerts_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const schedulesRelations = relations(schedules, ({ one }) => ({
  truck: one(trucks, {
    fields: [schedules.truckId],
    references: [trucks.id],
  }),
}));

// Updates table - truck status posts/announcements
export const updates = pgTable("updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const updatesRelations = relations(updates, ({ one }) => ({
  truck: one(trucks, {
    fields: [updates.truckId],
    references: [trucks.id],
  }),
}));

// Invites table - organizers invite trucks to events
export const invites = pgTable("invites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => events.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  status: varchar("status", { enum: ["pending", "accepted", "declined"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Applications table - trucks apply to events
export const applications = pgTable("applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: integer("event_id").notNull().references(() => events.id),
  truckId: integer("truck_id").notNull().references(() => trucks.id),
  note: text("note"),
  status: varchar("status", { enum: ["applied", "accepted", "rejected"] }).default("applied"),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// Insert schemas and types for new tables
export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true as const,
  createdAt: true as const,
});
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true as const,
  createdAt: true as const,
});
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true as const,
  createdAt: true as const,
});
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export const insertUpdateSchema = createInsertSchema(updates).omit({
  id: true as const,
  createdAt: true as const,
});
export type Update = typeof updates.$inferSelect;
export type InsertUpdate = z.infer<typeof insertUpdateSchema>;

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true as const,
  createdAt: true as const,
});
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true as const,
  createdAt: true as const,
});
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
