import { useState, Suspense, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Smartphone, User, ArrowRight, Shield, Zap, Loader2,
  ChevronLeft, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthProps {
  redirectAfterAuth?: string;
}

export function AuthPage({ redirectAfterAuth = "/dashboard" }: AuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || redirectAfterAuth;
  const { isAuthenticated, isLoading, signInWithGoogle, signInAsGuest, signInWithOtp } = useAuth();

  const [method, setMethod] = useState<"choose" | "email" | "mobile">("choose");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  const handleEmailSubmit = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await signInWithOtp(email.trim());
      setOtpSent(true);
    } catch (e: any) {
      setError(e?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }, [email, signInWithOtp]);

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
      setLoading(false);
    }
  }, [signInWithGoogle]);

  const handleGuest = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await signInAsGuest();
      navigate(returnTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || "Guest sign-in failed");
      setLoading(false);
    }
  }, [signInAsGuest, navigate, returnTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050a08]">
        <Loader2 className="w-6 h-6 text-[#0E9F6E] animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050a08] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[rgba(14,159,110,0.1)] border border-[rgba(14,159,110,0.15)] flex items-center justify-center">
            <Zap className="w-7 h-7 text-[#0E9F6E]" />
          </div>
          <h1 className="text-2xl font-bold text-[rgba(232,245,238,0.95)] mb-1">
            Welcome to KORTEX AI
          </h1>
          <p className="text-sm text-[rgba(232,245,238,0.4)]">
            Sign in to access your workspace
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0a0f0d] border border-[rgba(14,159,110,0.12)] rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {method === "choose" && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {/* Google */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(232,245,238,0.8)] text-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                  <ArrowRight className="w-4 h-4 ml-auto opacity-40" />
                </button>

                {/* Email OTP */}
                <button
                  onClick={() => setMethod("email")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(232,245,238,0.8)] text-sm"
                >
                  <Mail className="w-5 h-5 text-[rgba(232,245,238,0.4)]" />
                  Continue with Email
                  <ArrowRight className="w-4 h-4 ml-auto opacity-40" />
                </button>

                {/* Guest */}
                <button
                  onClick={handleGuest}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(232,245,238,0.8)] text-sm disabled:opacity-50"
                >
                  <User className="w-5 h-5 text-[rgba(232,245,238,0.4)]" />
                  Continue as Guest
                  <ArrowRight className="w-4 h-4 ml-auto opacity-40" />
                </button>
              </motion.div>
            )}

            {method === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <button
                  onClick={() => { setMethod("choose"); setOtpSent(false); setOtpCode(""); setError(""); }}
                  className="flex items-center gap-1 text-xs text-[rgba(232,245,238,0.4)] hover:text-[rgba(232,245,238,0.6)]"
                >
                  <ChevronLeft className="w-3 h-3" /> Back
                </button>

                {!otpSent ? (
                  <>
                    <div>
                      <label className="text-xs text-[rgba(232,245,238,0.5)] mb-1 block">Email address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-[rgba(14,159,110,0.04)] border border-[rgba(14,159,110,0.1)] rounded-xl text-sm text-[rgba(232,245,238,0.9)] placeholder-[rgba(232,245,238,0.2)] focus:outline-none focus:border-[rgba(14,159,110,0.3)]"
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleEmailSubmit}
                      disabled={!email.trim() || loading}
                      className="w-full bg-[#0E9F6E] hover:bg-[#0c8a5f]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
                    </Button>
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-[rgba(232,245,238,0.6)] mb-3">
                      Code sent to <strong>{email}</strong>
                    </p>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otpCode.length === 6) {
                          setVerifying(true);
                          signInWithOtp(email).then(() => navigate(returnTo)).catch((e: any) => {
                            setError(e?.message || "Verification failed");
                            setVerifying(false);
                          });
                        }
                      }}
                      placeholder="000000"
                      className="w-full px-4 py-3 bg-[rgba(14,159,110,0.04)] border border-[rgba(14,159,110,0.1)] rounded-xl text-sm text-[rgba(232,245,238,0.9)] text-center tracking-[0.5em] font-mono placeholder-[rgba(232,245,238,0.2)] focus:outline-none focus:border-[rgba(14,159,110,0.3)]"
                      autoFocus
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-[rgba(232,245,238,0.2)] mt-6 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Secured by KORTEX AI
        </p>
      </motion.div>
    </div>
  );
}

export default AuthPage;
