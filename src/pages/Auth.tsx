import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX, Sparkles, Brain } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      console.log("signed in");
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting anonymous sign in...");
      await signIn("anonymous");
      console.log("Anonymous sign in successful");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 rounded-full bg-[#0E9F6E]/[0.04] blur-[100px]" />
        <div className="absolute bottom-1/3 -right-40 w-80 h-80 rounded-full bg-[#0E9F6E]/[0.03] blur-[100px]" />
        <div className="absolute inset-0 bg-dot-pattern opacity-40" />
      </div>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group"
            >
              <div className="relative w-10 h-10 rounded-xl bg-[#0E9F6E] flex items-center justify-center shadow-lg shadow-green-500/20">
                <span className="text-white font-bold text-lg tracking-tight">K</span>
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/20 ring-inset" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-foreground">
                KORTEX
              </span>
            </motion.button>
          </div>

          {/* Glass Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step === "signIn" ? "signIn" : "otp"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="glass-card rounded-[26px] p-8"
            >
              {step === "signIn" ? (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-4">
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      AI-Powered Workspace
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                      Welcome to KORTEX
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground/70">
                      Enter your email to get started
                    </p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="email"
                        placeholder="name@example.com"
                        type="email"
                        className="pl-10 h-12 rounded-xl glass border-border/50 bg-white/50 focus:bg-white/80 transition-all duration-200"
                        disabled={isLoading}
                        required
                      />
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 text-sm font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Continue with Email
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>

                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/40" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white/60 px-3 text-muted-foreground rounded-full">
                          Or
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-4 h-12 rounded-xl glass border-border/50 bg-white/50 hover:bg-white/80 text-foreground transition-all duration-200"
                      onClick={handleGuestLogin}
                      disabled={isLoading}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Continue as Guest
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0E9F6E]/10 text-[#0E9F6E] border border-[#0E9F6E]/20 mb-4">
                      <Brain className="w-3 h-3 mr-1.5" />
                      Verify Identity
                    </div>
                    <h1 className="text-xl font-bold text-foreground">
                      Check your email
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground/70">
                      We&apos;ve sent a code to{" "}
                      <span className="text-foreground font-medium">{step.email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleOtpSubmit}>
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />

                    <div className="flex justify-center mb-6">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                            const form = (e.target as HTMLElement).closest("form");
                            if (form) form.requestSubmit();
                          }
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="glass rounded-lg border-border/50 first:rounded-l-lg last:rounded-r-lg"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 text-center mb-4"
                      >
                        {error}
                      </motion.p>
                    )}

                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Didn&apos;t receive a code?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-[#0E9F6E] font-medium"
                        onClick={() => setStep("signIn")}
                      >
                        Try again
                      </Button>
                    </p>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-[#0E9F6E] hover:bg-[#0C8A5F] text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 text-sm font-medium"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify Code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                      className="w-full mt-3 h-10 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      Use different email
                    </Button>
                  </form>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <p className="mt-6 text-xs text-center text-muted-foreground/40">
            Secured by{" "}
            <a
              href="https://freebuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#0E9F6E] transition-colors"
            >
              freebuff.com
            </a>
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
