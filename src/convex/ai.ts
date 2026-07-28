import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Get AI conversations for the current user */
export const listConversations = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let conversations;
    if (args.projectId) {
      conversations = await ctx.db
        .query("aiConversations")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
        .collect();
    } else {
      conversations = await ctx.db
        .query("aiConversations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
    }

    return conversations
      .filter((c) => c.userId === user._id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/** Get a single conversation with all messages */
export const getConversation = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) return null;

    return conversation;
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/** Create a new AI conversation */
export const createConversation = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    title: v.optional(v.string()),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    const conversationId = await ctx.db.insert("aiConversations", {
      userId: user._id,
      projectId: args.projectId,
      title: args.title ?? "New conversation",
      messages: [
        {
          role: "user",
          content: args.initialMessage,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    return conversationId;
  },
});

/** Add a message to an existing conversation */
export const addMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const messages = [
      ...conversation.messages,
      {
        role: args.role,
        content: args.content,
        timestamp: Date.now(),
      },
    ];

    await ctx.db.patch(args.conversationId, {
      messages,
      updatedAt: Date.now(),
    });

    return messages;
  },
});

/** Delete a conversation */
export const deleteConversation = mutation({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Not found");
    }

    await ctx.db.delete(args.conversationId);
  },
});
