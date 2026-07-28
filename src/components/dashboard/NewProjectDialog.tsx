import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const priorities = [
  { value: "critical", label: "Critical", color: "text-red-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "medium", label: "Medium", color: "text-yellow-500" },
  { value: "low", label: "Low", color: "text-green-500" },
];

export default function NewProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewProjectDialogProps) {
  const createProject = useMutation(api.projects.create);
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
      setName("");
      setDescription("");
      setPriority("medium");
      setSprintDays("14");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="glass-strong rounded-[26px] border-border/50 p-0 overflow-hidden max-w-md"
            showCloseButton={false}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 pb-4">
                  <DialogHeader className="text-center sm:text-center mb-6">
                    <div className="flex justify-center mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0E9F6E]/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#0E9F6E]" />
                      </div>
                    </div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      New Project
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground/70">
                      KORTEX AI will analyze your project and provide intelligent insights.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-medium text-foreground/80">
                        Project Name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Mobile App Redesign"
                        className="h-10 rounded-xl bg-white/50 border-border/50 focus:bg-white/80 transition-all"
                        disabled={isLoading}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="desc" className="text-xs font-medium text-foreground/80">
                        Description <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id="desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of the project goals..."
                        className="min-h-[80px] rounded-xl bg-white/50 border-border/50 focus:bg-white/80 transition-all resize-none"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-foreground/80">
                          Priority
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {priorities.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setPriority(p.value)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 ${
                                priority === p.value
                                  ? "bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20"
                                  : "bg-white/40 text-muted-foreground border border-border/40 hover:bg-white/60"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sprint" className="text-xs font-medium text-foreground/80">
                          Sprint (days)
                        </Label>
                        <Input
                          id="sprint"
                          type="number"
                          value={sprintDays}
                          onChange={(e) => setSprintDays(e.target.value)}
                          className="h-10 rounded-xl bg-white/50 border-border/50 focus:bg-white/80 transition-all"
                          min={1}
                          max={60}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>
                </div>

                <DialogFooter className="px-6 pb-6 pt-2 flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                    className="rounded-full glass border-border/50 text-foreground w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !name.trim()}
                    className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-lg shadow-green-500/20 w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        Create Project
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
