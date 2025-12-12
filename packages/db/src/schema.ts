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
