"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type AuthCardProps = {
  onAuthSuccess?: () => void;
};

export default function AuthCard({ onAuthSuccess }: AuthCardProps) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Account created successfully. You can now log in.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Logged in successfully.");
          onAuthSuccess?.();
        }
      }
    } catch (error: any) {
      setMessage(error?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-black/5 bg-white/80 p-8 shadow-sm">
      <div className="text-[11px] tracking-[0.28em] uppercase opacity-70">
        Account
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[#F3EAE1] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          className={`rounded-2xl px-4 py-2 text-sm transition ${
            mode === "signup"
              ? "bg-[#2C2A29] text-white"
              : "text-[#2C2A29] opacity-70"
          }`}
        >
          Sign up
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("login");
            setMessage("");
          }}
          className={`rounded-2xl px-4 py-2 text-sm transition ${
            mode === "login"
              ? "bg-[#2C2A29] text-white"
              : "text-[#2C2A29] opacity-70"
          }`}
        >
          Log in
        </button>
      </div>

      <h2 className="mt-6 text-2xl font-semibold leading-tight">
        {mode === "signup" ? "Create your Luxelle account" : "Welcome back"}
      </h2>

      <p className="mt-3 text-sm opacity-70">
        {mode === "signup"
          ? "Create an account to start building your private luxury collection."
          : "Log in to access your saved collection."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 outline-none"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[#2C2A29] px-4 py-3 text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "signup"
            ? "Create account"
            : "Log in"}
        </button>
      </form>

      {message && <div className="mt-4 text-sm opacity-80">{message}</div>}
    </div>
  );
}