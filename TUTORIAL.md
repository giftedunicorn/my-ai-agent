# Building an AI Chatbot with Create T3 Turbo

Build a ChatGPT-like chatbot using Create T3 Turbo, Next.js, tRPC, and Google Gemini.

## Tech Stack

- Create T3 Turbo (Monorepo)
- Next.js 15 + React 19
- tRPC (Type-safe API)
- Drizzle ORM + PostgreSQL
- Google Gemini AI
- Tailwind CSS

---

## Step 1: Setup

```bash
pnpm create t3-turbo@latest my-chatbot
cd my-chatbot
pnpm install
```

Choose: Next.js, tRPC, PostgreSQL, no auth.

---

## Step 2: Install AI SDK

```bash
cd packages/api
pnpm add ai @ai-sdk/google
```

Create `.env`:

```env
POSTGRES_URL="postgresql://user:pass@localhost:5432/chatbot"
GOOGLE_GENERATIVE_AI_API_KEY="your_key"
```

Get API key: https://aistudio.google.com/app/apikey

---

## Step 3: Database Schema

Edit `packages/db/src/schema.ts`:

```typescript
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const Message = pgTable("message", (t) => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  role: t.varchar({ length: 20 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const CreateMessageSchema = createInsertSchema(Message, {
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
}).omit({ id: true, createdAt: true });
```

Push schema: `pnpm db:push`

---

## Step 4: Chat API

Create `packages/api/src/router/chat.ts`:

```typescript
import type { TRPCRouterRecord } from "@trpc/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod/v4";

import { desc } from "@acme/db";
import { Message } from "@acme/db/schema";

import { publicProcedure } from "../trpc";

const SYSTEM_PROMPT = "You are a helpful AI assistant.";

export const chatRouter = {
  sendChat: publicProcedure
    .input(z.object({ content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(Message)
        .values({ role: "user", content: input.content });

      const history = await ctx.db
        .select()
        .from(Message)
        .orderBy(desc(Message.createdAt))
        .limit(10);

      const { text } = await generateText({
        model: google("gemini-1.5-flash"),
        system: SYSTEM_PROMPT,
        messages: history.reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      return await ctx.db
        .insert(Message)
        .values({ role: "assistant", content: text })
        .returning();
    }),

  getMessages: publicProcedure.query(({ ctx }) =>
    ctx.db.select().from(Message).orderBy(Message.createdAt),
  ),

  clearMessages: publicProcedure.mutation(({ ctx }) => ctx.db.delete(Message)),
} satisfies TRPCRouterRecord;
```

Register in `packages/api/src/root.ts`:

```typescript
import { chatRouter } from "./router/chat";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  chat: chatRouter,
});
```

---

## Step 5: Chat UI

Create `apps/nextjs/src/app/chat/page.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RouterOutputs } from "@acme/api";
import { useTRPC } from "~/trpc/react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: messages } = useQuery(trpc.chat.getMessages.queryOptions());

  const sendMsg = useMutation(trpc.chat.sendChat.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries(trpc.chat.pathFilter());
      setInput("");
      setLoading(false);
    },
  }));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    sendMsg.mutate({ content: input.trim() });
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="border-b bg-white p-4">
        <h1 className="text-xl font-bold">AI Chat</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages?.map((m: RouterOutputs["chat"]["getMessages"][number]) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block rounded-2xl px-4 py-3 ${
                m.role === "user" ? "bg-blue-500 text-white" : "bg-white border"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t bg-white p-4">
        <div className="mx-auto flex max-w-4xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            className="flex-1 rounded-lg border px-4 py-3"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-lg bg-blue-500 px-6 py-3 text-white disabled:bg-gray-300"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

Update `apps/nextjs/src/app/page.tsx`:

```typescript
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold">AI Chatbot</h1>
        <p className="mt-4">Built with T3 Turbo + Gemini</p>
        <Link href="/chat" className="mt-8 inline-block rounded-full bg-white px-10 py-3 text-blue-600">
          Start Chat
        </Link>
      </div>
    </main>
  );
}
```

Run: `pnpm dev` → http://localhost:3000

---

## Step 6: Custom Personalities

Edit `SYSTEM_PROMPT` in chat router:

**Luffy:**

```typescript
const SYSTEM_PROMPT = `You are Luffy from One Piece. Energetic, love meat and adventure. Say "I'm gonna be King of the Pirates!"`;
```

**Tony Stark:**

```typescript
const SYSTEM_PROMPT = `You are Tony Stark. Genius, witty, sarcastic. Mention tech and Stark Industries.`;
```

**Dynamic selection:**

```typescript
const PROMPTS = {
  default: "Helpful AI assistant",
  luffy: "Luffy from One Piece...",
  stark: "Tony Stark...",
};

.input(z.object({
  content: z.string(),
  character: z.enum(["default", "luffy", "stark"]).optional(),
}))
.mutation(async ({ ctx, input }) => {
  const prompt = PROMPTS[input.character || "default"];
  // use prompt in generateText
});
```

---

## Summary

Built a full-stack AI chatbot with:

- Type-safe tRPC APIs
- PostgreSQL persistence
- Google Gemini AI
- Custom personalities
- Modern UI

## Next Steps

- Add streaming
- Multiple sessions
- Auth & user management
- Deploy to Vercel

## Resources

- [T3 Turbo](https://github.com/t3-oss/create-t3-turbo)
- [AI SDK](https://sdk.vercel.ai/docs)
- [Gemini](https://ai.google.dev/docs)

Happy Coding!
