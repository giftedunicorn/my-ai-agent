import { chatRouter } from "./router/chat";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
