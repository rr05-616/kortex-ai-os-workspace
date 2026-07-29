import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import ProjectCard from "@/components/dashboard/ProjectCard";
import ProjectDetail from "@/components/dashboard/ProjectDetail";
import NewProjectDialog from "@/components/dashboard/NewProjectDialog";
import { AICopilot } from "@/components/dashboard/AICopilot";
import Settings from "@/components/dashboard/Settings";
import ImportProjectDialog from "@/components/dashboard/ImportProjectDialog";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import GlassCard from "@/components/ui/glass-card";
import logo from "@/assets/logo.svg";
import {
  LogOut,
  Bell,
  Search,
  Plus,
  Import,
  Kanban,
  BarChart3,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Target,
  ChevronRight,
  Settings as SettingsIcon,
  MessageSquare,
  LayoutDashboard,
  Timer,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

type View = "dashboard" | "projects" | "sprints" | "analytics" | "settings" | "copilot";

const navItems = [
  { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
  { id: "projects" as View, label: "Projects", icon: FolderKanban },
  { id: "sprints" as View, label: "Sprints", icon: Target },
  { id: "analytics" as View, label: "Analytics", icon: BarChart3 },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const projects = useQuery(api.projects.list, {});
  const notificationsData = useQuery(api.notifications.recent, { limit: 10 });
  const unreadCount = useQuery(api.notifications.unreadCount, {});
  const markAllRead = useMutation(api.notifications.markAllRead);
  const deleteProject = useMutation(api.projects.remove);

  const handleDeleteProject = async (projectId: string) => {
    try {
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      await deleteProject({ projectId: projectId as Id<"projects"> });
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const totalProjects = projects?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
  const planningProjects = projects?.filter((p) => p.status === "planning").length ?? 0;
  const completedProjects = projects?.filter((p) => p.status === "completed").length ?? 0;

  // Project detail view
  if (selectedProjectId) {
    return (
      <div className="min-h-screen bg-[#040705] relative">
        <div className="fixed inset-0 bg-dot-pattern opacity-20 pointer-events-none" />
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[rgba(14,159,110,0.015)] blur-[120px] pointer-events-none" />
        <div className="relative z-10">
          <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
            <div className="max-w-7xl mx-auto glass-strong rounded-2xl px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedProjectId(null); setCurrentView("dashboard"); }} className="w-7 h-7 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)]">
                  <ChevronRight className="w-3.5 h-3.5 text-[rgba(232,245,238,0.4)] rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                  <img src={logo} alt="KORTEX" className="w-7 h-7 rounded-lg" />
                  <span className="text-xs font-semibold text-[#E8F5EE]">KORTEX</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCopilot(true)} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-[#0E9F6E]" />
                </button>
                <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors">
                  <SettingsIcon className="w-3.5 h-3.5 text-[rgba(232,245,238,0.4)]" />
                </button>
                <div className="w-7 h-7 rounded-full bg-[rgba(14,159,110,0.1)] flex items-center justify-center text-[10px] font-semibold text-[#0E9F6E]">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-6">
            <ProjectDetail projectId={selectedProjectId} onBack={() => { setSelectedProjectId(null); setCurrentView("projects"); }} />
          </main>
        </div>
        <AnimatePresence>
          {showCopilot && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCopilot(false)}>
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
                <AICopilot projectId={selectedProjectId} onClose={() => setShowCopilot(false)} expanded />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl">
                <Settings onClose={() => setShowSettings(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040705] relative">
      <div className="fixed inset-0 bg-dot-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[rgba(14,159,110,0.015)] blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Top Navigation */}
        <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
          <div className="max-w-7xl mx-auto glass-strong rounded-2xl px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="flex items-center gap-2">
                <img src={logo} alt="KORTEX" className="w-8 h-8 rounded-lg" />
                <span className="text-sm font-bold text-[#E8F5EE] hidden sm:inline">KORTEX</span>
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => setCurrentView(item.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      currentView === item.id ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "text-[rgba(232,245,238,0.35)] hover:text-[#E8F5EE] hover:bg-[rgba(255,255,255,0.02)]"
                    }`}>
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors">
                <Search className="w-3.5 h-3.5 text-[rgba(232,245,238,0.4)]" />
              </button>
              <button onClick={() => setShowCopilot(!showCopilot)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${showCopilot ? "bg-[#0E9F6E] text-white" : "glass hover:bg-[rgba(14,159,110,0.1)]"}`}>
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors relative">
                  <Bell className="w-3.5 h-3.5 text-[rgba(232,245,238,0.4)]" />
                  {(unreadCount ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0E9F6E] text-[8px] font-bold text-white flex items-center justify-center">{unreadCount}</span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 glass-strong rounded-2xl p-3 shadow-xl z-50 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs font-semibold text-[#E8F5EE]">Notifications</span>
                        <button onClick={() => markAllRead()} className="text-[10px] text-[#0E9F6E] hover:underline">Mark all read</button>
                      </div>
                      {(notificationsData ?? []).length === 0 ? (
                        <p className="text-xs text-[rgba(232,245,238,0.25)] text-center py-6">No notifications yet</p>
                      ) : (
                        <div className="space-y-1">
                          {(notificationsData ?? []).map((n) => (
                            <div key={n._id} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${!n.read ? "bg-[rgba(14,159,110,0.05)]" : "hover:bg-[rgba(255,255,255,0.02)]"}`}>
                              <div className="mt-0.5">
                                {n.type === "risk_alert" || n.type === "dependency_warning" ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> : <div className="w-3.5 h-3.5 rounded-full bg-[rgba(14,159,110,0.2)]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-[rgba(232,245,238,0.6)] truncate">{n.title}</p>
                                {n.content && <p className="text-[10px] text-[rgba(232,245,238,0.3)] mt-0.5 line-clamp-2">{n.content}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[rgba(14,159,110,0.1)] transition-colors">
                <SettingsIcon className="w-3.5 h-3.5 text-[rgba(232,245,238,0.4)]" />
              </button>
              <div className="w-8 h-8 rounded-full bg-[rgba(14,159,110,0.1)] flex items-center justify-center text-xs font-semibold text-[#0E9F6E]">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          <motion.div key={currentView} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F6E] animate-pulse" />
                <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">
                  {currentView === "dashboard" ? "AI Workspace Active" : `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} View`}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#E8F5EE]">
                {currentView === "dashboard" ? `Welcome back${user?.name ? `, ${user.name}` : ""}` : currentView === "projects" ? "Your Projects" : currentView === "sprints" ? "Sprints Overview" : "Analytics Dashboard"}
              </h1>
              <p className="text-sm text-[rgba(232,245,238,0.35)] mt-1">
                {currentView === "dashboard" ? "Here's your project overview for today." : currentView === "projects" ? `${totalProjects} project${totalProjects !== 1 ? "s" : ""} — ${activeProjects} active` : currentView === "sprints" ? "Track sprint progress across projects." : "Real-time metrics and AI insights."}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button onClick={() => setShowImport(true)} className="btn-liquid h-9 px-4 text-xs">
                <Import className="w-3.5 h-3.5 mr-1" />Import Project
              </button>
              <button onClick={() => setShowNewProject(true)} className="btn-liquid btn-liquid-solid h-9 px-4 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />New Project
              </button>
              <button onClick={handleSignOut} className="btn-liquid h-9 px-4 text-xs text-[rgba(232,245,238,0.4)]">
                <LogOut className="w-3.5 h-3.5 mr-1" />Sign out
              </button>
            </div>
          </motion.div>

          {/* DASHBOARD VIEW */}
          {currentView === "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Projects", value: String(totalProjects), change: `${activeProjects} active`, icon: Kanban },
                  { label: "Active Projects", value: String(activeProjects), change: `${planningProjects} planning`, icon: TrendingUp },
                  { label: "Completed", value: String(completedProjects), change: "total done", icon: CheckCircle2 },
                  { label: "Team Members", value: "1", change: "You", icon: Users },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 * i }}
                    className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[rgba(232,245,238,0.35)]">{stat.label}</span>
                      <div className="w-7 h-7 rounded-lg bg-[rgba(14,159,110,0.1)] flex items-center justify-center">
                        <stat.icon className="w-3.5 h-3.5 text-[#0E9F6E]" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#E8F5EE]">{stat.value}</span>
                      <span className="text-[11px] font-medium text-[#0E9F6E]">{stat.change}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Projects Panel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                  className="lg:col-span-2 glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-semibold text-[#E8F5EE]">Recent Projects</h2>
                    <button onClick={() => setCurrentView("projects")} className="text-[10px] text-[#0E9F6E] hover:underline flex items-center gap-1">
                      View all<ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {!projects ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-pulse text-xs text-[rgba(232,245,238,0.25)]">Loading projects...</div>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderKanban className="w-10 h-10 text-[rgba(232,245,238,0.1)] mx-auto mb-3" />
                      <p className="text-sm text-[rgba(232,245,238,0.25)] mb-4">No projects yet</p>
                      <button onClick={() => setShowNewProject(true)} className="btn-liquid btn-liquid-solid h-9 px-4 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1" />Create your first project
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {projects.slice(0, 4).map((project, i) => (
                        <ProjectCard key={project._id} project={project} index={i} onClick={() => setSelectedProjectId(project._id)} onDelete={handleDeleteProject} />
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* AI Copilot Panel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                  <AICopilot />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* PROJECTS VIEW */}
          {currentView === "projects" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}
                  onClick={() => setShowNewProject(true)}
                  className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px] border-dashed border-2 border-[rgba(255,255,255,0.04)] hover:border-[rgba(14,159,110,0.2)] transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(14,159,110,0.1)] flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-[#0E9F6E]" />
                  </div>
                  <p className="text-sm font-medium text-[#E8F5EE]">New Project</p>
                  <p className="text-[11px] text-[rgba(232,245,238,0.3)] mt-1">Create with AI assistance</p>
                </motion.button>
                {!projects ? (
                  <div className="col-span-full flex items-center justify-center py-20">
                    <div className="animate-pulse text-xs text-[rgba(232,245,238,0.25)]">Loading projects...</div>
                  </div>
                ) : projects.map((project, i) => (
                  <ProjectCard key={project._id} project={project} index={i + 1} onClick={() => setSelectedProjectId(project._id)} onDelete={handleDeleteProject} />
                ))}
              </div>
            </motion.div>
          )}

          {/* SPRINTS VIEW — fully functional with real project data */}
          {currentView === "sprints" && (
            <SprintsView projects={projects} onSelectProject={(id) => setSelectedProjectId(id)} />
          )}

          {/* ANALYTICS VIEW — fully functional with real computed metrics */}
          {currentView === "analytics" && (
            <AnalyticsView projects={projects} />
          )}
        </main>
      </div>

      <NewProjectDialog open={showNewProject} onOpenChange={setShowNewProject} />
      <ImportProjectDialog open={showImport} onOpenChange={setShowImport} />

      <AnimatePresence>
        {showCopilot && !selectedProjectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCopilot(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
              <AICopilot onClose={() => setShowCopilot(false)} expanded />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && !selectedProjectId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl">
              <Settings onClose={() => setShowSettings(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SPRINTS VIEW (functional with real project data) ───────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SprintsView({ projects, onSelectProject }: { projects: any[] | undefined; onSelectProject: (id: Id<"projects">) => void }) {
  const [selectedProject, setSelectedProject] = useState<Id<"projects"> | null>(null);
  const sprints = useQuery(api.sprints.list, selectedProject ? { projectId: selectedProject } : "skip");
  const createSprint = useMutation(api.sprints.create);
  const updateSprintStatus = useMutation(api.sprints.updateStatus);
  const [showCreate, setShowCreate] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");

  const handleCreateSprint = async () => {
    if (!selectedProject || !sprintName.trim()) return;
    const now = Date.now();
    const duration = 14 * 24 * 60 * 60 * 1000; // 14 days default
    await createSprint({
      projectId: selectedProject,
      name: sprintName.trim(),
      goal: sprintGoal.trim() || undefined,
      startDate: now,
      endDate: now + duration,
    });
    setSprintName("");
    setSprintGoal("");
    setShowCreate(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {!projects || projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Target className="w-12 h-12 text-[rgba(232,245,238,0.1)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#E8F5EE] mb-2">No Projects Yet</h3>
          <p className="text-sm text-[rgba(232,245,238,0.3)] max-w-md mx-auto mb-6">Create a project first to start managing sprints.</p>
        </div>
      ) : (
        <>
          {/* Project selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-[rgba(232,245,238,0.3)] self-center mr-2">Select project:</span>
            {projects.map((p) => (
              <button key={p._id} onClick={() => setSelectedProject(p._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedProject === p._id ? "bg-[rgba(14,159,110,0.15)] text-[#0E9F6E] border border-[rgba(14,159,110,0.25)]" : "glass text-[rgba(232,245,238,0.4)] hover:text-[#E8F5EE]"}`}>
                {p.name}
              </button>
            ))}
          </div>

          {selectedProject && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E8F5EE]">Sprints</h2>
                <button onClick={() => setShowCreate(true)} className="btn-liquid btn-liquid-solid h-8 px-3 text-[11px]">
                  <Plus className="w-3 h-3 mr-1" />New Sprint
                </button>
              </div>

              {/* Create sprint form */}
              <AnimatePresence>
                {showCreate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="glass-card rounded-xl p-4 space-y-3">
                      <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint name (e.g., Sprint 1)"
                        className="w-full h-9 px-3 rounded-lg glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)]" autoFocus />
                      <input value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)} placeholder="Sprint goal (optional)"
                        className="w-full h-9 px-3 rounded-lg glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)]" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowCreate(false)} className="btn-liquid h-8 px-3 text-[11px]">Cancel</button>
                        <button onClick={handleCreateSprint} disabled={!sprintName.trim()} className="btn-liquid btn-liquid-solid h-8 px-3 text-[11px]">Create Sprint</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sprint list */}
              {sprints === undefined ? (
                <div className="text-center py-8"><div className="animate-pulse text-xs text-[rgba(232,245,238,0.25)]">Loading sprints...</div></div>
              ) : sprints.length === 0 ? (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Timer className="w-10 h-10 text-[rgba(232,245,238,0.1)] mx-auto mb-3" />
                  <p className="text-sm text-[rgba(232,245,238,0.25)]">No sprints yet. Create your first sprint to start planning.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sprints.map((sprint, i) => {
                    const progress = sprint.taskCount > 0 ? Math.round((sprint.completedTasks / sprint.taskCount) * 100) : 0;
                    const sprintStatusColors: Record<string, string> = {
                      planning: "text-amber-400 bg-amber-500/10",
                      active: "text-[#0E9F6E] bg-[rgba(14,159,110,0.1)]",
                      completed: "text-blue-400 bg-blue-500/10",
                    };
                    return (
                      <motion.div key={sprint._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="glass-card rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-[#E8F5EE]">{sprint.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sprintStatusColors[sprint.status] || ""}`}>
                            {sprint.status}
                          </span>
                        </div>
                        {sprint.goal && <p className="text-xs text-[rgba(232,245,238,0.35)] mb-3 line-clamp-2">{sprint.goal}</p>}
                        <div className="flex items-center justify-between text-[10px] text-[rgba(232,245,238,0.3)] mb-2">
                          <span>{sprint.completedTasks}/{sprint.taskCount} tasks</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] mb-3">
                          <div className="h-full rounded-full bg-[#0E9F6E] transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex gap-1.5">
                          {sprint.status === "planning" && (
                            <button onClick={() => updateSprintStatus({ sprintId: sprint._id, status: "active" })}
                              className="btn-liquid btn-liquid-solid h-7 px-2.5 text-[10px] flex-1">Start Sprint</button>
                          )}
                          {sprint.status === "active" && (
                            <button onClick={() => updateSprintStatus({ sprintId: sprint._id, status: "completed" })}
                              className="btn-liquid h-7 px-2.5 text-[10px] flex-1">Complete</button>
                          )}
                          <button onClick={() => onSelectProject(sprint.projectId)} className="btn-liquid h-7 px-2.5 text-[10px]">View Project</button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── ANALYTICS VIEW (functional with real computed metrics) ──────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnalyticsView({ projects }: { projects: any[] | undefined }) {
  // Compute real analytics from project data
  const analytics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        avgHealth: 0,
        avgCompletion: 0,
        statusBreakdown: { planning: 0, active: 0, on_hold: 0, completed: 0, archived: 0 },
        priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        totalProjects: 0,
        avgSprintDuration: 0,
      };
    }

    const statusBreakdown = { planning: 0, active: 0, on_hold: 0, completed: 0, archived: 0 };
    const priorityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    let totalHealth = 0;
    let totalSprintDuration = 0;
    let sprintCount = 0;

    for (const p of projects) {
      statusBreakdown[p.status as keyof typeof statusBreakdown]++;
      priorityBreakdown[p.priority as keyof typeof priorityBreakdown]++;
      totalHealth += (p.healthScore ?? 85);
      if (p.sprintDuration) { totalSprintDuration += p.sprintDuration; sprintCount++; }
    }

    return {
      avgHealth: Math.round(totalHealth / projects.length),
      avgCompletion: projects.filter((p) => p.status === "completed").length > 0
        ? Math.round((projects.filter((p) => p.status === "completed").length / projects.length) * 100) : 0,
      statusBreakdown,
      priorityBreakdown,
      totalProjects: projects.length,
      avgSprintDuration: sprintCount > 0 ? Math.round(totalSprintDuration / sprintCount) : 14,
    };
  }, [projects]);

  const maxStatus = Math.max(1, ...Object.values(analytics.statusBreakdown));
  const maxPriority = Math.max(1, ...Object.values(analytics.priorityBreakdown));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { title: "Avg Health Score", value: `${analytics.avgHealth}%`, icon: Activity, color: analytics.avgHealth >= 70 ? "text-[#0E9F6E]" : analytics.avgHealth >= 40 ? "text-amber-400" : "text-red-400" },
          { title: "Completion Rate", value: `${analytics.avgCompletion}%`, icon: CheckCircle2, color: "text-[#0E9F6E]" },
          { title: "Total Projects", value: String(analytics.totalProjects), icon: FolderKanban, color: "text-[#E8F5EE]" },
          { title: "Avg Sprint Duration", value: `${analytics.avgSprintDuration}d`, icon: Timer, color: "text-amber-400" },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[rgba(232,245,238,0.35)]">{item.title}</span>
              <item.icon className="w-4 h-4 text-[#0E9F6E]" />
            </div>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#E8F5EE] mb-4">Project Status Distribution</h3>
          {analytics.totalProjects === 0 ? (
            <p className="text-xs text-[rgba(232,245,238,0.25)] text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics.statusBreakdown).filter(([, v]) => v > 0).map(([key, value]) => {
                const labels: Record<string, string> = { planning: "Planning", active: "Active", on_hold: "On Hold", completed: "Completed", archived: "Archived" };
                const colors: Record<string, string> = { planning: "bg-amber-400", active: "bg-[#0E9F6E]", on_hold: "bg-orange-400", completed: "bg-green-400", archived: "bg-gray-400" };
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[rgba(232,245,238,0.5)]">{labels[key] || key}</span>
                      <span className="text-xs font-medium text-[#E8F5EE]">{value}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.04)]">
                      <div className={`h-full rounded-full ${colors[key] || "bg-gray-400"} transition-all duration-700`} style={{ width: `${(value / maxStatus) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Priority Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#E8F5EE] mb-4">Priority Distribution</h3>
          {analytics.totalProjects === 0 ? (
            <p className="text-xs text-[rgba(232,245,238,0.25)] text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics.priorityBreakdown).filter(([, v]) => v > 0).map(([key, value]) => {
                const colors: Record<string, string> = { critical: "bg-red-400", high: "bg-orange-400", medium: "bg-yellow-400", low: "bg-[#0E9F6E]" };
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[rgba(232,245,238,0.5)] capitalize">{key}</span>
                      <span className="text-xs font-medium text-[#E8F5EE]">{value}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.04)]">
                      <div className={`h-full rounded-full ${colors[key] || "bg-gray-400"} transition-all duration-700`} style={{ width: `${(value / maxPriority) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Project health list */}
      {projects && projects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#E8F5EE] mb-4">Project Health Overview</h3>
          <div className="space-y-2">
            {projects.map((p) => {
              const health = p.healthScore ?? 85;
              const healthColor = health >= 80 ? "bg-[#0E9F6E]" : health >= 50 ? "bg-amber-400" : "bg-red-400";
              const healthText = health >= 80 ? "text-[#0E9F6E]" : health >= 50 ? "text-amber-400" : "text-red-400";
              return (
                <div key={p._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[rgba(232,245,238,0.7)] truncate">{p.name}</p>
                    <p className="text-[10px] text-[rgba(232,245,238,0.3)] capitalize">{p.status} · {p.priority}</p>
                  </div>
                  <div className="w-24 h-2 rounded-full bg-[rgba(255,255,255,0.04)]">
                    <div className={`h-full rounded-full ${healthColor} transition-all duration-700`} style={{ width: `${health}%` }} />
                  </div>
                  <span className={`text-xs font-medium ${healthText} w-10 text-right`}>{health}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Enhanced Analytics Charts (10 new sections) ── */}
      <AnalyticsCharts projects={projects} />
    </motion.div>
  );
}
