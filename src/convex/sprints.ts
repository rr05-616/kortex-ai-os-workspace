import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Get all sprints for a project */
export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const sprints = await ctx.db
      .query("sprints")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Enrich with task counts
    return Promise.all(
      sprints.map(async (sprint) => {
        const sprintTasks = await ctx.db
          .query("sprintTasks")
          .withIndex("by_sprint", (q) => q.eq("sprintId", sprint._id))
          .collect();

        const taskIds = sprintTasks.map((st) => st.taskId);
        const tasks = await Promise.all(taskIds.map((id) => ctx.db.get(id)));
        const validTasks = tasks.filter(Boolean);

        return {
          ...sprint,
          taskCount: validTasks.length,
          completedTasks: validTasks.filter((t) => t!.status === "done").length,
        };
      })
    );
  },
});

/** Get a single sprint with its tasks */
export const get = query({
  args: { sprintId: v.id("sprints") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const sprint = await ctx.db.get(args.sprintId);
    if (!sprint) return null;

    const sprintTasks = await ctx.db
      .query("sprintTasks")
      .withIndex("by_sprint", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const taskIds = sprintTasks.sort((a, b) => a.order - b.order).map((st) => st.taskId);
    const tasks = (await Promise.all(taskIds.map((id) => ctx.db.get(id)))).filter(Boolean);

    return { ...sprint, tasks };
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

/** Create a new sprint */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    goal: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const sprintId = await ctx.db.insert("sprints", {
      projectId: args.projectId,
      name: args.name,
      goal: args.goal,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "planning",
    });

    return sprintId;
  },
});

/** Update sprint status */
export const updateStatus = mutation({
  args: {
    sprintId: v.id("sprints"),
    status: v.union(v.literal("planning"), v.literal("active"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(args.sprintId, { status: args.status });
  },
});

/** Add task to sprint */
export const addTask = mutation({
  args: {
    sprintId: v.id("sprints"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("sprintTasks")
      .withIndex("by_sprint", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    await ctx.db.insert("sprintTasks", {
      sprintId: args.sprintId,
      taskId: args.taskId,
      order: existing.length,
    });
  },
});

/** Remove task from sprint */
export const removeTask = mutation({
  args: {
    sprintId: v.id("sprints"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const sprintTasks = await ctx.db
      .query("sprintTasks")
      .withIndex("by_sprint", (q) => q.eq("sprintId", args.sprintId))
      .collect();

    const target = sprintTasks.find((st) => st.taskId === args.taskId);
    if (target) {
      await ctx.db.delete(target._id);
    }
  },
});
