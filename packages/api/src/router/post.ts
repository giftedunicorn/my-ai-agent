import { z } from "zod/v4";
import { desc, eq } from "drizzle-orm";

import { CreatePostSchema, Post, UpdatePostSchema } from "@acme/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const postRouter = createTRPCRouter({
  // Create a new post
  create: publicProcedure
    .input(CreatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .insert(Post)
        .values(input)
        .returning();
      return post;
    }),

  // Update an existing post
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: UpdatePostSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .update(Post)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(Post.id, input.id))
        .returning();
      return post;
    }),

  // Get post by ID with user
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.Post.findFirst({
        where: eq(Post.id, input.id),
        with: { user: true },
      });
    }),

  // List all posts with optional limit
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.Post.findMany({
        orderBy: desc(Post.createdAt),
        limit: input?.limit ?? 50,
        with: { user: true },
      });
    }),

  // List posts by user ID
  listByUser: publicProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.Post.findMany({
        where: eq(Post.userId, input.userId),
        orderBy: desc(Post.createdAt),
      });
    }),
});
