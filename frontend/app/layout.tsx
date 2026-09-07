import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MoneyWise — Monitor your money wisely",
  description: "MoneyWise: Modern multi-firm billing, inventory, and GST compliance. A product of The Dynamite Technologies.",
  icons: {
    icon: "/MoneyWise.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50/70 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
