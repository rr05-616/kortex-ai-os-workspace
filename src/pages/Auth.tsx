import { useState, Suspense, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Mail, UserX, ArrowRight, Loader2, Brain, KeyRound,
  Smartphone, Globe, ChevronDown, CheckCircle2, RefreshCw,
} from "lucide-react";

interface AuthProps {
  redirectAfterAuth?: string;
}

type AuthStep =
  | "method"           // Choose login method
  | "email-input"      // Enter email
  | "email-otp"        // Verify email OTP
  | "mobile-input"     // Enter mobile number
  | "mobile-otp"       // Verify mobile OTP
  | "loading";         // Processing

const COUNTRIES = [
  { code: "+1", flag: "🇺🇸", name: "US" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "AU" },
  { code: "+81", flag: "🇯🇵", name: "JP" },
  { code: "+49", flag: "🇩🇪", name: "DE" },
  { code: "+33", flag: "🇫🇷", name: "FR" },
  { code: "+86", flag: "🇨🇳", name: "CN" },
  { code: "+55", flag: "🇧🇷", name: "BR" },
  { code: "+82", flag: "🇰🇷", name: "KR" },
];

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);

  // ── State ──
  const [step, setStep] = useState<AuthStep>("method");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  // ── Redirect if already authenticated ──
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirect);
  }, [authLoading, isAuthenticated, navigate, redirect]);

  // ── Resend timer ──
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // ── Google OAuth ──
  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("google");
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setIsLoading(false);
    }
  }, [signIn, navigate, redirect]);

  // ── Email OTP Send ──
  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      await signIn("email-otp", formData);
      setStep("email-otp");
      setResendTimer(60);
      setResendAttempts(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  }, [email, signIn]);

  // ── Email OTP Verify ──
  const handleEmailOtpVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("code", otp);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch {
      setError("Invalid verification code. Please try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, signIn, navigate, redirect]);

  // ── Mobile OTP Send ──
  const handleMobileSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const fullPhone = `${country.code}${phone}`;
      const formData = new FormData();
      formData.set("phone", fullPhone);
      await signIn("mobile-otp", formData);
      setStep("mobile-otp");
      setResendTimer(60);
      setResendAttempts(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  }, [phone, country, signIn]);

  // ── Mobile OTP Verify ──
  const handleMobileOtpVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const fullPhone = `${country.code}${phone}`;
      const formData = new FormData();
      formData.set("phone", fullPhone);
      formData.set("code", otp);
      await signIn("mobile-otp", formData);
      navigate(redirect);
    } catch {
      setError("Invalid OTP. Please try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }, [otp, phone, country, signIn, navigate, redirect]);

  // ── Guest Login ──
  const handleGuestLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue as guest.");
    } finally {
      setIsLoading(false);
    }
  }, [signIn, navigate, redirect]);

  // ── Resend OTP ──
  const handleResendOtp = useCallback(async () => {
    if (resendAttempts >= 3) {
      setError("Maximum resend attempts reached. Please try again later.");
      return;
    }
    setResendAttempts((a) => a + 1);
    setIsLoading(true);
    setError(null);
    try {
      if (step === "email-otp") {
        const formData = new FormData();
        formData.set("email", email);
        await signIn("email-otp", formData);
      } else if (step === "mobile-otp") {
        const fullPhone = `${country.code}${phone}`;
        const formData = new FormData();
        formData.set("phone", fullPhone);
        await signIn("mobile-otp", formData);
      }
      setResendTimer(60);
    } catch {
      setError("Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  }, [step, email, phone, country, signIn, resendAttempts]);

  // ── OTP Input Handler ──
  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 1);
    const newOtp = otp.slice(0, index) + val + otp.slice(index + 1);
    setOtp(newOtp);
    if (val && index < 5) {
      const nextInput = e.currentTarget.parentElement?.children[index + 1] as HTMLInputElement | undefined;
      nextInput?.focus();
    }
    // Auto-submit when all 6 digits entered
    if (newOtp.length === 6 && val) {
      setTimeout(() => {
        if (step === "email-otp") {
          const form = e.currentTarget.closest("form");
          form?.requestSubmit();
        } else if (step === "mobile-otp") {
          const form = e.currentTarget.closest("form");
          form?.requestSubmit();
        }
      }, 100);
    }
  }, [otp, step]);

  const handleOtpKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = e.currentTarget.parentElement?.children[index - 1] as HTMLInputElement | undefined;
      prevInput?.focus();
    }
  }, [otp]);

  // ── Paste handler ──
  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) setOtp(pasted);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#040705] relative overflow-hidden">
      {/* Background */}
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
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[rgba(14,159,110,0.15)] flex items-center justify-center shadow-lg shadow-[rgba(14,159,110,0.1)]">
                <span className="text-[#0E9F6E] font-bold text-lg">K</span>
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#E8F5EE]">KORTEX</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="glass-card rounded-2xl p-8"
            >
              {/* ═══ METHOD SELECTION ═══ */}
              {step === "method" && (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                      <Sparkles className="w-3 h-3 text-[#0E9F6E]" />
                      <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">AI-Powered Workspace</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#E8F5EE]">Welcome to KORTEX</h1>
                    <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">Choose how you&apos;d like to sign in</p>
                  </div>

                  <div className="space-y-3">
                    {/* Google */}
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="btn-liquid w-full h-12 flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      Continue with Google
                    </button>

                    {/* Mobile */}
                    <button
                      onClick={() => setStep("mobile-input")}
                      disabled={isLoading}
                      className="btn-liquid w-full h-12"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Continue with Mobile
                    </button>

                    {/* Email */}
                    <button
                      onClick={() => setStep("email-input")}
                      disabled={isLoading}
                      className="btn-liquid w-full h-12"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Continue with Email
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[rgba(255,255,255,0.04)]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[rgba(255,255,255,0.02)] px-3 text-[rgba(232,245,238,0.3)]">Or</span>
                    </div>
                  </div>

                  {/* Guest */}
                  <button
                    type="button"
                    className="btn-liquid btn-liquid-ghost w-full h-12"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Continue as Guest
                  </button>

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2 mt-4">
                      {error}
                    </motion.p>
                  )}
                </>
              )}

              {/* ═══ EMAIL INPUT ═══ */}
              {step === "email-input" && (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                      <Mail className="w-3 h-3 text-[#0E9F6E]" />
                      <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">Email Verification</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#E8F5EE]">Enter your email</h1>
                    <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">We&apos;ll send a verification code</p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)]"
                      disabled={isLoading}
                      required
                      autoFocus
                    />
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2">{error}</motion.p>
                    )}
                    <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading || !email.trim()}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send Code <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </form>

                  <button onClick={() => { setStep("method"); setError(null); }}
                    className="btn-liquid btn-liquid-ghost w-full mt-3 h-10 text-[rgba(232,245,238,0.4)]">
                    Back to all methods
                  </button>
                </>
              )}

              {/* ═══ EMAIL OTP ═══ */}
              {step === "email-otp" && (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                      <Brain className="w-3 h-3 text-[#0E9F6E]" />
                      <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">Verify Identity</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#E8F5EE]">Check your email</h1>
                    <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">
                      Code sent to <span className="text-[#E8F5EE] font-medium">{email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleEmailOtpVerify}>
                    <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input key={i} type="text" maxLength={1} inputMode="numeric"
                          className="w-11 h-12 rounded-xl glass-input text-center text-lg font-bold text-[#E8F5EE]"
                          value={otp[i] || ""}
                          onChange={(e) => handleOtpChange(e, i)}
                          onKeyDown={(e) => handleOtpKeyDown(e, i)}
                          disabled={isLoading} />
                      ))}
                    </div>

                    {error && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2 text-center mb-4">{error}</motion.p>
                    )}

                    <p className="text-sm text-[rgba(232,245,238,0.35)] text-center mb-6">
                      {resendTimer > 0 ? (
                        <span>Resend code in {resendTimer}s</span>
                      ) : (
                        <button type="button" className="text-[#0E9F6E] font-medium hover:underline"
                          onClick={handleResendOtp} disabled={isLoading}>
                          <RefreshCw className="w-3 h-3 inline mr-1" />Resend code
                        </button>
                      )}
                    </p>

                    <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading || otp.length !== 6}>
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying...</> : <><KeyRound className="w-4 h-4 mr-2" />Verify Code<ArrowRight className="w-4 h-4 ml-2" /></>}
                    </button>

                    <button type="button" className="btn-liquid btn-liquid-ghost w-full mt-3 h-10 text-[rgba(232,245,238,0.4)]"
                      onClick={() => { setStep("method"); setOtp(""); setError(null); }} disabled={isLoading}>
                      Use different method
                    </button>
                  </form>
                </>
              )}

              {/* ═══ MOBILE INPUT ═══ */}
              {step === "mobile-input" && (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                      <Smartphone className="w-3 h-3 text-[#0E9F6E]" />
                      <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">Mobile Verification</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#E8F5EE]">Enter your mobile number</h1>
                    <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">We&apos;ll send an OTP to verify</p>
                  </div>

                  <form onSubmit={handleMobileSubmit} className="space-y-4">
                    <div className="flex gap-2">
                      {/* Country Code Picker */}
                      <div className="relative">
                        <button type="button"
                          onClick={() => setShowCountryPicker(!showCountryPicker)}
                          className="h-12 px-3 rounded-xl glass-input flex items-center gap-2 text-sm text-[#E8F5EE] min-w-[90px]">
                          <span>{country.flag}</span>
                          <span className="text-[rgba(232,245,238,0.5)]">{country.code}</span>
                          <ChevronDown className="w-3 h-3 text-[rgba(232,245,238,0.3)]" />
                        </button>
                        {showCountryPicker && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full mt-1 left-0 w-48 glass-strong rounded-xl p-2 shadow-xl z-50 max-h-60 overflow-y-auto">
                            {COUNTRIES.map((c) => (
                              <button key={c.code} type="button"
                                onClick={() => { setCountry(c); setShowCountryPicker(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${c.code === country.code ? "bg-[rgba(14,159,110,0.1)] text-[#0E9F6E]" : "text-[rgba(232,245,238,0.5)] hover:bg-[rgba(255,255,255,0.03)]"}`}>
                                <span>{c.flag}</span>
                                <span>{c.name}</span>
                                <span className="ml-auto text-[rgba(232,245,238,0.3)]">{c.code}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Phone Input */}
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 h-12 px-4 rounded-xl glass-input text-sm text-[#E8F5EE] placeholder:text-[rgba(232,245,238,0.2)]"
                        disabled={isLoading}
                        required
                        autoFocus
                      />
                    </div>

                    {error && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2">{error}</motion.p>
                    )}

                    <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading || !phone.trim()}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send OTP <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </form>

                  <button onClick={() => { setStep("method"); setError(null); }}
                    className="btn-liquid btn-liquid-ghost w-full mt-3 h-10 text-[rgba(232,245,238,0.4)]">
                    Back to all methods
                  </button>
                </>
              )}

              {/* ═══ MOBILE OTP ═══ */}
              {step === "mobile-otp" && (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-4">
                      <CheckCircle2 className="w-3 h-3 text-[#0E9F6E]" />
                      <span className="text-[10px] font-medium text-[rgba(232,245,238,0.5)]">OTP Sent</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#E8F5EE]">Enter verification code</h1>
                    <p className="mt-2 text-sm text-[rgba(232,245,238,0.35)]">
                      Code sent to <span className="text-[#E8F5EE] font-medium">{country.code} {phone}</span>
                    </p>
                  </div>

                  <form onSubmit={handleMobileOtpVerify}>
                    <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input key={i} type="text" maxLength={1} inputMode="numeric"
                          className="w-11 h-12 rounded-xl glass-input text-center text-lg font-bold text-[#E8F5EE]"
                          value={otp[i] || ""}
                          onChange={(e) => handleOtpChange(e, i)}
                          onKeyDown={(e) => handleOtpKeyDown(e, i)}
                          disabled={isLoading} />
                      ))}
                    </div>

                    {error && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 bg-[rgba(231,76,60,0.1)] rounded-lg px-3 py-2 text-center mb-4">{error}</motion.p>
                    )}

                    <p className="text-sm text-[rgba(232,245,238,0.35)] text-center mb-6">
                      {resendTimer > 0 ? (
                        <span>Resend OTP in {resendTimer}s</span>
                      ) : (
                        <button type="button" className="text-[#0E9F6E] font-medium hover:underline"
                          onClick={handleResendOtp} disabled={isLoading}>
                          <RefreshCw className="w-3 h-3 inline mr-1" />Resend OTP
                        </button>
                      )}
                    </p>

                    <button type="submit" className="btn-liquid btn-liquid-solid w-full h-12" disabled={isLoading || otp.length !== 6}>
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying...</> : <><KeyRound className="w-4 h-4 mr-2" />Verify OTP<ArrowRight className="w-4 h-4 ml-2" /></>}
                    </button>

                    <button type="button" className="btn-liquid btn-liquid-ghost w-full mt-3 h-10 text-[rgba(232,245,238,0.4)]"
                      onClick={() => { setStep("method"); setOtp(""); setError(null); }} disabled={isLoading}>
                      Use different method
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </AnimatePresence>

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
