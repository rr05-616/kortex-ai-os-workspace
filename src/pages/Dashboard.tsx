import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/dashboard/ProjectCard";
import ProjectDetail from "@/components/dashboard/ProjectDetail";
import NewProjectDialog from "@/components/dashboard/NewProjectDialog";
import AICopilot from "@/components/dashboard/AICopilot";
import Settings from "@/components/dashboard/Settings";
import {
  LayoutDashboard,
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
  ListTodo,
  Target,
  ChevronRight,
  Settings as SettingsIcon,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.svg";

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

  // State
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Real data from Convex
  const projects = useQuery(api.projects.list, {});
  const notificationsData = useQuery(api.notifications.recent, { limit: 10 });
  const unreadCount = useQuery(api.notifications.unreadCount, {});
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Derived stats
  const totalProjects = projects?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === "active").length ?? 0;
  const planningProjects = projects?.filter((p) => p.status === "planning").length ?? 0;

  // If a project is selected, show its detail
  if (selectedProjectId) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="fixed inset-0 bg-dot-pattern opacity-40 pointer-events-none" />
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#0E9F6E]/[0.02] blur-[120px] pointer-events-none" />
        <div className="relative z-10">
          <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
            <div className="max-w-7xl mx-auto glass-strong rounded-full px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedProjectId(null); setCurrentView("dashboard"); }}
                  className="w-7 h-7 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                  <img src={logo} alt="KORTEX" className="w-7 h-7 rounded-lg" />
                  <span className="text-xs font-semibold text-foreground">KORTEX</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCopilot(true)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#0E9F6E]" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <div className="w-7 h-7 rounded-full bg-[#0E9F6E]/15 flex items-center justify-center text-[10px] font-semibold text-[#0E9F6E]">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-6">
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={() => { setSelectedProjectId(null); setCurrentView("projects"); }}
            />
          </main>
        </div>

        {/* AI Copilot Overlay */}
        <AnimatePresence>
          {showCopilot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowCopilot(false)}
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
                <AICopilot
                  projectId={selectedProjectId}
                  onClose={() => setShowCopilot(false)}
                  expanded
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowSettings(false)}
            >
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
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="fixed inset-0 bg-dot-pattern opacity-40 pointer-events-none" />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#0E9F6E]/[0.02] blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
          <div className="max-w-7xl mx-auto glass-strong rounded-full px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="flex items-center gap-2">
                <img src={logo} alt="KORTEX" className="w-8 h-8 rounded-lg" />
                <span className="text-sm font-bold text-foreground hidden sm:inline">KORTEX</span>
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      currentView === item.id
                        ? "bg-[#0E9F6E]/10 text-[#0E9F6E]"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* AI Copilot toggle */}
              <button
                onClick={() => setShowCopilot(!showCopilot)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  showCopilot
                    ? "bg-[#0E9F6E] text-white"
                    : "glass hover:bg-[#0E9F6E]/10"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors relative"
                >
                  <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                  {(unreadCount ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0E9F6E] text-[8px] font-bold text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 glass-strong rounded-2xl p-3 shadow-xl z-50 max-h-96 overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs font-semibold text-foreground">Notifications</span>
                        <button
                          onClick={() => markAllRead()}
                          className="text-[10px] text-[#0E9F6E] hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      {(notificationsData ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 text-center py-6">
                          No notifications yet
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {(notificationsData ?? []).map((n) => (
                            <div
                              key={n._id}
                              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                                !n.read ? "bg-[#0E9F6E]/5" : "hover:bg-white/40"
                              }`}
                            >
                              <div className="mt-0.5">
                                {n.type === "risk_alert" || n.type === "dependency_warning" ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full bg-[#0E9F6E]/30" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground/80 truncate">{n.title}</p>
                                {n.content && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-2">
                                    {n.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#0E9F6E]/15 flex items-center justify-center text-xs font-semibold text-[#0E9F6E]">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Welcome Header */}
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
          >
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-3">
                <Sparkles className="w-3 h-3 mr-1" />
                {currentView === "dashboard" ? "AI Workspace Active" : `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} View`}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {currentView === "dashboard"
                  ? `Welcome back${user?.name ? `, ${user.name}` : ""}`
                  : currentView === "projects"
                    ? "Your Projects"
                    : currentView === "sprints"
                      ? "Sprints Overview"
                      : "Analytics Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {currentView === "dashboard"
                  ? "Here's your project overview for today."
                  : currentView === "projects"
                    ? `${totalProjects} project${totalProjects !== 1 ? "s" : ""} — ${activeProjects} active`
                    : currentView === "sprints"
                      ? "Track sprint progress across your projects."
                      : "Real-time metrics and AI-powered insights."}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button
                size="sm"
                onClick={() => setShowNewProject(true)}
                className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-md shadow-green-500/20 text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Project
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSignOut}
                className="rounded-full glass text-xs h-9 text-muted-foreground"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Sign out
              </Button>
            </div>
          </motion.div>

          {/* DASHBOARD VIEW */}
          {currentView === "dashboard" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Projects", value: String(totalProjects), change: `${activeProjects} active`, icon: Kanban },
                  { label: "Active Projects", value: String(activeProjects), change: `${planningProjects} planning`, icon: TrendingUp },
                  { label: "Team Members", value: "1", change: "You", icon: Users },
                  { label: "Sprint Velocity", value: "--", change: "Start a sprint", icon: Clock },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 * i }}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <div className="w-7 h-7 rounded-lg bg-[#0E9F6E]/10 flex items-center justify-center">
                        <stat.icon className="w-3.5 h-3.5 text-[#0E9F6E]" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                      <span className="text-[11px] font-medium text-[#0E9F6E]">{stat.change}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Panel - Projects */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="lg:col-span-2 glass rounded-3xl p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
                    <button
                      onClick={() => setCurrentView("projects")}
                      className="text-[10px] text-[#0E9F6E] hover:underline flex items-center gap-1"
                    >
                      View all
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {!projects ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-pulse text-xs text-muted-foreground">Loading projects...</div>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderKanban className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground/50 mb-4">No projects yet</p>
                      <Button
                        size="sm"
                        onClick={() => setShowNewProject(true)}
                        className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Create your first project
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {projects.slice(0, 4).map((project, i) => (
                        <ProjectCard
                          key={project._id}
                          project={project}
                          index={i}
                          onClick={() => setSelectedProjectId(project._id)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Side Panel - AI Copilot */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <AICopilot />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* PROJECTS VIEW */}
          {currentView === "projects" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* New Project Card */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0 }}
                  whileHover={{ y: -3 }}
                  onClick={() => setShowNewProject(true)}
                  className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px] border-dashed border-2 border-border/40 hover:border-[#0E9F6E]/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0E9F6E]/10 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-[#0E9F6E]" />
                  </div>
                  <p className="text-sm font-medium text-foreground">New Project</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Create with AI assistance</p>
                </motion.button>

                {/* Existing Projects */}
                {!projects ? (
                  <div className="col-span-full flex items-center justify-center py-20">
                    <div className="animate-pulse text-xs text-muted-foreground">Loading projects...</div>
                  </div>
                ) : (
                  projects.map((project, i) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      index={i + 1}
                      onClick={() => setSelectedProjectId(project._id)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* SPRINTS VIEW */}
          {currentView === "sprints" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="glass rounded-3xl p-8 text-center"
            >
              <Target className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sprints Overview</h3>
              <p className="text-sm text-muted-foreground/60 max-w-md mx-auto mb-6">
                Select a project to view and manage its sprints. Sprints help your team plan and track work in fixed timeboxes.
              </p>
              {projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {projects.map((project) => (
                    <button
                      key={project._id}
                      onClick={() => setSelectedProjectId(project._id)}
                      className="glass rounded-2xl p-4 text-left hover:bg-[#0E9F6E]/5 transition-all"
                    >
                      <p className="text-sm font-medium text-foreground">{project.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {project.sprintDuration ?? 14}-day sprints
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowNewProject(true)}
                  className="rounded-full bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create a project first
                </Button>
              )}
            </motion.div>
          )}

          {/* ANALYTICS VIEW */}
          {currentView === "analytics" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Project Health", desc: "Average health score across all projects", value: projects && projects.length > 0 ? `${Math.round(projects.reduce((a, p) => a + (p.healthScore ?? 85), 0) / projects.length)}%` : "--" },
                  { title: "Task Completion", desc: "Overall completion rate", value: "--" },
                  { title: "Active Sprints", desc: "Currently in progress", value: "0" },
                  { title: "AI Insights", desc: "Intelligent recommendations generated", value: "--" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="glass rounded-3xl p-6"
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground/60 mb-4">{item.desc}</p>
                    <p className="text-3xl font-bold text-[#0E9F6E]">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
      />

      {/* AI Copilot Overlay */}
      <AnimatePresence>
        {showCopilot && !selectedProjectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCopilot(false)}
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
              <AICopilot
                onClose={() => setShowCopilot(false)}
                expanded
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && !selectedProjectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl">
              <Settings onClose={() => setShowSettings(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
