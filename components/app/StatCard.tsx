"use client";

import { motion } from "framer-motion";

type StatCardProps = {
  label: string;
  value: string;
  subtext?: string;
};

export default function StatCard({
  label,
  value,
  subtext,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="rounded-[26px] border border-[#E7DDD3] bg-[#FCF8F4] p-5"
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
        {label}
      </div>

      <div className="mt-3 text-2xl font-semibold leading-snug">
        {value}
      </div>

      {subtext && (
        <div className="mt-2 text-sm text-[#6E645B]">
          {subtext}
        </div>
      )}
    </motion.div>
  );
}