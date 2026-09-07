"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setActiveFirmId, getActiveFirmId } from "@/lib/api";

interface FirmSummary {
  _id: string;
  name: string;
  logoUrl?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  pan?: string;
  address?: string;
}

interface FirmMembership {
  firm: FirmSummary;
  role: string;
}

interface UserSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface AuthContextValue {
  user: UserSummary | null;
  firms: FirmMembership[];
  activeFirmId: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ email: string; devOtp?: string }>;
  verifyOtp: (identifier: string, otp: string) => Promise<void>;
  logout: () => void;
  switchFirm: (firmId: string) => void;
  refreshFirms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [firms, setFirms] = useState<FirmMembership[]>([]);
  const [activeFirmId, setActiveFirmIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  async function loadMe() {
    try {
      const data = await api.get<{ user: UserSummary; firms: FirmMembership[] }>("/auth/me");
      setUser(data.user);
      setFirms(data.firms);

      const stored = getActiveFirmId();
      const validStored = stored && data.firms.some((f) => f.firm._id === stored);
      if (validStored) {
        setActiveFirmIdState(stored);
      } else if (data.firms.length > 0) {
        setActiveFirmId(data.firms[0].firm._id);
        setActiveFirmIdState(data.firms[0].firm._id);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("accessToken")) {
      loadMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(identifier: string, password: string) {
    const data = await api.post<{
      user: UserSummary;
      firms: FirmMembership[];
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", { identifier, password });

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    setFirms(data.firms);

    if (data.firms.length > 0) {
      setActiveFirmId(data.firms[0].firm._id);
      setActiveFirmIdState(data.firms[0].firm._id);
      router.push("/dashboard");
    } else {
      router.push("/dashboard/firm-setup");
    }
  }

  async function signup(name: string, email: string, password: string) {
    const data = await api.post<{ message: string; email: string; devOtp?: string }>("/auth/signup", {
      name,
      email,
      password,
    });
    return { email: data.email, devOtp: data.devOtp };
  }

  async function verifyOtp(identifier: string, otp: string) {
    const data = await api.post<{
      user: UserSummary;
      firms?: FirmMembership[];
      accessToken: string;
      refreshToken: string;
    }>("/auth/otp/verify", { identifier, otp });

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    if (data.firms && data.firms.length > 0) {
      setFirms(data.firms);
      setActiveFirmId(data.firms[0].firm._id);
      setActiveFirmIdState(data.firms[0].firm._id);
      router.push("/dashboard");
    } else {
      router.push("/dashboard/firm-setup");
    }
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("activeFirmId");
    setUser(null);
    setFirms([]);
    setActiveFirmIdState(null);
    router.push("/login");
  }

  function switchFirm(firmId: string) {
    setActiveFirmId(firmId);
    setActiveFirmIdState(firmId);
    router.refresh();
  }

  return (
    <AuthContext.Provider
      value={{ user, firms, activeFirmId, isLoading, login, signup, verifyOtp, logout, switchFirm, refreshFirms: loadMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
