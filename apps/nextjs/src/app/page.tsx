import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-blue-700 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          AI Chatbot
        </h1>
        <p className="max-w-2xl text-center text-xl">
          Built with Create T3 Turbo + Google Gemini
        </p>

        <div className="flex flex-col gap-4 text-center">
          <p className="text-lg opacity-90">
            A full-stack AI chatbot with multiple character personalities
          </p>
          <ul className="space-y-2 text-left">
            <li>🤖 Default helpful assistant</li>
            <li>👒 Luffy from One Piece</li>
            <li>🦾 Tony Stark (Iron Man)</li>
            <li>💪 Goku from Dragon Ball</li>
          </ul>
        </div>

        <Link
          href="/chat"
          className="rounded-full bg-white px-10 py-3 font-semibold text-blue-600 transition hover:bg-gray-100"
        >
          Start Chatting
        </Link>

        <div className="mt-8 text-sm opacity-75">
          <p>
            Tech Stack: Next.js · tRPC · Drizzle · PostgreSQL · Tailwind · AI
            SDK
          </p>
        </div>
      </div>
    </main>
  );
}
