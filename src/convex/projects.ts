import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { projectStatusValidator, priorityValidator } from "./schema";

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Get all projects for the current user */
export const list = query({
  args: {
    status: v.optional(projectStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let projects;
    if (args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      projects = await ctx.db.query("projects").collect();
    }

    // Filter to only projects where user is owner or member
    return projects.filter(
      (p) => p.ownerId === user._id || p.members.includes(user._id)
    );
  },
});

/** Get a single project by ID */
export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Check access
    if (project.ownerId !== user._id && !project.members.includes(user._id)) {
      return null;
    }

    return project;
  },
});

/** Get project statistics */
export const stats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
    const todo = allTasks.filter((t) => t.status === "todo").length;
    const backlog = allTasks.filter((t) => t.status === "backlog").length;
    const highRisk = allTasks.filter(
      (t) => (t.aiRiskScore ?? 0) > 0.7
    ).length;

    return {
      totalTasks: total,
      completedTasks: done,
      inProgressTasks: inProgress,
      todoTasks: todo,
      backlogTasks: backlog,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      highRiskTasks: highRisk,
      healthScore: project.healthScore ?? 85,
    };
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/** Create a new project */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    priority: priorityValidator,
    sprintDuration: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      status: "planning",
      ownerId: user._id,
      members: [user._id],
      priority: args.priority,
      labels: args.labels ?? [],
      startDate: args.startDate,
      endDate: args.endDate,
      sprintDuration: args.sprintDuration ?? 14,
      healthScore: 85,
      aiSummary: undefined,
      aiTags: [],
    });

    // Auto-create welcome notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "workspace_update",
      title: `Project "${args.name}" created`,
      content: "Your new project is ready. KORTEX AI is analyzing the scope.",
      projectId,
      read: false,
      createdAt: Date.now(),
    });

    return projectId;
  },
});

/** Update a project */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(projectStatusValidator),
    priority: v.optional(priorityValidator),
    members: v.optional(v.array(v.id("users"))),
    labels: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    sprintDuration: v.optional(v.number()),
    healthScore: v.optional(v.number()),
    aiSummary: v.optional(v.string()),
    aiTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { projectId, ...fields } = args;
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(projectId, fields);
    return projectId;
  },
});

/** Delete a project */
export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    // Delete all related tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const task of tasks) {
      // Delete task comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(task._id);
    }

    // Delete sprints
    const sprints = await ctx.db
      .query("sprints")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const sprint of sprints) {
      const sprintTasks = await ctx.db
        .query("sprintTasks")
        .withIndex("by_sprint", (q) => q.eq("sprintId", sprint._id))
        .collect();
      for (const st of sprintTasks) {
        await ctx.db.delete(st._id);
      }
      await ctx.db.delete(sprint._id);
    }

    // Delete project notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of notifications) {
      if (n.projectId === args.projectId) {
        await ctx.db.delete(n._id);
      }
    }

    await ctx.db.delete(args.projectId);
  },
});
