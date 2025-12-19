import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Message table for chatbot
export const Message = pgTable("message", (t) => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  role: t.varchar({ length: 20 }).notNull(), // 'user' or 'assistant'
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const CreateMessageSchema = createInsertSchema(Message, {
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
}).omit({
  id: true,
  createdAt: true,
});

// User table for blog platform
export const User = pgTable("user", (t) => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.varchar({ length: 255 }).notNull(),
  email: t.varchar({ length: 255 }).notNull().unique(),
  bio: t.text(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp().defaultNow().notNull(),
}));

export const UserRelations = relations(User, ({ many }) => ({
  posts: many(Post),
}));

export const CreateUserSchema = createInsertSchema(User, {
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  bio: z.string().max(1000).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = CreateUserSchema.partial();

// Post table for blog platform
export const Post = pgTable("post", (t) => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: t.integer().notNull().references(() => User.id, { onDelete: "cascade" }),
  title: t.varchar({ length: 500 }).notNull(),
  content: t.text().notNull(),
  published: t.boolean().default(false).notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp().defaultNow().notNull(),
}));

export const PostRelations = relations(Post, ({ one }) => ({
  user: one(User, {
    fields: [Post.userId],
    references: [User.id],
  }),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  userId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  published: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdatePostSchema = CreatePostSchema.partial();
