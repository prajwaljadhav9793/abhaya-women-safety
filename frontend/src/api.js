import { useEffect, useState, useCallback } from "react";

// Robust BASE URL resolver:
// 1. Reads VITE_API_URL from environment
// 2. Strips trailing slashes
// 3. Automatically appends '/api' if host was supplied without it (e.g. https://xyz.onrender.com -> https://xyz.onrender.com/api)
// 4. Defaults to '/api' for local proxy or same-domain hosting
const resolveBaseUrl = () => {
  let envUrl = (import.meta.env.VITE_API_URL || "").trim();
  if (!envUrl) return "/api";
  envUrl = envUrl.replace(/\/+$/, "");
  if (envUrl.startsWith("http") && !envUrl.endsWith("/api")) {
    envUrl += "/api";
  }
  return envUrl;
};

export const BASE = resolveBaseUrl();
export const tok = () => localStorage.getItem("abhaya_token");

async function raw(path, { method = "GET", body, form } = {}) {
  const isPublicAuth = path === "/auth/login" || path === "/auth/register" || path === "/auth/register-officer";
  if (tok() && !isPublicAuth) h.Authorization = "Bearer " + tok();
  if (body) h["Content-Type"] = "application/json";

  const targetUrl = BASE + path;
  try {
    return await fetch(targetUrl, {
      method,
      headers: h,
      body: form || (body ? JSON.stringify(body) : undefined)
    });
  } catch (err) {
    console.error(`Network fetch failed for [${method} ${targetUrl}]:`, err);
    throw new Error(
      `Cannot connect to backend server at "${BASE}". If hosted on Render, the free server may be waking up (takes ~30-50s). Please wait a moment and try again.`
    );
  }
}

export async function api(path, opt) {
  const r = await raw(path, opt);
  if (r.status === 401) {
    localStorage.removeItem("abhaya_token");
    const publicPaths = ["/", "/login", "/register"];
    if (path !== "/auth/me" && typeof window !== "undefined" && !publicPaths.includes(window.location.pathname)) {
      window.location.href = "/login";
    }
  }

  // Read response as text to detect whether backend sent JSON or HTML error/SPA rewrite
  const rawText = await r.text();
  let d = {};
  try {
    d = rawText ? JSON.parse(rawText) : {};
  } catch (e) {
    const isVercelHost = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
    if (r.status === 405 || BASE === "/api" || isVercelHost) {
      throw new Error(
        "Backend API is not connected! Vercel only hosts the frontend. Please deploy the Python backend on Render.com and set VITE_API_URL in Vercel Project Settings."
      );
    }
    if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
      throw new Error(`Server returned HTML (status ${r.status}) instead of JSON. The backend service may still be booting.`);
    }
  }

  if (r.status === 405) {
    throw new Error(
      "Backend API is not connected (405)! Vercel only hosts the frontend. Please deploy the Python backend on Render.com and set VITE_API_URL in Vercel Project Settings."
    );
  }

  if (!r.ok) {
    const errorMsg = d.error || d.message || `Request failed (${r.status})`;
    throw Object.assign(new Error(errorMsg), { fields: d.fields, data: d, status: r.status });
  }
  return d;
}
export async function download(path, name) {
  const r = await raw(path); if (!r.ok) throw new Error("Download failed");
  const u = URL.createObjectURL(await r.blob()); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}
export function useLoad(path, deps = []) {
  const [data, setData] = useState(null), [err, setErr] = useState(""), [loading, setL] = useState(true);
  const load = useCallback(() => { setL(true); api(path).then(d => { setData(d); setErr(""); }).catch(e => setErr(e.message)).finally(() => setL(false)); }, [path, ...deps]);
  useEffect(load, [load]); return { data, err, loading, reload: load };
}
