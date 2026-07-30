import { useState, Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Sparkles, Mail, UserX, ArrowRight, Loader2 } from "lucide-react";

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

  // Email OTP flow: "signIn" → enter email → "otp" → enter code → authenticated
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to dashboard once authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirect);
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // Step 1: Send OTP to email
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    if (!email) return;

    setIsLoading(true);
    setError(null);
    try {
      // Convex Auth: send OTP — provider id is "email-otp"
      await signIn("email-otp", formData);
      setStep({ email });
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("email", step.email);
    formData.set("code", otp);

    setIsLoading(true);
    setError(null);
    try {
      // Convex Auth: verify OTP — same provider, with code
      await signIn("email-otp", formData);
      // isAuthenticated flips → useEffect navigates to dashboard
    } catch {
      setError("The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // Guest login via Convex Anonymous provider
  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      // isAuthenticated flips → useEffect navigates to dashboard
    } catch (err) {
      setError(`Failed to sign in as guest: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    const newOtp = otp.slice(0, index) + val + otp.slice(index + 1);
    setOtp(newOtp);
    if (val && index < 5) {
      const nextInput = e.currentTarget.parentElement?.children[index + 1] as HTMLInputElement | undefined;
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = e.currentTarget.parentElement?.children[index - 1] as HTMLInputElement | undefined;
      if (prevInput) prevInput.focus();
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
            {step === "signIn" ? (
              <>
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
                    <input name="email" placeholder="name@example.com" type="email"
                      className="w-full h-12 pl-10 pr-4 rounded-xl glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)]"
                      disabled={isLoading} required autoFocus />
                  </div>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2">{error}</motion.p>
                  )}
                  <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading}>
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
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                    <Mail className="w-3 h-3 text-[#0E9F6E]" />
                    <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">Verify Identity</span>
                  </div>
                  <h1 className="text-xl font-bold text-[#E8F5EE]">Check your email</h1>
                  <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">
                    We&apos;ve sent a 6-digit code to <span className="text-[#E8F5EE] font-medium">{step.email}</span>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit}>
                  <input type="hidden" name="email" value={step.email} />

                  <div className="flex justify-center gap-2 mb-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input key={i} type="text" maxLength={1}
                        className="w-11 h-12 rounded-xl glass-input text-center text-lg font-bold text-[#E8F5EE]"
                        value={otp[i] || ""}
                        onChange={(e) => handleOtpChange(e, i)}
                        onKeyDown={(e) => handleOtpKeyDown(e, i)}
                        disabled={isLoading} />
                    ))}
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2 text-center mb-4">{error}</motion.p>
                  )}

                  <p className="text-sm text-[rgba(232,245,238,0.35)] text-center mb-6">
                    Didn&apos;t receive a code?{" "}
                    <button type="button" className="text-[#0E9F6E] font-medium hover:underline" onClick={() => { setStep("signIn"); setError(null); setOtp(""); }}>Try again</button>
                  </p>

                  <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify Code
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>

                  <button type="button" className="btn-liquid btn-liquid-ghost w-full mt-3 h-10 text-[rgba(232,245,238,0.4)]"
                    onClick={() => { setStep("signIn"); setError(null); setOtp(""); }} disabled={isLoading}>
                    Use different email
                  </button>
                </form>
              </>
            )}
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
