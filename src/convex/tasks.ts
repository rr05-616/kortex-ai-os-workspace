import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { taskStatusValidator, priorityValidator } from "./schema";

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Get all tasks for a project, optionally filtered by status */
export const list = query({
  args: {
    projectId: v.id("projects"),
    status: v.optional(taskStatusValidator),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      return [];
    }

    let tasks;
    if (args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", args.status!)
        )
        .collect();
    } else {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();
    }

    let filtered = tasks;
    if (args.assigneeId) {
      filtered = filtered.filter((t) => t.assigneeId === args.assigneeId);
    }

    return filtered.sort((a, b) => a.order - b.order);
  },
});

/** Get a single task by ID */
export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const task = await ctx.db.get(args.taskId);
    if (!task) return null;

    const project = await ctx.db.get(task.projectId);
    if (!project) return null;
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      return null;
    }

    return task;
  },
});

/** Get subtasks for a task */
export const subtasks = query({
  args: { parentTaskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const parentTask = await ctx.db.get(args.parentTaskId);
    if (!parentTask) return [];

    const project = await ctx.db.get(parentTask.projectId);
    if (!project) return [];
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      return [];
    }

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", parentTask.projectId))
      .collect();

    return allTasks.filter((t) => t.parentTaskId === args.parentTaskId);
  },
});

/** Get tasks assigned to the current user across all projects */
export const myTasks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", user._id))
      .collect();

    // Enrich with project names
    const enriched = await Promise.all(
      allTasks.map(async (task) => {
        const project = await ctx.db.get(task.projectId);
        return { ...task, projectName: project?.name ?? "Unknown" };
      })
    );

    return enriched;
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/** Create a new task */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    projectId: v.id("projects"),
    assigneeId: v.optional(v.id("users")),
    parentTaskId: v.optional(v.id("tasks")),
    status: v.optional(taskStatusValidator),
    priority: v.optional(priorityValidator),
    dueDate: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      throw new Error("Not authorized");
    }

    // Get max order for the project
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const maxOrder = existingTasks.length;

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      projectId: args.projectId,
      assigneeId: args.assigneeId,
      createdById: user._id,
      parentTaskId: args.parentTaskId,
      status: args.status ?? "backlog",
      priority: args.priority ?? "medium",
      order: maxOrder,
      dueDate: args.dueDate,
      estimatedHours: args.estimatedHours,
      tags: args.tags ?? [],
      aiGenerated: args.aiGenerated ?? false,
      aiRiskScore: undefined,
      isRecurring: false,
    });

    // Notify assignee if set
    if (args.assigneeId && args.assigneeId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: args.assigneeId,
        type: "assignment",
        title: `Task assigned: "${args.title}"`,
        content: `You've been assigned to a task in "${project.name}"`,
        projectId: args.projectId,
        taskId,
        read: false,
        createdAt: Date.now(),
      });
    }

    return taskId;
  },
});

/** Update a task */
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(taskStatusValidator),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    actualHours: v.optional(v.number()),
    order: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    aiRiskScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { taskId, ...fields } = args;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(taskId, fields);
    return taskId;
  },
});

/** Reorder tasks (drag and drop) */
export const reorder = mutation({
  args: {
    projectId: v.id("projects"),
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    for (let i = 0; i < args.taskIds.length; i++) {
      await ctx.db.patch(args.taskIds[i], { order: i });
    }
  },
});

/** Delete a task */
export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      throw new Error("Not authorized");
    }

    // Delete subtasks
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", task.projectId))
      .collect();
    for (const t of allTasks) {
      if (t.parentTaskId === args.taskId) {
        await ctx.db.delete(t._id);
      }
    }

    // Delete comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    await ctx.db.delete(args.taskId);
  },
});
