"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] text-[#2C2A29]"
    >
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <motion.header
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.45 }}
          className="rounded-[32px] border border-black/5 bg-white/80 px-6 py-5 shadow-sm backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
                Luxelle
              </div>
              <div className="mt-2 text-sm opacity-70">
                Private luxury archive
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {userEmail ? (
                <>
                  <Link
                    href="/settings"
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/app"
                    className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
                  >
                    Enter your archive
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/app"
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
                  >
                    Sign in
                  </Link>
                  <a
                    href="https://tally.so/r/ODPO7Y"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
                  >
                    Join the waitlist
                  </a>
                </>
              )}
            </div>
          </div>
        </motion.header>

        <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05, duration: 0.45 }}
            className="rounded-[36px] border border-black/5 bg-white/80 p-8 shadow-sm"
          >
            <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
              Private by design
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-6xl">
              A private archive
              <br />
              for your most
              <br />
              important pieces.
            </h1>

            <p className="mt-6 max-w-xl text-[16px] leading-relaxed opacity-75">
              Luxelle helps you identify, organize, and track the value of your
              luxury handbags in one refined private archive.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {userEmail ? (
                <>
                  <Link
                    href="/app"
                    className="rounded-2xl bg-[#2C2A29] px-6 py-3 text-sm text-white transition hover:opacity-90"
                  >
                    Open dashboard
                  </Link>
                  <Link
                    href="/settings"
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-6 py-3 text-sm transition hover:bg-white"
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/app"
                    className="rounded-2xl bg-[#2C2A29] px-6 py-3 text-sm text-white transition hover:opacity-90"
                  >
                    Start your archive
                  </Link>
                  <a
                    href="https://tally.so/r/ODPO7Y"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-6 py-3 text-sm transition hover:bg-white"
                  >
                    Join waitlist
                  </a>
                </>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                  Identify
                </div>
                <div className="mt-3 text-sm leading-relaxed opacity-75">
                  Upload a photo and receive a suggested brand and model match.
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                  Organize
                </div>
                <div className="mt-3 text-sm leading-relaxed opacity-75">
                  Build a private collection with notes, condition, and history.
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                  Track
                </div>
                <div className="mt-3 text-sm leading-relaxed opacity-75">
                  View directional value ranges and collection performance over time.
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1, duration: 0.45 }}
            className="overflow-hidden rounded-[36px] border border-black/5 bg-white/80 shadow-sm"
          >
            <div className="grid h-full grid-rows-[1.1fr_0.9fr]">
              <div className="relative min-h-[360px] bg-[#EDE3D8]">
                <img
                  src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80"
                  alt="Luxury handbag editorial"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
              </div>

              <div className="p-8">
                <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
                  Why Luxelle
                </div>
                <div className="mt-4 text-2xl font-semibold leading-snug">
                  A more elegant way to manage a luxury collection.
                </div>
                <p className="mt-4 text-sm leading-relaxed opacity-75">
                  Built for collectors who want privacy, clarity, and a more
                  refined view of the pieces they own and love.
                </p>

                <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Private archive
                  </div>
                  <div className="mt-2 text-sm opacity-75">
                    Your collection is visible only to your account.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.15, duration: 0.45 }}
          className="mt-8 rounded-[36px] border border-black/5 bg-white/80 p-8 shadow-sm"
        >
          <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
            How it works
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
              <div className="text-sm font-semibold">1. Upload a piece</div>
              <div className="mt-3 text-sm leading-relaxed opacity-75">
                Add a handbag image to begin identification and archive creation.
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
              <div className="text-sm font-semibold">2. Review the match</div>
              <div className="mt-3 text-sm leading-relaxed opacity-75">
                Luxelle suggests a likely match and a directional value range.
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
              <div className="text-sm font-semibold">3. Build your archive</div>
              <div className="mt-3 text-sm leading-relaxed opacity-75">
                Save condition, notes, acquisition cost, and follow your collection over time.
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </motion.main>
  );
}