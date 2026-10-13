import { useEffect, useState, useCallback } from "react";
export const BASE = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== "" ? import.meta.env.VITE_API_URL : "/api";
export const tok = () => localStorage.getItem("abhaya_token");
async function raw(path, { method = "GET", body, form } = {}) {
  const h = {}; if (tok()) h.Authorization = "Bearer " + tok(); if (body) h["Content-Type"] = "application/json";
  try { return await fetch(BASE + path, { method, headers: h, body: form || (body ? JSON.stringify(body) : undefined) }); }
  catch (err) {
    console.error("Network / API fetch error:", err);
    throw new Error("Cannot reach the server. Check your connection.");
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
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || "Request failed"), { fields: d.fields, data: d });
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
