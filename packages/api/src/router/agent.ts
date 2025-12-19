import type { TRPCRouterRecord } from "@trpc/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod/v4";

import { desc } from "@acme/db";
import { Message } from "@acme/db/schema";
import { createPostTools, createUserTools } from "@acme/tools";

import { publicProcedure } from "../trpc";
import { appRouter } from "../root";

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
      // 1. Initialize the LLM
      const model = new ChatGoogleGenerativeAI({
        modelName: "gemini-2.0-flash-exp",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        temperature: 0.7,
      });

      // 2. Create tRPC caller for tools
      const caller = appRouter.createCaller(ctx);

      // 3. Initialize tools
      const tools = [
        ...createUserTools(caller),
        ...createPostTools(caller),
      ];

      // 4. Create agent prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", AGENT_SYSTEM_PROMPT],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
      ]);

      // 5. Create the agent
      const agent = await createToolCallingAgent({
        llm: model,
        tools,
        prompt,
      });

      // 6. Create agent executor
      const executor = new AgentExecutor({
        agent,
        tools,
        verbose: true, // Helpful for debugging and tutorial purposes
      });

      // 7. Save user message to database
      const [userMessage] = await ctx.db
        .insert(Message)
        .values({
          role: "user",
          content: input.message,
        })
        .returning();

      // 8. Get conversation history (last 10 messages)
      const history = await ctx.db
        .select()
        .from(Message)
        .orderBy(desc(Message.createdAt))
        .limit(10);

      // Convert to chronological order
      const messages = history.reverse();

      // Format chat history for LangChain
      const chatHistory = messages.map((msg) => {
        if (msg.role === "user") {
          return { type: "human" as const, content: msg.content };
        } else {
          return { type: "ai" as const, content: msg.content };
        }
      });

      // 9. Execute the agent
      const result = await executor.invoke({
        input: input.message,
        chat_history: chatHistory,
      });

      // 10. Save agent response to database
      const [assistantMessage] = await ctx.db
        .insert(Message)
        .values({
          role: "assistant",
          content: result.output,
        })
        .returning();

      return {
        userMessage,
        assistantMessage,
        // Include intermediate steps for tool call visualization
        intermediateSteps: result.intermediateSteps?.map((step) => ({
          action: {
            tool: step.action.tool,
            toolInput: step.action.toolInput,
          },
          observation: step.observation,
        })),
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
