import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  CircleDot,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

interface ProjectDetailProps {
  projectId: Id<"projects">;
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
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export default function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const project = useQuery(api.projects.get, { projectId });
  const tasks = useQuery(api.tasks.list, { projectId });
  const stats = useQuery(api.projects.stats, { projectId });
  const createTask = useMutation(api.tasks.create);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      await createTask({
        title: newTaskTitle.trim(),
        projectId,
        status: "backlog",
      });
      setNewTaskTitle("");
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreatingTask(false);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#0E9F6E]" />
      </div>
    );
  }

  const tasksByStatus = (tasks ?? []).reduce(
    (acc, task) => {
      const status = task.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(task);
      return acc;
    },
    {} as Record<string, typeof tasks>,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button & header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground/70 mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-6">
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalTasks}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-[#0E9F6E]">{stats.completedTasks}</p>
            <p className="text-[10px] text-muted-foreground">Done</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-amber-500">{stats.inProgressTasks}</p>
            <p className="text-[10px] text-muted-foreground">In Prog.</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-red-500">{stats.highRiskTasks}</p>
            <p className="text-[10px] text-muted-foreground">At Risk</p>
          </div>
        </div>
      )}

      {/* Add task */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 border-none outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTask();
            }}
          />
          <Button
            size="sm"
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim() || creatingTask}
            className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white h-8 px-3"
          >
            {creatingTask ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add
          </Button>
        </div>
      </div>

      {/* Tasks by status */}
      <div className="space-y-3">
        {["backlog", "todo", "in_progress", "in_review", "done"].map((status) => {
          const statusTasks = tasksByStatus[status] || [];
          if (statusTasks.length === 0) return null;

          return (
            <div key={status} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {statusIcons[status]}
                <span className="text-xs font-semibold text-foreground">
                  {statusLabels[status]}
                </span>
                <span className="text-[10px] text-muted-foreground bg-background/40 px-1.5 py-0.5 rounded-full">
                  {statusTasks.length}
                </span>
              </div>
              <div className="space-y-1">
                {statusTasks.map((task, i) => (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/80 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {task.priority}
                        </span>
                        {task.aiGenerated && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[#0E9F6E]">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    {task.aiRiskScore && task.aiRiskScore > 0.5 && (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}

        {(tasks ?? []).length === 0 && (
          <div className="text-center py-12">
            <ListTodo className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/50">
              No tasks yet. Create your first task above.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
