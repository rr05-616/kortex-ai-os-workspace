import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Shield,
  Bell,
  Palette,
  Keyboard,
  Info,
  ChevronRight,
  Save,
  Loader2,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SettingsTab =
  | "general"
  | "workspace"
  | "notifications"
  | "appearance"
  | "security"
  | "shortcuts"
  | "about";

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: "general", label: "General", icon: <User className="w-4 h-4" /> },
  { id: "workspace", label: "Workspace", icon: <Palette className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard className="w-4 h-4" /> },
  { id: "about", label: "About", icon: <Info className="w-4 h-4" /> },
];

const shortcuts = [
  { keys: ["⌘", "K"], description: "Command palette" },
  { keys: ["⌘", "N"], description: "New project" },
  { keys: ["⌘", "Enter"], description: "Create task" },
  { keys: ["Esc"], description: "Close panel" },
  { keys: ["⌘", "/"], description: "Toggle AI Copilot" },
  { keys: ["⌘", ","], description: "Open settings" },
];

export default function Settings({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Notification preferences (local state for now)
  const [notifPrefs, setNotifPrefs] = useState({
    deadlines: true,
    mentions: true,
    assignments: true,
    sprints: true,
    aiRecommendations: true,
    riskAlerts: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="glass-strong rounded-3xl overflow-hidden shadow-xl shadow-green-500/5"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Settings</h3>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex">
        {/* Sidebar Tabs */}
        <div className="w-44 border-r border-border/40 py-3 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[#0E9F6E]/10 text-[#0E9F6E] font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/40"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 max-h-[500px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[#0E9F6E]/15 flex items-center justify-center text-xl font-bold text-[#0E9F6E]">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0E9F6E] flex items-center justify-center shadow-sm">
                      <Camera className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || "No email set"}
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 rounded-xl bg-white/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 rounded-xl bg-white/50 border-border/50"
                      type="email"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "workspace" && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Workspace Preferences</h4>
                  <p className="text-xs text-muted-foreground/60">Customize your workspace experience</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">Default Project View</Label>
                    <div className="flex gap-2">
                      {["Board", "List", "Timeline"].map((view) => (
                        <button
                          key={view}
                          className="px-4 py-2 rounded-xl text-xs font-medium glass hover:bg-[#0E9F6E]/10 hover:text-[#0E9F6E] transition-all"
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">Sprint Duration</Label>
                    <div className="flex gap-2">
                      {[7, 14, 21].map((days) => (
                        <button
                          key={days}
                          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                            days === 14
                              ? "bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20"
                              : "glass hover:bg-[#0E9F6E]/10 hover:text-[#0E9F6E]"
                          }`}
                        >
                          {days} days
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">Theme</Label>
                    <div className="flex gap-2">
                      {["Light", "Dark", "System"].map((theme) => (
                        <button
                          key={theme}
                          className="px-4 py-2 rounded-xl text-xs font-medium glass hover:bg-[#0E9F6E]/10 hover:text-[#0E9F6E] transition-all"
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Notification Preferences</h4>
                  <p className="text-xs text-muted-foreground/60">Choose what you want to be notified about</p>
                </div>
                <div className="space-y-3">
                  {Object.entries({
                    deadlines: { label: "Upcoming Deadlines", desc: "Get notified before task deadlines" },
                    mentions: { label: "Mentions", desc: "When someone mentions you in a task" },
                    assignments: { label: "Assignments", desc: "When tasks are assigned to you" },
                    sprints: { label: "Sprint Updates", desc: "Sprint start, end, and progress" },
                    aiRecommendations: { label: "AI Recommendations", desc: "Smart suggestions from KORTEX AI" },
                    riskAlerts: { label: "Risk Alerts", desc: "When tasks are flagged as high risk" },
                  }).map(([key, { label, desc }]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl glass hover:bg-white/40 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground/60">{desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifPrefs((prev) => ({
                            ...prev,
                            [key]: !prev[key as keyof typeof prev],
                          }))
                        }
                        className={`w-10 h-6 rounded-full transition-all duration-300 ${
                          notifPrefs[key as keyof typeof notifPrefs]
                            ? "bg-[#0E9F6E]"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${
                            notifPrefs[key as keyof typeof notifPrefs]
                              ? "translate-x-4.5"
                              : "translate-x-0.5"
                          }`}
                          style={{
                            transform: notifPrefs[key as keyof typeof notifPrefs]
                              ? "translateX(18px)"
                              : "translateX(2px)",
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Security Settings</h4>
                  <p className="text-xs text-muted-foreground/60">Manage your account security</p>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl glass">
                    <div className="flex items-center gap-3 mb-3">
                      <Lock className="w-4 h-4 text-[#0E9F6E]" />
                      <p className="text-xs font-medium text-foreground">Change Password</p>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="New password"
                          className="h-10 rounded-xl bg-white/50 border-border/50 pr-10"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        className="h-10 rounded-xl bg-white/50 border-border/50"
                      />
                      <Button
                        size="sm"
                        className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white"
                      >
                        Update Password
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl glass">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-[#0E9F6E]" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Two-Factor Auth</p>
                          <p className="text-[10px] text-muted-foreground/60">Add an extra layer of security</p>
                        </div>
                      </div>
                      <button className="w-10 h-6 rounded-full bg-gray-300">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-red-200/50">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-xs font-medium text-red-600">Delete Account</p>
                        <p className="text-[10px] text-muted-foreground/60">Permanently delete your account and data</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "shortcuts" && (
              <motion.div
                key="shortcuts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Keyboard Shortcuts</h4>
                  <p className="text-xs text-muted-foreground/60">Quick actions for power users</p>
                </div>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl glass hover:bg-white/40 transition-colors"
                    >
                      <span className="text-xs text-foreground/80">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <kbd
                            key={j}
                            className="px-2 py-1 rounded-lg bg-white/60 text-[10px] font-mono font-medium text-foreground border border-border/40"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#0E9F6E] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                    <span className="text-white font-bold text-2xl">K</span>
                  </div>
                  <h4 className="text-lg font-bold text-foreground">KORTEX AI</h4>
                  <p className="text-xs text-muted-foreground mt-1">AI-Powered Project Management OS</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">Version 1.0.0</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl glass">
                    <span className="text-xs text-foreground/80">Version</span>
                    <span className="text-xs text-muted-foreground">1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl glass">
                    <span className="text-xs text-foreground/80">Build</span>
                    <span className="text-xs text-muted-foreground">2026.07.28</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl glass">
                    <span className="text-xs text-foreground/80">License</span>
                    <span className="text-xs text-muted-foreground">Enterprise</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button (General tab only) */}
          {activeTab === "general" && (
            <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : saveSuccess ? (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                {saveSuccess ? "Saved" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
