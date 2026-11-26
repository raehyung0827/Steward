import { bigint, boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
    "users", 
    {
        id: uuid("id").defaultRandom().primaryKey(),
        email: text("email").notNull().unique(),
        passwordHash: text("password_hash").notNull(),
        displayName: text("display_name").notNull(),
        timezone: text("timezone").notNull().default("UTC"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


export const devices = pgTable(
    "devices", 
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        tokenHash: text("token_hash").notNull().unique(),
        lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index("devies_user_id_idx").on(table.userId)],
);


export const usageDailyStats = pgTable(
    "usage_daily_stats",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade"}),
        startDate: date("start_date").notNull(),
        domain: text("domain").notNull(),
        durationSec: integer("duration_sec").notNull().default(0),
        requestCount: integer("request_count").notNull().default(0),
        bytesTransferred: bigint("byte_transferred", { mode: "number"}).notNull().default(0),
        isThirdParty: boolean("is_third_party").notNull().default(false),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("usage_daily_stats_user_date_domain_uidx").on(table.userId, table.startDate, table.domain),
    ],
);


export const rules = pgTable(
    "rules",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      domain: text("domain").notNull(),
      dailyLimitMin: integer("daily_limit_min").notNull(), // 0 = always blocked
      isBlocked: boolean("is_blocked").notNull().default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [uniqueIndex("rules_user_domain_uidx").on(table.userId, table.domain)],
  );
  

  export const accountabilityPartners = pgTable(
    "accountability_partners",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      webhookUrl: text("webhook_url").notNull(),
      webhookSecret: text("webhook_secret").notNull(),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index("partners_user_id_idx").on(table.userId)],
  );
  
  
  export const webhookDeliveries = pgTable(
    "webhook_deliveries",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      partnerId: uuid("partner_id")
        .notNull()
        .references(() => accountabilityPartners.id, { onDelete: "cascade" }),
      eventType: text("event_type").notNull(), // "limit_exceeded" | "harmful_site" | "heartbeat_lost"
      payload: jsonb("payload").notNull(),
      status: text("status").notNull().default("pending"), // pending | delivered | failed | dlq
      attempts: integer("attempts").notNull().default(0),
      lastStatusCode: integer("last_status_code"),
      lastError: text("last_error"),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
      deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    },
    (table) => [index("webhook_deliveries_partner_status_idx").on(table.partnerId, table.status)],
  );