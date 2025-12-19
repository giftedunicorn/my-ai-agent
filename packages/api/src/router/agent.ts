import type { TRPCRouterRecord } from "@trpc/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { z } from "zod/v4";

import { desc } from "@acme/db";
import { Message } from "@acme/db/schema";

import { createPostTools, createUserTools } from "../tools";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { postRouter } from "./post";
import { userRouter } from "./user";

/**
 * System prompt for the AI agent
 * Explains the agent's role and available tools
 */
const AGENT_SYSTEM_PROMPT = `You are an AI assistant that helps manage a blog platform with users and posts.

You have access to tools that can:
- User management: create users, get user details, list all users, count total users
- Post management: create posts for users, get posts by user, list all posts

When users ask you to perform actions:
1. Use the appropriate tools to complete the task
2. Be conversational and friendly in your responses
3. Provide clear confirmation of what you've done with specific details (IDs, names)
4. If you need information (like a user ID), first use list or get tools to find it
5. When creating mock data, use realistic names, emails, and content

For example:
- "create some mock users" → Use create_user tool multiple times with realistic data, then confirm what you created
- "create posts for user 1" → Use create_post tool with userId=1, confirm with post titles and IDs
- "how many users do we have?" → Use count_users tool and provide a friendly response

Always confirm successful operations and provide relevant details. Be educational and explain what you're doing since this is a tutorial demonstration!`;

export const agentRouter = {
  /**
   * Send a message to the AI agent and get response
   * The agent can use tools to interact with the database
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Save user message to database
      const [userMessage] = await ctx.db
        .insert(Message)
        .values({
          role: "user",
          content: input.message,
        })
        .returning();

      // 2. Get conversation history (last 10 messages)
      const history = await ctx.db
        .select()
        .from(Message)
        .orderBy(desc(Message.createdAt))
        .limit(10);

      // Convert to chronological order
      const previousMessages = history.reverse();

      // 3. Build conversation messages for LangChain
      const conversationMessages = [
        ...previousMessages.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        })),
        {
          role: "user" as const,
          content: input.message,
        },
      ];

      // 4. Create tRPC caller for tools
      // Create a temporary router with just user and post to avoid circular dependency
      const toolsRouter = createTRPCRouter({
        user: userRouter,
        post: postRouter,
      });
      const caller = toolsRouter.createCaller(ctx);

      // 5. Initialize tools
      const tools = [...createUserTools(caller), ...createPostTools(caller)];

      // 6. Create LangChain agent
      const agent = createAgent({
        model: new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          model: "gemini-3-pro-preview",
          temperature: 0.7,
        }),
        tools,
        systemPrompt: AGENT_SYSTEM_PROMPT,
      });

      // 7. Invoke agent with conversation history
      const result = await agent.invoke({
        messages: conversationMessages,
      });

      // 8. Extract the AI response from result messages
      const lastMessage = result.messages[result.messages.length - 1];
      const aiResponse =
        (typeof lastMessage?.content === "string"
          ? lastMessage.content
          : Array.isArray(lastMessage?.content)
            ? lastMessage.content
                .map((c: unknown) =>
                  typeof c === "string"
                    ? c
                    : (c as { text?: string }).text || "",
                )
                .join("")
            : "") || "";

      // 9. Extract tool calls from result messages
      const toolCalls: {
        toolName: string;
        input: Record<string, unknown>;
        output: Record<string, unknown>;
        timestamp: string;
        success: boolean;
      }[] = [];

      // Parse tool calls from messages
      for (const msg of result.messages) {
        if ("tool_calls" in msg && Array.isArray(msg.tool_calls)) {
          const msgToolCalls = msg.tool_calls as {
            name?: string;
            args?: unknown;
          }[];
          for (const toolCall of msgToolCalls) {
            toolCalls.push({
              toolName: toolCall.name || "unknown",
              input: toolCall.args as Record<string, unknown>,
              output: {}, // Tool output is in separate messages
              timestamp: new Date().toISOString(),
              success: true,
            });
          }
        }
      }

      // 10. Save agent response to database
      const [assistantMessage] = await ctx.db
        .insert(Message)
        .values({
          role: "assistant",
          content: aiResponse,
        })
        .returning();

      return {
        userMessage,
        assistantMessage,
        // Include tool calls for visualization in UI
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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
