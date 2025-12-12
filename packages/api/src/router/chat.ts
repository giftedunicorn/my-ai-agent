import type { TRPCRouterRecord } from "@trpc/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod/v4";

import { desc } from "@acme/db";
import { Message } from "@acme/db/schema";

import { publicProcedure } from "../trpc";

/**
 * System prompt for the AI chatbot
 * You can customize this to change the AI's personality and behavior
 */
const SYSTEM_PROMPTS = {
  default:
    "You are a friendly and helpful AI assistant. Please answer questions in a concise and clear manner.",
  luffy: `You are Monkey D. Luffy, the main character from One Piece and captain of the Straw Hat Pirates.

Personality traits:
- Energetic, optimistic, and never give up
- Speak simply and directly, often say "I'm gonna be King of the Pirates!"
- Love eating meat, especially huge chunks of meat
- Extremely loyal to friends, would do anything for crewmates
- A bit naive but very brave
- Use catchphrases like "Hehe", "That's awesome!", "That's interesting!"

Speaking style:
- Use simple, enthusiastic language
- Often mention adventure, friends, and dreams
- Show great enthusiasm for food (especially meat)
- When facing difficulties, say "I'll never give up!"

Please answer user questions in Luffy's tone and style.`,
  ironman: `You are Tony Stark (Iron Man), genius inventor and superhero.

Personality traits:
- Intelligent, confident, a bit narcissistic
- Like to respond with humor and sarcasm
- Often mention technology and inventions
- Speak with a bit of arrogance but very charming

Speaking style:
- Use smart, witty language
- Occasionally joke or self-deprecate
- Mention Stark Industries and technology
- Call others "kid", "buddy", etc.`,
  goku: `You are Son Goku, the main character from Dragon Ball and Super Saiyan warrior.

Personality traits:
- Love fighting and always want to get stronger
- Simple, kind, optimistic
- Love eating a lot
- Passionate about training and fighting

Speaking style:
- Use simple, direct language
- Often mention training, getting stronger, fighting
- Show great interest in food
- Use catchphrases like "Yoshi", "Not bad!"`,
};

export const chatRouter = {
  /**
   * Send a chat message and get AI response
   * This endpoint:
   * 1. Saves user message to database
   * 2. Retrieves recent chat history
   * 3. Calls Google Gemini API
   * 4. Saves AI response to database
   */
  sendChat: publicProcedure
    .input(
      z.object({
        content: z.string().min(1).max(10000),
        character: z
          .enum(["default", "luffy", "ironman", "goku"])
          .optional()
          .default("default"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Save user message to database
      const userMessage = await ctx.db
        .insert(Message)
        .values({
          role: "user",
          content: input.content,
        })
        .returning();

      // 2. Get recent message history (last 10 messages for context)
      const history = await ctx.db
        .select()
        .from(Message)
        .orderBy(desc(Message.createdAt))
        .limit(10);

      // Reverse to get chronological order (oldest to newest)
      const messages = history.reverse();

      // 3. Call Google Gemini API
      const systemPrompt = SYSTEM_PROMPTS[input.character];

      const model = google("gemini-2.5-flash"); // faster and cheaper
      // const model = google("gemini-3-pro-image-preview"); // more powerful and expensive

      const { text } = await generateText({
        model,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      });

      // 4. Save AI response to database
      const assistantMessage = await ctx.db
        .insert(Message)
        .values({
          role: "assistant",
          content: text,
        })
        .returning();

      return {
        userMessage: userMessage[0],
        assistantMessage: assistantMessage[0],
      };
    }),

  /**
   * Get all chat messages in chronological order
   */
  getMessages: publicProcedure.query(({ ctx }) => {
    return ctx.db.select().from(Message).orderBy(Message.createdAt);
  }),

  /**
   * Clear all chat messages
   * Useful for starting a fresh conversation
   */
  clearMessages: publicProcedure.mutation(({ ctx }) => {
    return ctx.db.delete(Message);
  }),
} satisfies TRPCRouterRecord;
