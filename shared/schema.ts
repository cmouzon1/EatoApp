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
// Note: id is NOT omitted for users since OIDC provides a sub claim that becomes the user id
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true as const,
  updatedAt: true as const,
});
export const userSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertTruckSchema = createInsertSchema(trucks).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});
export const truckSchema = createSelectSchema(trucks);
export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = z.infer<typeof insertTruckSchema>;

export const insertEventSchema = createInsertSchema(events).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});
export const eventSchema = createSelectSchema(events);
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true as const,
  createdAt: true as const,
});
export const favoriteSchema = createSelectSchema(favorites);
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true as const,
  createdAt: true as const,
});
export const followSchema = createSelectSchema(follows);
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true as const,
  createdAt: true as const,
});
export const scheduleSchema = createSelectSchema(schedules);
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export const insertUpdateSchema = createInsertSchema(updates).omit({
  id: true as const,
  createdAt: true as const,
});
export const updateSchema = createSelectSchema(updates);
export type Update = typeof updates.$inferSelect;
export type InsertUpdate = z.infer<typeof insertUpdateSchema>;

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true as const,
  createdAt: true as const,
});
export const inviteSchema = createSelectSchema(invites);
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true as const,
  createdAt: true as const,
});
export const applicationSchema = createSelectSchema(applications);
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
