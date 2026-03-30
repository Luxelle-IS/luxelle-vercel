"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const steps = [
  {
    title: "Upload a piece",
    text: "Start with an image and let Luxelle identify the closest match.",
  },
  {
    title: "Save the record",
    text: "Keep acquisition, provenance, condition, and archive details in one place.",
  },
  {
    title: "Build the archive",
    text: "Track what you own and what you still want with more clarity over time.",
  },
];

const highlights = [
  "Private archive for luxury collections",
  "Acquisition, provenance, and wishlist tracking",
];

const reasons = [
  "A calmer alternative to scattered notes, screenshots, and resale tabs",
  "One private place for ownership, provenance, acquisition, and wishlist intent",
  "A collector experience designed to feel worthy of luxury objects",
];

export default function HomePage() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#F6F1EB] text-[#2C2A29]"
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),transparent_55%)]" />

        <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-6 md:py-8">
          <motion.header
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.45 }}
            className="rounded-[32px] border border-black/5 bg-white/70 px-5 py-4 shadow-sm backdrop-blur md:px-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] opacity-60">
                  Luxelle
                </div>
                <div className="mt-1 text-sm opacity-65">
                  The private archive for luxury bags
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/app"
                  className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
                >
                  Open archive
                </Link>
              </div>
            </div>
          </motion.header>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05, duration: 0.45 }}
            >
              <div className="inline-flex items-center rounded-full border border-[#D8C7B8] bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.24em] opacity-70 backdrop-blur">
                Private luxury archive
              </div>

         <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] md:text-7xl">
  A private record
  <br />
  of your luxury
  <br />
  pieces.
</h1>

       <p className="mt-6 max-w-2xl text-base leading-relaxed opacity-75 md:text-lg">
  Acquisition, provenance, and ownership — kept in one private place.
</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/app"
                    className="inline-flex rounded-2xl bg-[#2C2A29] px-6 py-3 text-sm text-white transition hover:opacity-90"
                  >
                    Add your first piece
                  </Link>
                </motion.div>

                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <a
                    href="#how-it-works"
                    className="inline-flex rounded-2xl border border-[#D8C7B8] bg-white px-6 py-3 text-sm transition hover:bg-[#F8F3EE]"
                  >
                    Learn more
                  </a>
                </motion.div>
              </div>


            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1, duration: 0.45 }}
              className="relative"
            >
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-sm">
                  <div className="border-b border-[#EEE4D9] px-6 py-4">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-[#8B7E72]">
                      Real Luxelle view
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      Collector record
                    </div>
                  </div>

           <img
  src="/luxelle-preview.jpg"
  alt="Luxelle product preview"
  className="w-full object-contain bg-[#F7F1EA]"
/>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-[#FCF8F4] p-5 shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.24em] opacity-55">
                    Built for private collectors
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    A quieter way to keep the record.
                  </div>
                  <div className="mt-2 text-sm leading-relaxed opacity-70">
                    Luxelle brings ownership, acquisition, provenance, and
                    wishlist intent into one considered luxury archive.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-7xl px-5 py-10 md:px-6 md:py-14"
      >
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="rounded-[36px] border border-black/5 bg-white/80 p-8 shadow-sm md:p-10"
        >
          <div className="text-[11px] uppercase tracking-[0.35em] opacity-60">
            How it works
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            A collector experience,
            <br />
            not a spreadsheet.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                className="rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6"
              >
                <div className="text-[11px] uppercase tracking-[0.24em] opacity-55">
                  0{index + 1}
                </div>
                <div className="mt-4 text-xl font-semibold">{step.title}</div>
                <div className="mt-3 text-sm leading-relaxed opacity-75">
                  {step.text}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-2 md:px-6 md:py-4">
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="rounded-[36px] border border-black/5 bg-white/80 p-8 shadow-sm md:p-10"
        >
          <div className="text-[11px] uppercase tracking-[0.35em] opacity-60">
            Why Luxelle
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            Luxury ownership,
            <br />
            finally organized beautifully.
          </h3>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed opacity-75 md:text-base">
            Most collections live across memory, screenshots, receipts, notes,
            and resale tabs. Luxelle brings those details into one private place
            with more clarity and a more considered visual language.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5 text-sm leading-relaxed"
              >
                {reason}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 md:px-6 md:py-14">
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="rounded-[40px] border border-black/5 bg-white/80 p-8 text-center shadow-sm md:p-12"
        >
          <div className="text-[11px] uppercase tracking-[0.35em] opacity-60">
            Start now
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Begin your archive before
            <br />
            your collection gets bigger.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed opacity-75 md:text-base">
            Begin with one piece and build a private record that feels worthy of
            the objects you own.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/app"
                className="inline-flex rounded-2xl bg-[#2C2A29] px-6 py-3 text-sm text-white transition hover:opacity-90"
              >
                Enter Luxelle
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <a
                href="#how-it-works"
                className="inline-flex rounded-2xl border border-[#D8C7B8] bg-white px-6 py-3 text-sm transition hover:bg-[#F8F3EE]"
              >
                Learn more
              </a>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
}