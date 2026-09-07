"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function SignupPage() {
  const { signup, verifyOtp } = useAuth();

  // Step state: "details" | "otp"
  const [step, setStep] = useState<"details" | "otp">("details");

  // Step 1: Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle Resend Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Handle Step 1: Account details submission
  async function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await signup(name, email, password);
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep("otp");
      setResendTimer(30);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Step 2: OTP submission
  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      setError("Please enter the full 6-digit OTP code");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyOtp(email, fullOtp);
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Resend OTP
  async function handleResendOtp() {
    if (!canResend) return;
    setError(null);
    setResendMessage(null);
    try {
      const res = await api.post<{ message: string; devOtp?: string }>("/auth/otp/request", {
        identifier: email,
      });
      if (res.devOtp) setDevOtp(res.devOtp);
      setResendMessage("New 6-digit OTP code sent to your email!");
      setResendTimer(30);
      setCanResend(false);
      setTimeout(() => setResendMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Could not resend OTP");
    }
  }

  // Handle OTP Digit Input navigation
  function handleDigitChange(idx: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split("");
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-slate-50/80 px-4 py-12 sm:px-6 lg:px-8">
      {/* Ambient background glow accents */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-purple-500/15 blur-[128px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-[128px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[140px]" />

      {/* Main Light Glassmorphism Card */}
      <div className="relative w-full max-w-md space-y-8 rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl transition-all sm:p-10">
        
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <Image
              src="/MoneyWise.png"
              alt="MoneyWise — monitor your money wisely"
              width={200}
              height={133}
              priority
              className="h-24 w-auto object-contain drop-shadow-sm rounded-xl"
            />
          </Link>
          
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {step === "details" ? "Create an account" : "Verify Email OTP"}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Monitor your money wisely
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {step === "details"
              ? "Start managing your business, invoices & GST ledger"
              : `We sent a 6-digit verification code to ${email}`}
          </p>
        </div>

        {/* Dev OTP Notification Banner (for local testing convenience) */}
        {step === "otp" && devOtp && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-center text-xs font-semibold text-amber-900 shadow-xs">
            <span className="block font-bold text-amber-800">🔑 Demo Verification OTP Code:</span>
            <span className="mt-1 inline-block rounded-lg bg-amber-200/80 px-3 py-1 text-base font-mono font-bold tracking-widest text-amber-950">
              {devOtp}
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-700">
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Resend Success Banner */}
        {resendMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-center text-xs font-semibold text-emerald-800">
            ✓ {resendMessage}
          </div>
        )}

        {/* STEP 1: Details Form */}
        {step === "details" && (
          <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Full Name
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.007 10.007 0 014.122-.963c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-xl bg-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.99] disabled:opacity-60 mt-6"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending OTP code…</span>
                </span>
              ) : (
                <span>Continue to OTP Verification →</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="mt-6 space-y-6">
            <div>
              <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                Enter 6-Digit OTP Code
              </label>
              
              <div className="mt-4 flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="h-12 w-11 rounded-xl border border-slate-200 bg-slate-50/80 text-center text-xl font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                ))}
              </div>
            </div>

            {/* Actions: Resend Timer & Edit Email */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-slate-500 hover:text-slate-800 transition-colors font-medium"
              >
                ← Change Email
              </button>

              <button
                type="button"
                disabled={!canResend}
                onClick={handleResendOtp}
                className="font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {canResend ? "Resend OTP Code" : `Resend in ${resendTimer}s`}
              </button>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isSubmitting || otp.join("").length < 6}
              className="group relative flex w-full justify-center rounded-xl bg-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying OTP…</span>
                </span>
              ) : (
                <span>Verify OTP &amp; Create Account</span>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="space-y-4 pt-2 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-4 decoration-indigo-200">
              Log in
            </Link>
          </p>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-medium text-slate-400">
              a product of <span className="font-semibold text-slate-600">The Dynamite Technologies</span>
            </p>
          </div>
        </div>
      </div>

      {/* Page bottom attribution */}
      <footer className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
        <p className="text-[11px] text-slate-400 font-medium">
          MoneyWise &bull; monitor your money wisely &bull; a product of <span className="text-slate-600 font-semibold">The Dynamite Technologies</span>
        </p>
      </footer>
    </main>
  );
}
