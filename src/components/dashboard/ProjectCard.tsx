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
  planning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  active: "bg-[rgba(14,159,110,0.1)] text-[#0E9F6E] border-[rgba(14,159,110,0.2)]",
  on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
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
  low: "bg-[#0E9F6E]",
};

export default function ProjectCard({ project, onClick, index = 0 }: ProjectCardProps) {
  const healthColor =
    (project.healthScore ?? 85) >= 80 ? "text-[#0E9F6E]" :
    (project.healthScore ?? 85) >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="glass-card rounded-2xl p-5 text-left w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-[#0E9F6E]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E8F5EE] leading-tight">{project.name}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 border ${statusColors[project.status] || statusColors.planning}`}>
              {statusLabels[project.status] || "Planning"}
            </span>
          </div>
        </div>
        <button onClick={(e) => e.stopPropagation()} className="w-7 h-7 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5 text-[rgba(232,245,238,0.3)]" />
        </button>
      </div>

      {project.description && (
        <p className="text-xs text-[rgba(232,245,238,0.3)] line-clamp-2 mb-4 leading-relaxed">{project.description}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${priorityDots[project.priority] || "bg-gray-400"}`} />
            <span className="text-[10px] text-[rgba(232,245,238,0.3)] capitalize">{project.priority}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {project.aiTags && project.aiTags.length > 0 && <Sparkles className="w-3 h-3 text-[#0E9F6E]" />}
          <span className={`text-[11px] font-medium ${healthColor}`}>{project.healthScore ?? 85}%</span>
        </div>
      </div>
    </motion.button>
  );
}
