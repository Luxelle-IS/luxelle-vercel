"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-5 py-8 md:px-6 md:py-10"
    >
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="mb-8 flex items-center justify-between rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-sm"
        >
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
              Luxelle
            </div>
            <div className="mt-2 text-sm opacity-70">
              Account settings
            </div>
          </div>

          <Link
            href="/app"
            className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
          >
            Back to archive
          </Link>
        </motion.div>

        {/* Account Card */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.05 }}
          className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
        >
          <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
            Account
          </div>

          <div className="mt-6">
            <div className="text-sm opacity-60">Email</div>
            <div className="mt-1 text-lg font-medium">
              {userEmail || "Not signed in"}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={signOut}
              className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
            >
              Log out
            </button>

            <Link
              href="/"
              className="rounded-2xl border border-[#D8C7B8] bg-white px-5 py-3 text-center text-sm transition hover:bg-[#F8F3EE]"
            >
              Go to homepage
            </Link>
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
        >
          <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
            Privacy
          </div>

          <div className="mt-4 space-y-3 text-sm opacity-70">
            <p>• Your collection is private and tied to your account.</p>
            <p>• Images are stored securely in your personal archive.</p>
            <p>• Luxelle does not publicly display your data.</p>
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
}