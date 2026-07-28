import { motion } from "framer-motion";
import { FolderKanban, MoreHorizontal, Sparkles } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface ProjectCardProps {
  project: Doc<"projects">;
  taskCount?: number;
  onClick?: () => void;
  index?: number;
}

const statusColors: Record<string, string> = {
  planning: "bg-amber-400/20 text-amber-600 border-amber-400/20",
  active: "bg-[#0E9F6E]/10 text-[#0E9F6E] border-[#0E9F6E]/20",
  on_hold: "bg-orange-400/20 text-orange-600 border-orange-400/20",
  completed: "bg-green-400/20 text-green-600 border-green-400/20",
  archived: "bg-gray-400/20 text-gray-500 border-gray-400/20",
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const priorityDots: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default function ProjectCard({ project, taskCount, onClick, index = 0 }: ProjectCardProps) {
  const healthColor =
    (project.healthScore ?? 85) >= 80
      ? "text-[#0E9F6E]"
      : (project.healthScore ?? 85) >= 50
        ? "text-amber-500"
        : "text-red-500";

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="glass-card rounded-2xl p-5 text-left w-full transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0E9F6E]/10 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-[#0E9F6E]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {project.name}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 border ${statusColors[project.status] || statusColors.planning}`}
            >
              {statusLabels[project.status] || "Planning"}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="w-7 h-7 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-4 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Bottom stats */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-3">
          {taskCount !== undefined && (
            <span className="text-[11px] text-muted-foreground">
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${priorityDots[project.priority] || "bg-gray-400"}`} />
            <span className="text-[10px] text-muted-foreground capitalize">{project.priority}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {project.aiTags && project.aiTags.length > 0 && (
            <Sparkles className="w-3 h-3 text-[#0E9F6E]" />
          )}
          <span className={`text-[11px] font-medium ${healthColor}`}>
            {project.healthScore ?? 85}%
          </span>
        </div>
      </div>
    </motion.button>
  );
}
