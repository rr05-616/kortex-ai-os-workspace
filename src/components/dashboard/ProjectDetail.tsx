import { useState, useEffect, useCallback } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "@/hooks/use-supabase";
import { getProject, listTasks, getProjectStats, createTask as createTaskApi, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from "@/lib/supabase-api";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Loader2, CheckCircle2, AlertCircle, Clock, CircleDot, ListTodo, Sparkles, Trash2, ChevronDown, GripVertical } from "lucide-react";

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  backlog: <CircleDot className="w-3.5 h-3.5 text-gray-400" />,
  todo: <ListTodo className="w-3.5 h-3.5 text-blue-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  in_review: <AlertCircle className="w-3.5 h-3.5 text-purple-400" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F6E]" />,
  cancelled: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog", todo: "To Do", in_progress: "In Progress",
  in_review: "In Review", done: "Done", cancelled: "Cancelled",
};

const statusOrder = ["backlog", "todo", "in_progress", "in_review", "done"];

export default function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: project, isLoading: loadingProject } = useSupabaseQuery(
    useCallback(() => getProject(projectId), [projectId]),
    [projectId, refreshKey]
  );
  const { data: tasks, isLoading: loadingTasks } = useSupabaseQuery(
    useCallback(() => listTasks(projectId), [projectId]),
    [projectId, refreshKey]
  );
  const { data: stats } = useSupabaseQuery(
    useCallback(() => getProjectStats(projectId), [projectId]),
    [projectId, refreshKey]
  );
  const [createTaskMut] = useSupabaseMutation(createTaskApi);
  const [updateTaskMut] = useSupabaseMutation(updateTaskApi);
  const [deleteTaskMut] = useSupabaseMutation(deleteTaskApi);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      await createTaskMut({ title: newTaskTitle.trim(), project_id: projectId, status: "backlog" });
      setNewTaskTitle("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskMut({ taskId, status: newStatus as any });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskMut({ taskId });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  if (loadingProject) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#0E9F6E]" /></div>;
  }

  if (!project) {
    return <div className="text-center py-12"><p className="text-sm text-[rgba(232,245,238,0.25)]">Project not found</p></div>;
  }

  const tasksByStatus = (tasks ?? []).reduce<Record<string, any[]>>((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[rgba(232,245,238,0.4)]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#E8F5EE]">{project.name}</h1>
          {project.description && <p className="text-sm text-[rgba(232,245,238,0.35)] mt-0.5">{project.description}</p>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[
            { label: "Total", value: stats.totalTasks, color: "text-[#E8F5EE]" },
            { label: "Done", value: stats.completedTasks, color: "text-[#0E9F6E]" },
            { label: "In Prog.", value: stats.inProgressTasks, color: "text-amber-400" },
            { label: "Complete", value: `${stats.completionRate}%`, color: "text-[#E8F5EE]" },
            { label: "At Risk", value: stats.highRiskTasks, color: "text-red-400" },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-[rgba(232,245,238,0.25)]">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a new task..."
            className="flex-1 bg-transparent text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)] border-none outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateTask(); }} />
          <button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || creatingTask}
            className="btn-liquid btn-liquid-solid h-8 px-3 text-xs">
            {creatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {statusOrder.map((status) => {
          const statusTasks = tasksByStatus[status] || [];
          if (statusTasks.length === 0) return null;
          return (
            <div key={status} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {statusIcons[status]}
                <span className="text-xs font-semibold text-[#E8F5EE]">{statusLabels[status]}</span>
                <span className="text-[10px] text-[rgba(232,245,238,0.25)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 rounded-full">{statusTasks.length}</span>
              </div>
              <div className="space-y-1">
                {statusTasks.map((task: any, i: number) => (
                  <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="group">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <GripVertical className="w-3 h-3 text-[rgba(232,245,238,0.1)] group-hover:text-[rgba(232,245,238,0.2)] shrink-0" />
                      <div className="flex-1 min-w-0" onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}>
                        <p className="text-sm text-[rgba(232,245,238,0.7)] truncate cursor-pointer">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[rgba(232,245,238,0.25)] capitalize">{task.priority}</span>
                          {task.ai_generated && <span className="flex items-center gap-0.5 text-[10px] text-[#0E9F6E]"><Sparkles className="w-2.5 h-2.5" />AI</span>}
                        </div>
                      </div>
                      {task.ai_risk_score && task.ai_risk_score > 0.5 && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <div className="relative shrink-0">
                        <select value={status} onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="appearance-none bg-transparent text-[10px] text-[rgba(232,245,238,0.4)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1 pr-5 cursor-pointer hover:border-[rgba(14,159,110,0.2)] transition-colors focus:outline-none focus:border-[rgba(14,159,110,0.3)]">
                          {statusOrder.map((s) => (
                            <option key={s} value={s} className="bg-[#07120D] text-[#E8F5EE]">{statusLabels[s]}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 text-[rgba(232,245,238,0.3)] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button onClick={() => handleDeleteTask(task.id)}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all shrink-0">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                    <AnimatePresence>
                      {expandedTask === task.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden px-3 pb-2">
                          <div className="ml-6 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                            {task.description && <p className="text-xs text-[rgba(232,245,238,0.35)] mb-2">{task.description}</p>}
                            <div className="flex flex-wrap gap-2 text-[10px] text-[rgba(232,245,238,0.25)]">
                              {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                              {task.estimated_hours && <span>Est: {task.estimated_hours}h</span>}
                              {task.tags && task.tags.length > 0 && task.tags.map((tag: string) => (
                                <span key={tag} className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)]">{tag}</span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
        {(tasks ?? []).length === 0 && (
          <div className="text-center py-12">
            <ListTodo className="w-8 h-8 text-[rgba(232,245,238,0.1)] mx-auto mb-3" />
            <p className="text-sm text-[rgba(232,245,238,0.25)]">No tasks yet. Create your first task above.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
