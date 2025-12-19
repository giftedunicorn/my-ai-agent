import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          AI Agent Demo
        </h1>
        <p className="max-w-2xl text-center text-xl">
          Built with Create T3 Turbo + LangChain + Google Gemini
        </p>

        <div className="flex flex-col gap-4 text-center">
          <p className="text-lg opacity-90">
            An AI agent tutorial demonstrating LangChain tool usage with a blog
            platform management system
          </p>
          <div className="mt-4">
            <p className="mb-2 font-semibold">Try these example prompts:</p>
            <ul className="space-y-2 text-left">
              <li>💬 "create 3 mock users for testing"</li>
              <li>💬 "how many users do we have?"</li>
              <li>💬 "create 2 posts for user 1"</li>
              <li>💬 "show me all users in the database"</li>
            </ul>
          </div>
        </div>

        <Link
          href="/chat"
          className="rounded-full bg-white px-10 py-3 font-semibold text-blue-600 transition hover:bg-gray-100"
        >
          Start Demo
        </Link>

        <div className="mt-8 text-sm opacity-75">
          <p>
            Tech Stack: Next.js · tRPC · Drizzle · PostgreSQL · Tailwind ·
            LangChain
          </p>
        </div>
      </div>
    </main>
  );
}
