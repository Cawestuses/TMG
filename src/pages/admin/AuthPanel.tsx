import React, { useState } from "react";
import { GlowCard } from "@/src/components/GlowCard";
import { LogIn } from "lucide-react";

export function AuthPanel({ onAuth }: { onAuth: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem("admin_token", data.token);
        onAuth(data.token);
      } else {
        setError(data.error || "Ошибка авторизации");
      }
    } catch (err: any) {
      setError("Ошибка соединения с сервером");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <GlowCard className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Админ-панель</h1>
          <p className="text-gray-400">Авторизуйтесь для управления контентом</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Логин</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full bg-primary hover:brightness-110 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
          >
            <LogIn className="w-5 h-5" />
            Войти
          </button>
        </form>
      </GlowCard>
    </div>
  );
}
