import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useLocalMutation } from "@/lib/convex-local";
import { Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const priorities = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function NewProjectDialog({ open, onOpenChange, onSuccess }: NewProjectDialogProps) {
  const createProject = useLocalMutation(api.projects.create);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sprintDays, setSprintDays] = useState("14");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        priority: priority as "critical" | "high" | "medium" | "low",
        sprintDuration: parseInt(sprintDays) || 14,
      });
      setName(""); setDescription(""); setPriority("medium"); setSprintDays("14");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-[#0E9F6E]" />
              </div>
              <h2 className="text-lg font-bold text-[#E8F5EE]">New Project</h2>
              <p className="text-xs text-[rgba(232,245,238,0.3)] mt-1">KORTEX AI will analyze your project</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Project Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Mobile App Redesign"
                  className="w-full h-10 px-4 rounded-xl glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.15)]" disabled={isLoading} required autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Description <span className="text-[rgba(232,245,238,0.2)]">(optional)</span></label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..."
                  className="w-full min-h-[80px] px-4 py-3 rounded-xl glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.15)] resize-none" disabled={isLoading} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Priority</label>
                  <div className="flex flex-wrap gap-1.5">
                    {priorities.map((p) => (
                      <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${priority === p.value ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] border border-[rgba(14,159,110,0.2)]" : "glass text-[rgba(232,245,238,0.4)]"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Sprint (days)</label>
                  <input type="number" value={sprintDays} onChange={(e) => setSprintDays(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl glass-input text-sm text-[#E8F5EE]" min={1} max={60} disabled={isLoading} />
                </div>
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2">{error}</motion.p>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => onOpenChange(false)} disabled={isLoading} className="btn-liquid flex-1 h-10 text-xs">Cancel</button>
              <button type="submit" disabled={isLoading || !name.trim()} className="btn-liquid btn-liquid-solid flex-1 h-10 text-xs">
                {isLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Create Project</>}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
