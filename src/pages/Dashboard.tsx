import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import ProjectCard from "@/components/dashboard/ProjectCard";
import ProjectDetail from "@/components/dashboard/ProjectDetail";
import NewProjectDialog from "@/components/dashboard/NewProjectDialog";
import AICopilot from "@/components/dashboard/AICopilot";
import Settings from "@/components/dashboard/Settings";
import logo from "@/assets/logo.svg";
import {
  LogOut,
  Bell,
  Search,
  Plus,
  Sparkles,
  Kanban,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Target,
  ChevronRight,
  Settings as SettingsIcon,
  MessageSquare,
  LayoutDashboard,
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

  const projects = useQuery(api.projects.list, {});
  const notificationsData = useQuery(api.notifications.recent, { limit: 10 });
  const unreadCount = useQuery(api.notifications.unreadCount, {});
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const totalProjects = projects?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
  const planningProjects = projects?.filter((p) => p.status === "planning").length ?? 0;

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
                {currentView === "dashboard" ? "Here's your project overview for today." : currentView === "projects" ? `${totalProjects} project${totalProjects !== 1 ? "s" : ""} — ${activeProjects} active` : currentView === "sprints" ? "Track sprint progress." : "Real-time metrics and AI insights."}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
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
                  { label: "Team Members", value: "1", change: "You", icon: Users },
                  { label: "Sprint Velocity", value: "--", change: "Start a sprint", icon: Clock },
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
                        <ProjectCard key={project._id} project={project} index={i} onClick={() => setSelectedProjectId(project._id)} />
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
                  <ProjectCard key={project._id} project={project} index={i + 1} onClick={() => setSelectedProjectId(project._id)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* SPRINTS VIEW */}
          {currentView === "sprints" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-8 text-center">
              <Target className="w-12 h-12 text-[rgba(232,245,238,0.1)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#E8F5EE] mb-2">Sprints Overview</h3>
              <p className="text-sm text-[rgba(232,245,238,0.3)] max-w-md mx-auto mb-6">
                Select a project to view and manage its sprints.
              </p>
              {projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {projects.map((project) => (
                    <button key={project._id} onClick={() => setSelectedProjectId(project._id)} className="glass rounded-xl p-4 text-left hover:bg-[rgba(14,159,110,0.05)] transition-all">
                      <p className="text-sm font-medium text-[#E8F5EE]">{project.name}</p>
                      <p className="text-[10px] text-[rgba(232,245,238,0.3)] mt-1">{project.sprintDuration ?? 14}-day sprints</p>
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => setShowNewProject(true)} className="btn-liquid btn-liquid-solid h-9 px-4 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />Create a project first
                </button>
              )}
            </motion.div>
          )}

          {/* ANALYTICS VIEW */}
          {currentView === "analytics" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Project Health", desc: "Average health score", value: projects && projects.length > 0 ? `${Math.round(projects.reduce((a, p) => a + (p.healthScore ?? 85), 0) / projects.length)}%` : "--" },
                { title: "Task Completion", desc: "Overall completion rate", value: "--" },
                { title: "Active Sprints", desc: "Currently in progress", value: "0" },
                { title: "AI Insights", desc: "Recommendations generated", value: "--" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="glass-card rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-[#E8F5EE] mb-1">{item.title}</h3>
                  <p className="text-[11px] text-[rgba(232,245,238,0.3)] mb-4">{item.desc}</p>
                  <p className="text-3xl font-bold text-[#0E9F6E]">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>

      <NewProjectDialog open={showNewProject} onOpenChange={setShowNewProject} />

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
