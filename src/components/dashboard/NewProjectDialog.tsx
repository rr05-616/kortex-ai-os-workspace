import { useState } from "react";
import { useSupabaseMutation } from "@/hooks/use-supabase";
import { createProject } from "@/lib/supabase-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createProjectMutation, { isLoading }] = useSupabaseMutation(createProject);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const result = await createProjectMutation({ name: name.trim(), description: description.trim() || undefined });
    if (result) {
      setName("");
      setDescription("");
      onOpenChange(false);
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0f0d] border-[rgba(14,159,110,0.15)]">
        <DialogHeader>
          <DialogTitle className="text-[rgba(232,245,238,0.9)]">New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[rgba(14,159,110,0.04)] border-[rgba(14,159,110,0.1)]"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-[rgba(14,159,110,0.04)] border-[rgba(14,159,110,0.1)]"
          />
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className="w-full bg-[#0E9F6E] hover:bg-[#0c8a5f]"
          >
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
