import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";

const stats = [
  { label: "Active Projects", value: "12", change: "+2", icon: Kanban },
  { label: "Sprint Velocity", value: "47", change: "+8%", icon: TrendingUp },
  { label: "Team Members", value: "8", change: "Online", icon: Users },
  { label: "Hours Tracked", value: "164", change: "This week", icon: Clock },
];

const recentActivity = [
  { text: "Sprint 4 planning completed", time: "2m ago", type: "success" },
  { text: "AI detected schedule risk in Backend API", time: "15m ago", type: "warning" },
  { text: "New task assigned: Design system audit", time: "1h ago", type: "info" },
  { text: "Sprint velocity trending +15%", time: "2h ago", type: "success" },
  { text: "Merge conflict detected in main branch", time: "3h ago", type: "warning" },
];

const teamMembers = [
  { name: "Alex Chen", role: "Lead Engineer", status: "online", avatar: "AC" },
  { name: "Sarah Kim", role: "Frontend", status: "online", avatar: "SK" },
  { name: "Marcus Lee", role: "Backend", status: "away", avatar: "ML" },
  { name: "Emma Wilson", role: "Design", status: "offline", avatar: "EW" },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="fixed inset-0 bg-dot-pattern opacity-40 pointer-events-none" />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#0E9F6E]/[0.02] blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
          <div className="max-w-7xl mx-auto glass-strong rounded-full px-5 py-2.5 flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0E9F6E] flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {["Dashboard", "Projects", "Sprints", "Analytics"].map((item) => (
                  <button
                    key={item}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      item === "Dashboard"
                        ? "bg-[#0E9F6E]/10 text-[#0E9F6E]"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-[#0E9F6E]/10 transition-colors relative">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0E9F6E]" />
              </button>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
          >
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-3">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Workspace Active
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome back{user?.name ? `, ${user.name}` : ""}
              </h1>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Here&apos;s your project overview for today.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button
                size="sm"
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {stats.map((stat, i) => (
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
            {/* Main Panel - Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 glass rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                <span className="text-[10px] text-[#0E9F6E] cursor-pointer hover:underline">
                  View all
                </span>
              </div>
              <div className="space-y-1">
                {recentActivity.map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/40 transition-colors"
                  >
                    {activity.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-[#0E9F6E] shrink-0 mt-0.5" />
                    ) : activity.type === "warning" ? (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[#0E9F6E]/20 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/80 truncate">
                        {activity.text}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Side Panel - Team */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-foreground">Team</h2>
                <span className="text-[10px] text-[#0E9F6E] cursor-pointer hover:underline">
                  Manage
                </span>
              </div>
              <div className="space-y-2">
                {teamMembers.map((member, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/40 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[#0E9F6E]/15 flex items-center justify-center text-[10px] font-semibold text-[#0E9F6E]">
                        {member.avatar}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          member.status === "online"
                            ? "bg-[#0E9F6E]"
                            : member.status === "away"
                              ? "bg-amber-400"
                              : "bg-gray-300"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Suggestion */}
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="glass rounded-xl p-3 flex items-start gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0E9F6E] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    AI suggests adding 2 more engineers to meet the sprint goal
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions / AI Copilot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 glass rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0E9F6E]/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#0E9F6E]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  AI Copilot
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Ask KORTEX anything about your projects
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Create a new sprint plan",
                "Analyze project risks",
                "Generate release notes",
                "Summarize recent activity",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  className="px-3.5 py-2 rounded-full text-xs text-muted-foreground glass hover:bg-[#0E9F6E]/10 hover:text-[#0E9F6E] transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
