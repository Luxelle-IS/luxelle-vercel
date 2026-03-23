"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";

type AdminStats = {
  totalUsers: number;
  totalArchivePieces: number;
  totalWishlistItems: number;
  topBrands: { brand: string; count: number }[];
  savesPerDay: { date: string; count: number }[];
  recentActivity: {
    type: "bag" | "wishlist";
    date: string;
    brand: string;
    model: string;
  }[];
};

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

function SavesChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (!data.length) {
    return (
      <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6 text-sm opacity-70">
        No archive activity yet.
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = 18;
  const max = Math.max(...data.map((d) => d.count), 1);

  const path = data
    .map((point, index) => {
      const x =
        padding +
        (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
      const y =
        height -
        padding -
        (point.count / max) * (height - padding * 2);

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="adminArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#D9C8B8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#D9C8B8" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#adminArea)" />
        <path
          d={path}
          fill="none"
          stroke="#2C2A29"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => {
          const x =
            padding +
            (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
          const y =
            height -
            padding -
            (point.count / max) * (height - padding * 2);

          return <circle key={index} cx={x} cy={y} r="4" fill="#2C2A29" />;
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs opacity-55">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  const founderEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL || "";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email ?? null;
      setUserEmail(email);

      const allowed = !!email && !!founderEmail && email === founderEmail;
      setAuthorized(allowed);

      if (!allowed) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Could not load admin stats.");
          setLoading(false);
          return;
        }

        setStats(data);
      } catch (err: any) {
        setError(err?.message || "Could not load admin stats.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [founderEmail]);

  const totalTracked = useMemo(() => {
    if (!stats) return 0;
    return stats.totalArchivePieces + stats.totalWishlistItems;
  }, [stats]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] px-5 py-8 text-[#2C2A29] md:px-6 md:py-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="mb-8 rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
                Luxelle Admin
              </div>
              <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
                Founder dashboard
              </h1>
              <div className="mt-3 text-sm opacity-70">
                {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/app"
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
              >
                Back to app
              </Link>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            Loading admin dashboard...
          </div>
        ) : !authorized ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            <div className="text-lg font-semibold">Access restricted</div>
            <div className="mt-2 text-sm opacity-70">
              This page is only available to the founder account.
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            <div className="text-red-700">{error}</div>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Total users", String(stats.totalUsers)],
                  ["Archive pieces", String(stats.totalArchivePieces)],
                  ["Wishlist items", String(stats.totalWishlistItems)],
                  ["Total tracked", String(totalTracked)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5"
                  >
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                      {label}
                    </div>
                    <div className="mt-3 text-2xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
                Archive saves per day
              </div>
              <SavesChart data={stats.savesPerDay} />
            </motion.section>

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.11 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
                Top brands
              </div>

              {stats.topBrands.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6 text-sm opacity-70">
                  No brand data yet.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {stats.topBrands.map((item) => (
                    <div
                      key={item.brand}
                      className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5"
                    >
                      <div className="text-lg font-semibold">{item.brand}</div>
                      <div className="mt-2 text-sm opacity-70">
                        {item.count} saved piece{item.count === 1 ? "" : "s"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.14 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-[0.32em] opacity-60">
                Recent activity
              </div>

              {!stats.recentActivity.length ? (
                <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6 text-sm opacity-70">
                  No activity yet.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {stats.recentActivity.map((item, i) => (
                    <div
                      key={`${item.type}-${item.date}-${item.brand}-${item.model}-${i}`}
                      className="flex items-center justify-between rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3"
                    >
                      <div className="text-sm">
                        <span className="font-medium">
                          {item.type === "bag" ? "Saved bag" : "Wishlist item"}
                        </span>{" "}
                        — {item.brand} {item.model}
                      </div>

                      <div className="text-xs opacity-60">
                        {formatDate(item.date)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>
        ) : null}
      </div>
    </motion.main>
  );
}