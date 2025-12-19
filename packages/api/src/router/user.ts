import { z } from "zod/v4";
import { count, desc, eq } from "drizzle-orm";

import { CreateUserSchema, UpdateUserSchema, User } from "@acme/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  // Create a new user
  create: publicProcedure
    .input(CreateUserSchema)
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .insert(User)
        .values(input)
        .returning();
      return user;
    }),

  // Update an existing user
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        data: UpdateUserSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .update(User)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(User.id, input.id))
        .returning();
      return user;
    }),

  // Get user by ID with posts
  getById: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.User.findFirst({
        where: eq(User.id, input.id),
        with: { posts: true },
      });
    }),

  // List all users
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.User.findMany({
      orderBy: desc(User.createdAt),
    });
  }),

  // Count total users
  count: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: count() })
      .from(User);
    return result[0]?.count ?? 0;
  }),
});
