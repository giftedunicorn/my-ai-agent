import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod/v4";

// Type for the caller - inferred from usage instead of importing AppRouter
type CallerType = {
  post: {
    create: (input: {
      userId: number;
      title: string;
      content: string;
      published?: boolean;
    }) => Promise<any>;
    listByUser: (input: { userId: number }) => Promise<any[]>;
    list: () => Promise<any[]>;
  };
};

export function createPostTools(caller: CallerType) {
  const createPostTool = new DynamicStructuredTool({
    name: "create_post",
    description:
      "Create a new blog post for a specific user. You must provide the userId of the author, along with the post title and content. Optionally specify if it should be published immediately.",
    schema: z.object({
      userId: z
        .number()
        .int()
        .positive()
        .describe("The ID of the user who is creating the post"),
      title: z.string().describe("The post title"),
      content: z.string().describe("The post content/body"),
      published: z
        .boolean()
        .optional()
        .describe("Whether to publish immediately (default: false)"),
    }),
    func: async (input) => {
      const { userId, title, content, published } = input as {
        userId: number;
        title: string;
        content: string;
        published?: boolean;
      };
      const post = await caller.post.create({
        userId,
        title,
        content,
        published,
      });
      return `Successfully created post: "${post.title}" (ID: ${post.id}) for user ${post.userId}. Published: ${post.published}`;
    },
  });

  const getPostsByUserTool = new DynamicStructuredTool({
    name: "get_posts_by_user",
    description:
      "Get all posts created by a specific user. Use this to see what a user has written or to check a user's posts.",
    schema: z.object({
      userId: z
        .number()
        .int()
        .positive()
        .describe("The user's ID whose posts you want to retrieve"),
    }),
    func: async (input) => {
      const { userId } = input as { userId: number };
      const posts = await caller.post.listByUser({ userId });
      if (posts.length === 0) {
        return `User ${userId} has not created any posts yet.`;
      }
      return JSON.stringify(
        posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          published: p.published,
          contentPreview: p.content.substring(0, 100) + "...",
          createdAt: p.createdAt,
        })),
        null,
        2,
      );
    },
  });

  const listPostsTool = new DynamicStructuredTool({
    name: "list_posts",
    description:
      "Get a list of all posts in the database with their authors. Use this to see all posts across all users.",
    schema: z.object({}),
    func: async () => {
      const posts = await caller.post.list();
      if (posts.length === 0) {
        return "No posts found in the database.";
      }
      return JSON.stringify(
        posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          authorName: p.user?.name ?? "Unknown",
          published: p.published,
          createdAt: p.createdAt,
        })),
        null,
        2,
      );
    },
  });

  return [createPostTool, getPostsByUserTool, listPostsTool];
}
