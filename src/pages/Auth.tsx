import { useState, Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Sparkles, Mail, UserX, ArrowRight, Loader2, Brain } from "lucide-react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirect);
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    try {
      // Direct email login — store session and redirect
      await signIn("email", { email: trimmed });
      // navigate is called by the useEffect above once isAuthenticated flips
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      // navigate is called by the useEffect above once isAuthenticated flips
    } catch (err) {
      setError(`Failed to sign in as guest: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#040705] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 rounded-full bg-[rgba(14,159,110,0.04)] blur-[120px]" />
        <div className="absolute bottom-1/3 -right-40 w-80 h-80 rounded-full bg-[rgba(14,159,110,0.03)] blur-[120px]" />
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="flex justify-center mb-8">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[rgba(14,159,110,0.15)] flex items-center justify-center shadow-lg shadow-[rgba(14,159,110,0.1)]">
                <span className="text-[#0E9F6E] font-bold text-lg">K</span>
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#E8F5EE]">KORTEX</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                <Sparkles className="w-3 h-3 text-[#0E9F6E]" />
                <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">AI-Powered Workspace</span>
              </div>
              <h1 className="text-2xl font-bold text-[#E8F5EE]">Welcome to KORTEX</h1>
              <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">Enter your email to get started</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(232,245,238,0.3)]" />
                <input
                  name="email"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)]"
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2">{error}</motion.p>
              )}
              <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading || !email.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue with Email
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[rgba(255,255,255,0.04)]" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[rgba(255,255,255,0.02)] px-3 text-[rgba(232,245,238,0.3)]">Or</span>
                </div>
              </div>
              <button type="button" className="btn-liquid w-full mt-4 h-12" onClick={handleGuestLogin} disabled={isLoading}>
                <UserX className="w-4 h-4 mr-2" />Continue as Guest
              </button>
            </div>
          </div>

          <p className="mt-6 text-xs text-center text-[rgba(232,245,238,0.15)]">
            Secured by{" "}
            <a href="https://freebuff.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0E9F6E] transition-colors">freebuff.com</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
