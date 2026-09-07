import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50/20 px-6 py-8">
      {/* Background ambient glow accents */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-indigo-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-10 -right-20 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-80 w-80 rounded-full bg-purple-500/10 blur-[120px]" />

      {/* Top Simple Nav */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/MoneyWise.png"
            alt="MoneyWise Logo"
            width={160}
            height={107}
            priority
            className="h-12 w-auto object-contain drop-shadow-xs"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:scale-[1.02]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-12">
        <div className="max-w-2xl flex flex-col items-center">
          {/* Main Logo Showcase */}
          <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-md transition-all hover:shadow-2xl hover:scale-[1.01]">
            <Image
              src="/MoneyWise.png"
              alt="MoneyWise — monitor your money wisely"
              width={260}
              height={173}
              priority
              className="h-32 sm:h-36 w-auto object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-xs mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span>Smart Cloud Accounting &amp; GST Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            MoneyWise
          </h1>

          <p className="mt-2 text-lg sm:text-xl font-semibold text-indigo-600 tracking-wide">
            monitor your money wisely
          </p>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed">
            Manage sales, purchases, stock inventory, and multi-firm GST compliance with speed and precision.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.99]"
            >
              Create your account &rarr;
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs backdrop-blur-sm transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              Log in to Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 border-t border-slate-200/60 pt-6 pb-2 text-center">
        <p className="text-xs text-slate-500 font-medium">
          MoneyWise &bull; monitor your money wisely
        </p>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          a product of <span className="font-semibold text-slate-700">The Dynamite Technologies</span>
        </p>
      </footer>
    </div>
  );
}
