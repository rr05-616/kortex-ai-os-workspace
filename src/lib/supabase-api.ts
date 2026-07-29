import { supabase } from "./supabase";
import type { Database } from "./supabase-types";

type Tables = Database["public"]["Tables"];

// ─── AUTH HELPERS ────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOtp(email: string) {
  return supabase.auth.signInWithOtp({ email });
}

export async function verifyOtp(email: string, token: string) {
  return supabase.auth.verifyOtp({ email, token, type: "email" });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export async function signInAsGuest() {
  return supabase.auth.signInAnonymously();
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────

export async function listProjects(status?: string) {
  let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function getProjectStats(projectId: string) {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("status, ai_risk_score")
    .eq("project_id", projectId);

  const { data: project } = await supabase
    .from("projects")
    .select("health_score")
    .eq("id", projectId)
    .single();

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === "done").length ?? 0;
  const inProgress = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const todo = tasks?.filter((t) => t.status === "todo").length ?? 0;
  const backlog = tasks?.filter((t) => t.status === "backlog").length ?? 0;
  const highRisk = tasks?.filter((t) => (t.ai_risk_score ?? 0) > 0.7).length ?? 0;

  return {
    totalTasks: total,
    completedTasks: done,
    inProgressTasks: inProgress,
    todoTasks: todo,
    backlogTasks: backlog,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    highRiskTasks: highRisk,
    healthScore: project?.health_score ?? 85,
  };
}

export async function createProject(args: {
  name: string;
  description?: string;
  start_date?: number;
  end_date?: number;
  priority?: string;
  sprint_duration?: number;
  labels?: string[];
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: args.name,
      description: args.description,
      owner_id: user.id,
      members: [user.id],
      priority: (args.priority as "critical" | "high" | "medium" | "low") ?? "medium",
      sprint_duration: args.sprint_duration ?? 14,
      labels: args.labels ?? [],
      start_date: args.start_date,
      end_date: args.end_date,
    })
    .select()
    .single();

  if (error) throw error;

  // Create welcome notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "workspace_update",
    title: `Project "${args.name}" created`,
    content: "Your new project is ready. KORTEX AI is analyzing the scope.",
    project_id: data.id,
  });

  return data;
}

export async function updateProject(projectId: string, fields: Tables["projects"]["Update"]) {
  const { error } = await supabase
    .from("projects")
    .update(fields)
    .eq("id", projectId);
  if (error) throw error;
  return projectId;
}

export async function deleteProject(projectId: string) {
  // Cascade deletes handle tasks, sprints, etc. via foreign keys
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) throw error;
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function listTasks(projectId: string, status?: string) {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTask(taskId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  if (error) throw error;
  return data;
}

export async function getSubtasks(parentTaskId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("parent_task_id", parentTaskId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getMyTasks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects!inner(name)")
    .eq("assignee_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    ...t,
    projectName: t.projects?.name ?? "Unknown",
  }));
}

export async function createTask(args: {
  title: string;
  description?: string;
  project_id: string;
  assignee_id?: string;
  parent_task_id?: string;
  status?: string;
  priority?: string;
  due_date?: number;
  estimated_hours?: number;
  tags?: string[];
  ai_generated?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Get max sort order
  const { data: existing } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("project_id", args.project_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: args.title,
      description: args.description,
      project_id: args.project_id,
      assignee_id: args.assignee_id,
      created_by_id: user.id,
      parent_task_id: args.parent_task_id,
      status: (args.status as any) ?? "backlog",
      priority: (args.priority as any) ?? "medium",
      sort_order: maxOrder,
      due_date: args.due_date,
      estimated_hours: args.estimated_hours,
      tags: args.tags ?? [],
      ai_generated: args.ai_generated ?? false,
    })
    .select()
    .single();

  if (error) throw error;

  // Notify assignee
  if (args.assignee_id && args.assignee_id !== user.id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", args.project_id)
      .single();

    await supabase.from("notifications").insert({
      user_id: args.assignee_id,
      type: "assignment",
      title: `Task assigned: "${args.title}"`,
      content: `You've been assigned to a task in "${project?.name ?? "project"}"`,
      project_id: args.project_id,
      task_id: data.id,
    });
  }

  return data;
}

export async function updateTask(taskId: string, fields: Tables["tasks"]["Update"]) {
  const { error } = await supabase
    .from("tasks")
    .update(fields)
    .eq("id", taskId);
  if (error) throw error;
  return taskId;
}

export async function reorderTasks(projectId: string, taskIds: string[]) {
  const updates = taskIds.map((id, index) =>
    supabase.from("tasks").update({ sort_order: index }).eq("id", id)
  );
  await Promise.all(updates);
}

export async function deleteTask(taskId: string) {
  // Delete subtasks
  await supabase.from("tasks").delete().eq("parent_task_id", taskId);
  // Delete comments
  await supabase.from("comments").delete().eq("task_id", taskId);
  // Delete task
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

// ─── SPRINTS ─────────────────────────────────────────────────────────────────

export async function listSprints(projectId: string) {
  const { data: sprints, error } = await supabase
    .from("sprints")
    .select("*")
    .eq("project_id", projectId)
    .order("start_date", { ascending: false });

  if (error) throw error;

  // Enrich with task counts
  const enriched = await Promise.all(
    (sprints ?? []).map(async (sprint) => {
      const { data: sprintTasks } = await supabase
        .from("sprint_tasks")
        .select("task_id, tasks!inner(status)")
        .eq("sprint_id", sprint.id);

      const taskCount = sprintTasks?.length ?? 0;
      const completedTasks = sprintTasks?.filter((st: any) => st.tasks?.status === "done").length ?? 0;

      return { ...sprint, taskCount, completedTasks };
    })
  );

  return enriched;
}

export async function createSprint(args: {
  project_id: string;
  name: string;
  goal?: string;
  start_date: number;
  end_date: number;
}) {
  const { data, error } = await supabase
    .from("sprints")
    .insert({
      project_id: args.project_id,
      name: args.name,
      goal: args.goal,
      start_date: args.start_date,
      end_date: args.end_date,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSprintStatus(sprintId: string, status: "planning" | "active" | "completed") {
  const { error } = await supabase
    .from("sprints")
    .update({ status })
    .eq("id", sprintId);
  if (error) throw error;
}

export async function addTaskToSprint(sprintId: string, taskId: string) {
  const { error } = await supabase
    .from("sprint_tasks")
    .insert({ sprint_id: sprintId, task_id: taskId });
  if (error) throw error;
}

export async function removeTaskFromSprint(sprintId: string, taskId: string) {
  const { error } = await supabase
    .from("sprint_tasks")
    .delete()
    .eq("sprint_id", sprintId)
    .eq("task_id", taskId);
  if (error) throw error;
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export async function getUnreadCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}

export async function getRecentNotifications(limit = 20) {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;
}

// ─── AI CONVERSATIONS ────────────────────────────────────────────────────────

export async function getConversations(projectId?: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  let query = supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getConversation(conversationId: string) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return data;
}

export async function createConversation(args: {
  project_id?: string;
  title?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      project_id: args.project_id,
      title: args.title ?? "New conversation",
      messages: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sendMessage(conversationId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data: conversation, error: fetchError } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (fetchError || !conversation) throw new Error("Conversation not found");

  const userMessage = {
    role: "user" as const,
    content,
    timestamp: Date.now(),
  };

  const messages = [...(conversation.messages as any[]), userMessage];

  const { error } = await supabase
    .from("ai_conversations")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw error;

  // Gather workspace context for AI
  const context = await gatherWorkspaceContext(user.id, conversation.project_id ?? undefined);
  const conversationHistory = messages.slice(-15).map((m: any) => ({ role: m.role, content: m.content }));

  return { messages, context, conversationHistory };
}

export async function saveAssistantResponse(conversationId: string, content: string) {
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("messages")
    .eq("id", conversationId)
    .single();

  const assistantMessage = {
    role: "assistant" as const,
    content,
    timestamp: Date.now(),
  };

  const messages = [...(conversation?.messages as any[] ?? []), assistantMessage];

  const { error } = await supabase
    .from("ai_conversations")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) throw error;
  return messages;
}

// ─── WORKSPACE CONTEXT BUILDER ───────────────────────────────────────────────

async function gatherWorkspaceContext(userId: string, projectId?: string) {
  const context: any = {
    userName: undefined,
    projectName: undefined,
    projectDescription: undefined,
    projectStatus: undefined,
    healthScore: undefined,
    sprintDuration: undefined,
    stage: "Planning",
    tasks: [],
    totalTasks: 0,
    totalDone: 0,
    totalInProgress: 0,
    totalTodo: 0,
    totalBacklog: 0,
    totalReview: 0,
    totalRisk: 0,
    totalOverdue: 0,
    completionRate: 0,
    totalProjects: 0,
    activeProjects: 0,
    sprints: [],
    activeSprint: undefined,
    analyses: [],
  };

  const { data: user } = await supabase.from("users").select("name, email").eq("id", userId).single();
  if (user) context.userName = user.name ?? user.email ?? "User";

  if (projectId) {
    const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (project) {
      context.projectName = project.name;
      context.projectDescription = project.description;
      context.projectStatus = project.status;
      context.healthScore = project.health_score;
      context.sprintDuration = project.sprint_duration;
      context.totalProjects = 1;
      context.activeProjects = project.status === "active" ? 1 : 0;
    }

    const { data: tasks } = await supabase.from("tasks").select("*").eq("project_id", projectId);
    if (tasks) {
      context.tasks = tasks.map((t) => ({
        title: t.title, status: t.status, priority: t.priority,
        description: t.description, aiRiskScore: t.ai_risk_score,
        dueDate: t.due_date, estimatedHours: t.estimated_hours, tags: t.tags,
      }));
      context.totalTasks = tasks.length;
      context.totalDone = tasks.filter((t) => t.status === "done").length;
      context.totalInProgress = tasks.filter((t) => t.status === "in_progress").length;
      context.totalTodo = tasks.filter((t) => t.status === "todo").length;
      context.totalBacklog = tasks.filter((t) => t.status === "backlog").length;
      context.totalReview = tasks.filter((t) => t.status === "in_review").length;
      context.totalRisk = tasks.filter((t) => (t.ai_risk_score ?? 0) > 0.7).length;
      context.totalOverdue = tasks.filter((t) => t.due_date && t.due_date < Date.now() && t.status !== "done").length;
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;

      if (context.completionRate >= 90) context.stage = "Wrapping Up";
      else if (context.completionRate >= 70) context.stage = "Execution";
      else if (context.completionRate >= 40) context.stage = "Active Development";
      else if (context.completionRate >= 15) context.stage = "Early Stage";
      else if (context.totalTasks > 0) context.stage = "Kickoff";
    }

    const { data: sprints } = await supabase.from("sprints").select("*").eq("project_id", projectId);
    if (sprints) {
      for (const sprint of sprints) {
        const { data: st } = await supabase.from("sprint_tasks").select("task_id, tasks!inner(status)").eq("sprint_id", sprint.id);
        const taskCount = st?.length ?? 0;
        const completedTasks = st?.filter((s: any) => s.tasks?.status === "done").length ?? 0;
        context.sprints.push({ name: sprint.name, status: sprint.status, goal: sprint.goal, taskCount, completedTasks, startDate: sprint.start_date, endDate: sprint.end_date });
        if (sprint.status === "active") context.activeSprint = { name: sprint.name, goal: sprint.goal, taskCount, completedTasks };
      }
    }

    const { data: analyses } = await supabase.from("project_analyses").select("*").eq("project_id", projectId);
    if (analyses) {
      context.analyses = analyses.map((a) => ({
        url: a.url, name: (a.repo_info as any)?.name ?? "Repository", type: a.url_type,
        score: (a.scores as any)?.overall ?? 0, stage: (a.recommendations as any)?.developmentStage ?? "Unknown",
        summary: (a.analysis as any)?.executiveSummary ?? "",
        strengths: (a.recommendations as any)?.strengths ?? [],
        weaknesses: (a.recommendations as any)?.weaknesses ?? [],
        techStack: (a.analysis as any)?.techStack ?? { frontend: [], backend: [], database: [], cloud: [], ai: [] },
        architecture: (a.analysis as any)?.architecture ?? "Not analyzed",
      }));
    }
  } else {
    const { data: projects } = await supabase.from("projects").select("*").eq("owner_id", userId);
    if (projects) {
      context.totalProjects = projects.length;
      context.activeProjects = projects.filter((p) => p.status === "active").length;
      for (const project of projects) {
        const { data: tasks } = await supabase.from("tasks").select("*").eq("project_id", project.id);
        if (tasks) {
          context.totalTasks += tasks.length;
          context.totalDone += tasks.filter((t) => t.status === "done").length;
          context.totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
          context.totalTodo += tasks.filter((t) => t.status === "todo").length;
          context.totalBacklog += tasks.filter((t) => t.status === "backlog").length;
          context.totalReview += tasks.filter((t) => t.status === "in_review").length;
          context.totalRisk += tasks.filter((t) => (t.ai_risk_score ?? 0) > 0.7).length;
          context.totalOverdue += tasks.filter((t) => t.due_date && t.due_date < Date.now() && t.status !== "done").length;
          context.tasks = context.tasks.concat(tasks.map((t) => ({
            title: t.title, status: t.status, priority: t.priority,
            description: t.description, aiRiskScore: t.ai_risk_score,
            dueDate: t.due_date, estimatedHours: t.estimated_hours, tags: t.tags,
          })));
        }
      }
      context.completionRate = context.totalTasks > 0 ? Math.round((context.totalDone / context.totalTasks) * 100) : 0;
      if (context.completionRate >= 90) context.stage = "Wrapping Up";
      else if (context.completionRate >= 70) context.stage = "Execution";
      else if (context.completionRate >= 40) context.stage = "Active Development";
      else if (context.completionRate >= 15) context.stage = "Early Stage";
      else if (context.totalTasks > 0) context.stage = "Kickoff";
    }
  }

  return context;
}

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────

export async function getProjectInsights(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return null;

  const tasks = await listTasks(projectId);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const backlog = tasks.filter((t) => t.status === "backlog").length;
  const review = tasks.filter((t) => t.status === "in_review").length;
  const highRisk = tasks.filter((t) => (t.ai_risk_score ?? 0) > 0.7).length;
  const overdue = tasks.filter((t) => t.due_date && t.due_date < Date.now() && t.status !== "done").length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  let stage = "Planning";
  if (completionRate >= 90) stage = "Wrapping Up";
  else if (completionRate >= 70) stage = "Execution";
  else if (completionRate >= 40) stage = "Active Development";
  else if (completionRate >= 15) stage = "Early Stage";
  else if (total > 0) stage = "Kickoff";

  const insights: any[] = [];

  insights.push({
    type: "status",
    title: `Project Stage: ${stage}`,
    detail: total === 0 ? "No tasks yet." : completionRate === 100 ? "All tasks completed!" : `${done} of ${total} tasks done (${completionRate}%).`,
    icon: "status",
  });

  if (highRisk > 0) insights.push({ type: "warning", title: `${highRisk} High-Risk Task${highRisk > 1 ? "s" : ""} Detected`, detail: `Flagged as high risk.`, icon: "warning" });
  if (overdue > 0) insights.push({ type: "warning", title: `${overdue} Overdue Task${overdue > 1 ? "s" : ""}`, detail: `Past the due date.`, icon: "clock" });

  return {
    project: { name: project.name, status: project.status, healthScore: project.health_score ?? 85, sprintDuration: project.sprint_duration ?? 14 },
    stats: { total, done, inProgress, todo, backlog, review, highRisk, overdue, completionRate },
    stage,
    insights,
  };
}

export async function getGlobalInsights() {
  const user = await getCurrentUser();
  if (!user) return null;

  const projects = await listProjects();
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  let totalTasks = 0, totalDone = 0, totalInProgress = 0, totalRisk = 0, totalOverdue = 0;

  for (const project of projects) {
    const tasks = await listTasks(project.id);
    totalTasks += tasks.length;
    totalDone += tasks.filter((t) => t.status === "done").length;
    totalInProgress += tasks.filter((t) => t.status === "in_progress").length;
    totalRisk += tasks.filter((t) => (t.ai_risk_score ?? 0) > 0.7).length;
    totalOverdue += tasks.filter((t) => t.due_date && t.due_date < Date.now() && t.status !== "done").length;
  }

  const globalCompletion = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
  const insights: any[] = [];

  if (totalProjects === 0) {
    insights.push({ type: "suggestion", title: "Get Started", detail: "Create your first project to unlock AI-powered insights." });
  } else {
    insights.push({ type: "insight", title: "Portfolio Overview", detail: `${totalProjects} project${totalProjects !== 1 ? "s" : ""} with ${totalTasks} total tasks. ${globalCompletion}% completion.` });
    if (totalRisk > 0) insights.push({ type: "warning", title: "Risk Alert", detail: `${totalRisk} high-risk tasks across portfolio.` });
    if (totalOverdue > 0) insights.push({ type: "warning", title: "Overdue Tasks", detail: `${totalOverdue} tasks past due dates.` });
  }

  return {
    totalProjects, activeProjects, totalTasks, totalDone, totalInProgress,
    totalRisk, totalOverdue, globalCompletion, insights,
  };
}

// ─── PROJECT ANALYSES ────────────────────────────────────────────────────────

export async function createProjectAnalysis(args: {
  project_id: string;
  url: string;
  url_type: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("project_analyses")
    .insert({
      project_id: args.project_id,
      user_id: user.id,
      url: args.url,
      url_type: args.url_type as any,
      status: "scanning",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectAnalysis(analysisId: string, fields: Tables["project_analyses"]["Update"]) {
  const { error } = await supabase
    .from("project_analyses")
    .update(fields)
    .eq("id", analysisId);
  if (error) throw error;
}
