"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(null);
    setLoading(true);
    try {
      const res = await adminApi.login(email, password);
      if (!res.success || !res.token) {
        setErr("Неверный логин или пароль");
        return;
      }
      localStorage.setItem("admin_token", res.token);
      router.push("/admin");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded p-5 space-y-3">
        <h1 className="text-xl font-semibold">Admin Login</h1>

        {err ? <div className="text-red-600 text-sm">{err}</div> : null}

        <input
          className="border rounded p-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border rounded p-2 w-full"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Вхожу..." : "Войти"}
        </button>
      </div>
    </div>
  );
}
