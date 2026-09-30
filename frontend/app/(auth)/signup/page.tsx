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
    <main className="relative min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-white">
      {/* Left Side: Full-screen Blended Poster Section */}
      <section className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-10 xl:p-16 bg-slate-950 text-white overflow-hidden select-none">
        {/* Poster Image Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/loginposter.png"
            alt="MoneyWise Platform Poster"
            fill
            priority
            className="object-cover object-center transition-transform duration-700 hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
          {/* Subtle multi-layer gradient blending */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/70" />
          <div className="absolute inset-0 bg-indigo-950/20 mix-blend-multiply" />
        </div>

        {/* Top Branding Tag */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/15 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-white">MoneyWise Business Suite</span>
          </div>
        </div>

        {/* Bottom Highlights */}
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="inline-block rounded-lg bg-indigo-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200 backdrop-blur-md border border-indigo-400/30">
            Enterprise Financial Operations
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white drop-shadow-sm leading-tight">
            Monitor your money wisely.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
            Create your account and unlock enterprise multi-firm invoicing, real-time warehouse inventory, automated GST ledger, and analytics in minutes.
          </p>

          <div className="pt-2 flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Instant Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Bank-grade Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Full-screen Form Section */}
      <section className="relative lg:col-span-6 xl:col-span-5 flex flex-col justify-between min-h-screen p-6 sm:p-10 lg:p-12 xl:p-16 bg-white overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <Image
              src="/MoneyWise.png"
              alt="MoneyWise Logo"
              width={150}
              height={100}
              priority
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-full transition-colors"
          >
            Log in
          </Link>
        </div>

        {/* Mobile Poster Banner */}
        <div className="lg:hidden my-6 overflow-hidden rounded-2xl relative h-36 w-full bg-slate-900 shadow-md">
          <Image
            src="/loginposter.png"
            alt="MoneyWise Poster"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">MoneyWise</span>
            <p className="text-sm font-semibold">Monitor your money wisely</p>
          </div>
        </div>

        {/* Form Container (Full screen blend, centered content) */}
        <div className="my-auto w-full max-w-md mx-auto py-6">
          <div className="space-y-1 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {step === "details" ? "Create an account" : "Verify Email OTP"}
            </h1>
            <p className="text-sm text-slate-500">
              {step === "details"
                ? "Start managing your business, invoices & GST ledger"
                : `We sent a 6-digit verification code to ${email}`}
            </p>
          </div>

          {/* Dev OTP Notification Banner */}
          {step === "otp" && devOtp && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-center text-xs font-semibold text-amber-900 shadow-xs">
              <span className="block font-bold text-amber-800">🔑 Demo Verification OTP Code:</span>
              <span className="mt-1 inline-block rounded-lg bg-amber-200/80 px-3 py-1 text-base font-mono font-bold tracking-widest text-amber-950">
                {devOtp}
              </span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-700">
              <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Resend Success Banner */}
          {resendMessage && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-center text-xs font-semibold text-emerald-800">
              ✓ {resendMessage}
            </div>
          )}

          {/* STEP 1: Details Form */}
          {step === "details" && (
            <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Full Name
                </label>
                <div className="relative mt-1.5">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="relative mt-1.5">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="relative mt-1.5">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                <label className="block text-center lg:text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Enter 6-Digit OTP Code
                </label>
                
                <div className="mt-4 flex justify-center lg:justify-start gap-2" onPaste={handlePaste}>
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

          {/* Bottom Switch Link */}
          <div className="pt-6 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-4 decoration-indigo-200">
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Attribution */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>MoneyWise &bull; monitor your money wisely</span>
          <span>a product of <strong className="text-slate-600 font-semibold">The Dynamite Technologies</strong></span>
        </div>
      </section>
    </main>
  );
}
