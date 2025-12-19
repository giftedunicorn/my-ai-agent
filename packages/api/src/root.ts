import { agentRouter } from "./router/agent";
import { postRouter } from "./router/post";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  agent: agentRouter,
  user: userRouter,
  post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
