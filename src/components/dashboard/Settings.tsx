import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  User, Shield, Bell, Palette, Keyboard, Info,
  Save, Loader2, Check, Trash2, Eye, EyeOff, Lock, Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SettingsTab = "general" | "workspace" | "notifications" | "security" | "shortcuts" | "about";

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

  const [notifPrefs, setNotifPrefs] = useState({
    deadlines: true, mentions: true, assignments: true,
    sprints: true, aiRecommendations: true, riskAlerts: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3 }} className="glass-card rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#E8F5EE]">Settings</h3>
        <button onClick={onClose} className="text-xs text-[rgba(232,245,238,0.35)] hover:text-[#E8F5EE] transition-colors">Close</button>
      </div>

      <div className="flex">
        <div className="w-44 border-r border-[rgba(255,255,255,0.04)] py-3 px-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
                activeTab === tab.id ? "bg-[rgba(14,159,110,0.1)] text-[#0E9F6E] font-medium" : "text-[rgba(232,245,238,0.35)] hover:text-[#E8F5EE] hover:bg-[rgba(255,255,255,0.02)]"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 max-h-[500px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div key="general" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center text-xl font-bold text-[#0E9F6E]">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0E9F6E] flex items-center justify-center">
                      <Camera className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#E8F5EE]">{user?.name || "User"}</p>
                    <p className="text-xs text-[rgba(232,245,238,0.3)]">{user?.email || "No email set"}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Full Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-4 rounded-xl glass-input text-sm text-[#E8F5EE]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-4 rounded-xl glass-input text-sm text-[#E8F5EE]" type="email" />
                  </div>
                </div>
                <div className="pt-4 border-t border-[rgba(255,255,255,0.04)]">
                  <button onClick={handleSave} disabled={isSaving} className="btn-liquid btn-liquid-solid h-9 px-4 text-xs">
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : saveSuccess ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    {saveSuccess ? "Saved" : "Save Changes"}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "workspace" && (
              <motion.div key="workspace" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div><h4 className="text-sm font-semibold text-[#E8F5EE] mb-1">Workspace Preferences</h4><p className="text-xs text-[rgba(232,245,238,0.3)]">Customize your workspace</p></div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Default Project View</label>
                    <div className="flex gap-2">
                      {["Board", "List", "Timeline"].map((v) => (
                        <button key={v} className="btn-liquid h-9 px-4 text-xs">{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[rgba(232,245,238,0.5)]">Sprint Duration</label>
                    <div className="flex gap-2">
                      {[7, 14, 21].map((d) => (
                        <button key={d} className={`btn-liquid h-9 px-4 text-xs ${d === 14 ? "btn-liquid-solid" : ""}`}>{d} days</button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div><h4 className="text-sm font-semibold text-[#E8F5EE] mb-1">Notification Preferences</h4><p className="text-xs text-[rgba(232,245,238,0.3)]">Choose what you want to be notified about</p></div>
                {Object.entries({
                  deadlines: { label: "Upcoming Deadlines", desc: "Before task deadlines" },
                  mentions: { label: "Mentions", desc: "When someone mentions you" },
                  assignments: { label: "Assignments", desc: "When tasks are assigned" },
                  sprints: { label: "Sprint Updates", desc: "Sprint start, end, progress" },
                  aiRecommendations: { label: "AI Recommendations", desc: "Smart suggestions" },
                  riskAlerts: { label: "Risk Alerts", desc: "High risk task flags" },
                }).map(([key, { label, desc }]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl glass">
                    <div><p className="text-xs font-medium text-[#E8F5EE]">{label}</p><p className="text-[10px] text-[rgba(232,245,238,0.25)]">{desc}</p></div>
                    <button onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      className={`w-10 h-5 rounded-full transition-all ${notifPrefs[key as keyof typeof notifPrefs] ? "bg-[#0E9F6E]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notifPrefs[key as keyof typeof notifPrefs] ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div><h4 className="text-sm font-semibold text-[#E8F5EE] mb-1">Security Settings</h4><p className="text-xs text-[rgba(232,245,238,0.3)]">Manage account security</p></div>
                <div className="p-4 rounded-xl glass">
                  <div className="flex items-center gap-3 mb-3"><Lock className="w-4 h-4 text-[#0E9F6E]" /><p className="text-xs font-medium text-[#E8F5EE]">Change Password</p></div>
                  <div className="space-y-3">
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} placeholder="New password" className="w-full h-10 px-4 rounded-xl glass-input text-sm text-[#E8F5EE] pr-10" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(232,245,238,0.3)]">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input type={showPassword ? "text" : "password"} placeholder="Confirm password" className="w-full h-10 px-4 rounded-xl glass-input text-sm text-[#E8F5EE]" />
                    <button className="btn-liquid btn-liquid-solid h-9 px-4 text-xs">Update Password</button>
                  </div>
                </div>
                <div className="p-4 rounded-xl glass">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-[#0E9F6E]" /><div><p className="text-xs font-medium text-[#E8F5EE]">Two-Factor Auth</p><p className="text-[10px] text-[rgba(232,245,238,0.25)]">Extra security layer</p></div></div>
                    <button className="w-10 h-5 rounded-full bg-[rgba(255,255,255,0.06)]"><div className="w-4 h-4 rounded-full bg-white shadow-sm translate-x-0.5" /></button>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-red-500/10">
                  <div className="flex items-center gap-3"><Trash2 className="w-4 h-4 text-red-400" /><div><p className="text-xs font-medium text-red-400">Delete Account</p><p className="text-[10px] text-[rgba(232,245,238,0.25)]">Permanently delete account</p></div></div>
                </div>
              </motion.div>
            )}

            {activeTab === "shortcuts" && (
              <motion.div key="shortcuts" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div><h4 className="text-sm font-semibold text-[#E8F5EE] mb-1">Keyboard Shortcuts</h4><p className="text-xs text-[rgba(232,245,238,0.3)]">Quick actions for power users</p></div>
                <div className="space-y-2">
                  {shortcuts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl glass">
                      <span className="text-xs text-[rgba(232,245,238,0.5)]">{s.description}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, j) => (
                          <kbd key={j} className="px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] text-[10px] font-mono text-[#E8F5EE] border border-[rgba(255,255,255,0.04)]">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "about" && (
              <motion.div key="about" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-[rgba(14,159,110,0.15)] flex items-center justify-center mx-auto mb-4"><span className="text-[#0E9F6E] font-bold text-2xl">K</span></div>
                  <h4 className="text-lg font-bold text-[#E8F5EE]">KORTEX AI</h4>
                  <p className="text-xs text-[rgba(232,245,238,0.3)] mt-1">AI-Powered Project Management OS</p>
                  <p className="text-[10px] text-[rgba(232,245,238,0.2)] mt-2">Version 1.0.0</p>
                </div>
                <div className="space-y-2">
                  {["Version", "Build", "License"].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl glass">
                      <span className="text-xs text-[rgba(232,245,238,0.5)]">{item}</span>
                      <span className="text-xs text-[rgba(232,245,238,0.3)]">{item === "Version" ? "1.0.0" : item === "Build" ? "2026.07.28" : "Enterprise"}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
