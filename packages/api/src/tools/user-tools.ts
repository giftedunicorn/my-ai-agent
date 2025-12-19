import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod/v4";

// Type for the caller - inferred from usage instead of importing AppRouter
type CallerType = {
  user: {
    create: (input: { name: string; email: string; bio?: string }) => Promise<any>;
    getById: (input: { id: number }) => Promise<any>;
    list: () => Promise<any[]>;
    count: () => Promise<number>;
  };
};

export function createUserTools(caller: CallerType) {
  const createUserTool = new DynamicStructuredTool({
    name: "create_user",
    description:
      "Create a new user in the database. Use this when asked to add, create, or register a user. Provide the user's name, email, and optionally a bio.",
    schema: z.object({
      name: z.string().describe("The user's full name"),
      email: z.string().email().describe("The user's email address"),
      bio: z
        .string()
        .optional()
        .describe("Optional biography or description about the user"),
    }),
    func: async (input) => {
      const { name, email, bio } = input as { name: string; email: string; bio?: string };
      const user = await caller.user.create({ name, email, bio });
      return `Successfully created user: ${user.name} (ID: ${user.id}, Email: ${user.email})`;
    },
  });

  const getUserTool = new DynamicStructuredTool({
    name: "get_user",
    description:
      "Get detailed information about a specific user by their ID, including their posts. Use this when you need to look up user details or check if a user exists.",
    schema: z.object({
      id: z.number().int().positive().describe("The user's ID"),
    }),
    func: async (input) => {
      const { id } = input as { id: number };
      const user = await caller.user.getById({ id });
      if (!user) return `User with ID ${id} not found`;
      return JSON.stringify(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          postCount: user.posts.length,
          createdAt: user.createdAt,
        },
        null,
        2,
      );
    },
  });

  const listUsersTool = new DynamicStructuredTool({
    name: "list_users",
    description:
      "Get a list of all users in the database. Use this to see who exists in the system or when asked to show all users.",
    schema: z.object({}),
    func: async () => {
      const users = await caller.user.list();
      if (users.length === 0) {
        return "No users found in the database.";
      }
      return JSON.stringify(
        users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })),
        null,
        2,
      );
    },
  });

  const countUsersTool = new DynamicStructuredTool({
    name: "count_users",
    description:
      "Count the total number of users in the database. Use this when asked 'how many users' or to get user statistics.",
    schema: z.object({}),
    func: async () => {
      const count = await caller.user.count();
      return `Total users in database: ${count}`;
    },
  });

  return [createUserTool, getUserTool, listUsersTool, countUsersTool];
}
