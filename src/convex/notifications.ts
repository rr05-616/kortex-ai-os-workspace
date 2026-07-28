import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Get unread notification count */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return notifications.length;
  },
});

/** Get recent notifications */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 20;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/** Mark a notification as read */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Not found");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

/** Mark all notifications as read */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const notification of notifications) {
      if (!notification.read) {
        await ctx.db.patch(notification._id, { read: true });
      }
    }
  },
});

/** Create a notification */
export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("deadline"),
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("sprint"),
      v.literal("ai_recommendation"),
      v.literal("risk_alert"),
      v.literal("dependency_warning"),
      v.literal("workspace_update"),
    ),
    title: v.string(),
    content: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      content: args.content,
      projectId: args.projectId,
      taskId: args.taskId,
      read: false,
      createdAt: Date.now(),
    });
  },
});
