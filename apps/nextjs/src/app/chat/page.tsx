"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";

import { useTRPC } from "~/trpc/react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Fetch all messages
  const { data: messages } = useQuery(trpc.agent.getMessages.queryOptions());

  // Send message mutation
  const sendMessage = useMutation(
    trpc.agent.chat.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.agent.pathFilter());
        setInput("");
        setIsLoading(false);
      },
      onError: (error) => {
        console.error("Failed to send message:", error);
        setIsLoading(false);
      },
    }),
  );

  // Clear messages mutation
  const clearMessages = useMutation(
    trpc.agent.clearMessages.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.agent.pathFilter());
      },
    }),
  );

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    sendMessage.mutate({ message: input.trim() });
  };

  // Handle Enter key press (Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            AI Agent Demo - Blog Platform Manager
          </h1>
          <button
            onClick={() => clearMessages.mutate()}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Empty state */}
          {messages?.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg">Start your first conversation!</p>
              <p className="mt-2 text-sm">
                Try: "create 3 mock users" or "how many users do we have?"
              </p>
            </div>
          )}

          {/* Message list */}
          {messages?.map(
            (message: RouterOutputs["agent"]["getMessages"][number]) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "border bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ),
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Shift + Enter for new line)"
              className="flex-1 resize-none rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
