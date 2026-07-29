import { useEffect, useState } from "react";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "offline";
  latency?: number;
  detail?: string;
}

interface HealthReport {
  status: "healthy" | "degraded" | "offline";
  uptime: number;
  timestamp: string;
  version: string;
  services: ServiceHealth[];
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

const startTime = Date.now();

function getMemoryInfo() {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
  if (perf.memory) {
    return {
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
    };
  }
  return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

async function checkConvex(): Promise<ServiceHealth> {
  const t0 = performance.now();
  try {
    const url = import.meta.env.VITE_CONVEX_URL;
    if (!url) return { name: "Convex", status: "degraded", detail: "VITE_CONVEX_URL not configured" };
    const response = await fetch(`${url}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "users:currentUser", args: {} }),
    });
    const latency = Math.round(performance.now() - t0);
    if (response.ok || response.status === 401 || response.status === 400) {
      return { name: "Convex", status: "healthy", latency, detail: `Connected (${response.status})` };
    }
    return { name: "Convex", status: "degraded", latency, detail: `HTTP ${response.status}` };
  } catch (err) {
    return { name: "Convex", status: "offline", detail: err instanceof Error ? err.message : "Connection failed" };
  }
}

async function checkFastAPI(): Promise<ServiceHealth> {
  const t0 = performance.now();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${backendUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Math.round(performance.now() - t0);
    if (response.ok) {
      return { name: "FastAPI", status: "healthy", latency, detail: "Connected" };
    }
    return { name: "FastAPI", status: "degraded", latency, detail: `HTTP ${response.status}` };
  } catch {
    return { name: "FastAPI", status: "offline", detail: "Unreachable (expected if not running)" };
  }
}

async function checkGemini(): Promise<ServiceHealth> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return { name: "Gemini AI", status: "degraded", detail: "VITE_GEMINI_API_KEY not configured" };
  }
  return { name: "Gemini AI", status: "healthy", detail: "API key configured" };
}

function StatusIcon({ status }: { status: string }) {
  const colors = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    offline: "bg-red-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status as keyof typeof colors] || "bg-gray-500"}`} />;
}

export default function HealthCheck() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function run() {
      const [convex, fastapi, gemini] = await Promise.all([checkConvex(), checkFastAPI(), checkGemini()]);
      const services = [convex, fastapi, gemini];
      const memory = getMemoryInfo();
      const overall = services.every((s) => s.status === "healthy")
        ? "healthy"
        : services.some((s) => s.status === "offline")
          ? "offline"
          : "degraded";
      const healthReport: HealthReport = {
        status: overall,
        uptime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        services,
        memory,
      };
      if (mounted) {
        setReport(healthReport);
        setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, []);

  // If the URL has ?json, return raw JSON
  if (typeof window !== "undefined" && window.location.search.includes("json")) {
    if (loading) return <pre>Loading...</pre>;
    return <pre style={{ fontFamily: "monospace", fontSize: 14, padding: 16, background: "#000", color: "#0f0", minHeight: "100vh" }}>{JSON.stringify(report, null, 2)}</pre>;
  }

  return (
    <div className="min-h-screen bg-[#040705] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#E8F5EE]">System Health</h1>
            <p className="text-sm text-[rgba(232,245,238,0.35)] mt-2">KORTEX AI Production Monitor</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-[#0E9F6E] border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-[rgba(232,245,238,0.35)] mt-4">Checking services...</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[rgba(14,159,110,0.06)] border border-[rgba(14,159,110,0.1)]">
                <div className="flex items-center gap-3">
                  <StatusIcon status={report.status} />
                  <span className="text-sm font-semibold text-[#E8F5EE]">Overall Status</span>
                </div>
                <span className={`text-sm font-bold uppercase ${report.status === "healthy" ? "text-emerald-400" : report.status === "degraded" ? "text-amber-400" : "text-red-400"}`}>
                  {report.status}
                </span>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-[rgba(232,245,238,0.3)] uppercase tracking-wider">Services</h3>
                {report.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={service.status} />
                      <span className="text-sm text-[rgba(232,245,238,0.7)]">{service.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${service.status === "healthy" ? "text-emerald-400" : service.status === "degraded" ? "text-amber-400" : "text-red-400"}`}>
                        {service.status}
                      </span>
                      {service.latency !== undefined && (
                        <span className="text-[10px] text-[rgba(232,245,238,0.25)] ml-2">{service.latency}ms</span>
                      )}
                      {service.detail && (
                        <p className="text-[10px] text-[rgba(232,245,238,0.2)]">{service.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* System Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-[rgba(232,245,238,0.3)] uppercase tracking-wider">System</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[10px] text-[rgba(232,245,238,0.3)]">Uptime</p>
                    <p className="text-sm font-medium text-[#E8F5EE]">{formatUptime(report.uptime)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[10px] text-[rgba(232,245,238,0.3)]">Version</p>
                    <p className="text-sm font-medium text-[#E8F5EE]">{report.version}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[10px] text-[rgba(232,245,238,0.3)]">JS Heap Used</p>
                    <p className="text-sm font-medium text-[#E8F5EE]">{formatBytes(report.memory.usedJSHeapSize)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[10px] text-[rgba(232,245,238,0.3)]">Heap Limit</p>
                    <p className="text-sm font-medium text-[#E8F5EE]">{formatBytes(report.memory.jsHeapSizeLimit)}</p>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <p className="text-[10px] text-[rgba(232,245,238,0.2)] text-center">
                Checked at {report.timestamp}
              </p>

              {/* JSON link */}
              <p className="text-[10px] text-[rgba(232,245,238,0.2)] text-center">
                Raw JSON: <a href="/health?json" className="text-[#0E9F6E] hover:underline">/health?json</a>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
