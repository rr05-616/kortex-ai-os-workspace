import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// Priority levels for tasks
export const PRIORITIES = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export const priorityValidator = v.union(
  v.literal(PRIORITIES.CRITICAL),
  v.literal(PRIORITIES.HIGH),
  v.literal(PRIORITIES.MEDIUM),
  v.literal(PRIORITIES.LOW),
);

export type Priority = Infer<typeof priorityValidator>;

// Task statuses
export const TASK_STATUSES = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export const taskStatusValidator = v.union(
  v.literal(TASK_STATUSES.BACKLOG),
  v.literal(TASK_STATUSES.TODO),
  v.literal(TASK_STATUSES.IN_PROGRESS),
  v.literal(TASK_STATUSES.IN_REVIEW),
  v.literal(TASK_STATUSES.DONE),
  v.literal(TASK_STATUSES.CANCELLED),
);

export type TaskStatus = Infer<typeof taskStatusValidator>;

// Project statuses
export const PROJECT_STATUSES = {
  PLANNING: "planning",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export const projectStatusValidator = v.union(
  v.literal(PROJECT_STATUSES.PLANNING),
  v.literal(PROJECT_STATUSES.ACTIVE),
  v.literal(PROJECT_STATUSES.ON_HOLD),
  v.literal(PROJECT_STATUSES.COMPLETED),
  v.literal(PROJECT_STATUSES.ARCHIVED),
);

export type ProjectStatus = Infer<typeof projectStatusValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables,

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      phone: v.optional(v.string()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"])
      .index("phone", ["phone"]),

    // ─── KORTEX AI TABLES ─────────────────────────────────────────────────

    // Projects
    projects: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      status: projectStatusValidator,
      ownerId: v.id("users"),
      members: v.array(v.id("users")),
      labels: v.optional(v.array(v.string())),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      priority: priorityValidator,
      sprintDuration: v.optional(v.number()), // days
      healthScore: v.optional(v.number()), // 0-100
      aiSummary: v.optional(v.string()),
      aiTags: v.optional(v.array(v.string())),
    })
      .index("by_owner", ["ownerId"])
      .index("by_status", ["status"]),

    // Tasks
    tasks: defineTable({
      title: v.string(),
      description: v.optional(v.string()),
      status: taskStatusValidator,
      priority: priorityValidator,
      projectId: v.id("projects"),
      assigneeId: v.optional(v.id("users")),
      createdById: v.id("users"),
      parentTaskId: v.optional(v.id("tasks")), // subtask support
      dueDate: v.optional(v.number()),
      estimatedHours: v.optional(v.number()),
      actualHours: v.optional(v.number()),
      order: v.number(), // for kanban ordering
      tags: v.optional(v.array(v.string())),
      aiGenerated: v.optional(v.boolean()),
      aiRiskScore: v.optional(v.number()), // 0-1 risk prediction
      isRecurring: v.optional(v.boolean()),
      recurrenceRule: v.optional(v.string()),
    })
      .index("by_project", ["projectId"])
      .index("by_assignee", ["assigneeId"])
      .index("by_status", ["status"])
      .index("by_project_status", ["projectId", "status"]),

    // Comments on tasks
    comments: defineTable({
      taskId: v.id("tasks"),
      userId: v.id("users"),
      content: v.string(),
      aiGenerated: v.optional(v.boolean()),
    })
      .index("by_task", ["taskId"]),

    // Sprint definitions
    sprints: defineTable({
      projectId: v.id("projects"),
      name: v.string(),
      goal: v.optional(v.string()),
      startDate: v.number(),
      endDate: v.number(),
      status: v.union(
        v.literal("planning"),
        v.literal("active"),
        v.literal("completed"),
      ),
      aiGoalSummary: v.optional(v.string()),
    })
      .index("by_project", ["projectId"])
      .index("by_status", ["status"]),

    // Sprint-task associations
    sprintTasks: defineTable({
      sprintId: v.id("sprints"),
      taskId: v.id("tasks"),
      order: v.number(),
    })
      .index("by_sprint", ["sprintId"])
      .index("by_task", ["taskId"]),

    // AI Copilot conversations
    aiConversations: defineTable({
      userId: v.id("users"),
      projectId: v.optional(v.id("projects")),
      title: v.optional(v.string()),
      messages: v.array(v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        timestamp: v.number(),
      })),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_project", ["projectId"]),

    // Project Analyses (AI Scanner results)
    projectAnalyses: defineTable({
      projectId: v.id("projects"),
      userId: v.id("users"),
      url: v.string(),
      urlType: v.union(
        v.literal("github"),
        v.literal("gitlab"),
        v.literal("bitbucket"),
        v.literal("website"),
        v.literal("vercel"),
        v.literal("netlify"),
        v.literal("unknown"),
      ),
      status: v.union(
        v.literal("scanning"),
        v.literal("analyzing"),
        v.literal("generating"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      repoInfo: v.optional(v.object({
        name: v.string(),
        description: v.optional(v.string()),
        language: v.optional(v.string()),
        framework: v.optional(v.string()),
        stars: v.optional(v.number()),
        forks: v.optional(v.number()),
        readme: v.optional(v.string()),
        fileStructure: v.optional(v.array(v.string())),
        dependencies: v.optional(v.array(v.string())),
        topics: v.optional(v.array(v.string())),
      })),
      analysis: v.optional(v.object({
        projectType: v.string(),
        executiveSummary: v.string(),
        keyFeatures: v.array(v.string()),
        missingFeatures: v.array(v.string()),
        techStack: v.object({
          frontend: v.array(v.string()),
          backend: v.array(v.string()),
          database: v.array(v.string()),
          cloud: v.array(v.string()),
          ai: v.array(v.string()),
        }),
        architecture: v.string(),
      })),
      scores: v.optional(v.object({
        overall: v.number(),
        codeQuality: v.number(),
        uiUx: v.number(),
        performance: v.number(),
        security: v.number(),
        documentation: v.number(),
        aiReadiness: v.number(),
        devOps: v.number(),
        productQuality: v.number(),
      })),
      recommendations: v.optional(v.object({
        immediate: v.array(v.string()),
        nextSprint: v.array(v.string()),
        futureRoadmap: v.array(v.string()),
        strengths: v.array(v.string()),
        weaknesses: v.array(v.string()),
        riskLevel: v.string(),
        developmentStage: v.string(),
        technicalDebt: v.string(),
      })),
      generatedTasks: v.optional(v.array(v.object({
        title: v.string(),
        description: v.optional(v.string()),
        priority: v.string(),
        tags: v.array(v.string()),
        estimatedHours: v.optional(v.number()),
      }))),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_project", ["projectId"])
      .index("by_status", ["status"]),

    // Notifications
    notifications: defineTable({
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
      read: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_read", ["userId", "read"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
