import axios from "axios";

// Environment variable configured API URL (no hardcoded URLs)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function getActiveFirmId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("activeFirmId");
}

export function setActiveFirmId(firmId: string) {
  localStorage.setItem("activeFirmId", firmId);
}

// Axios Instance configured with environment base URL and headers
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach bearer token & x-firm-id header dynamically
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    const firmId = getActiveFirmId();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (firmId && config.headers) {
      config.headers["x-firm-id"] = firmId;
    }
  }
  return config;
});

// Response Interceptor: Format error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "An API error occurred";
    return Promise.reject(new Error(message));
  }
);

// High-level API helper keeping backward compatibility across all components
export const api = {
  get: async <T>(path: string, config?: any): Promise<T> => {
    const res = await apiClient.get<T>(path, config);
    return res.data;
  },
  post: async <T>(path: string, body?: unknown, config?: any): Promise<T> => {
    const res = await apiClient.post<T>(path, body, config);
    return res.data;
  },
  put: async <T>(path: string, body?: unknown, config?: any): Promise<T> => {
    const res = await apiClient.put<T>(path, body, config);
    return res.data;
  },
  patch: async <T>(path: string, body?: unknown, config?: any): Promise<T> => {
    const res = await apiClient.patch<T>(path, body, config);
    return res.data;
  },
  delete: async <T>(path: string, config?: any): Promise<T> => {
    const res = await apiClient.delete<T>(path, config);
    return res.data;
  },
  // Binary File Downloads (PDFs/CSV) using Axios blob stream
  async downloadFile(path: string, filename: string): Promise<void> {
    const res = await apiClient.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
