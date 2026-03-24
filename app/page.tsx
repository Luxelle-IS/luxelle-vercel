"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const featuredPieces = [
  {
    brand: "Chanel",
    model: "Classic Flap",
    note: "Archive, value, provenance",
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    brand: "Louis Vuitton",
    model: "Speedy",
    note: "Luxury collection intelligence",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
  },
  {
    brand: "Hermès",
    model: "Kelly",
    note: "Collector-grade organization",
    image:
      "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?auto=format&fit=crop&w=1200&q=80",
  },
];

const steps = [
  {
    title: "Upload a piece",
    text: "Start with a handbag image and let Luxelle identify the closest match with a refined luxury presentation.",
  },
  {
    title: "Build your archive",
    text: "Save acquisition details, condition, notes, provenance, and wishlist targets in one elegant private space.",
  },
  {
    title: "Track your collection",
    text: "See your collection value, signature pieces, wishlist intent, and personal archive grow over time.",
  },
];

const highlights = [
  "Private luxury archive",
  "AI identification and value guidance",
  "Wishlist and acquisition tracking",
  "Collector-grade details and notes",
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_55%)]" />
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
                  Enter app
                </Link>
                <Link
                  href="/admin"
                  className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
                >
                  Admin
                </Link>
              </div>
            </div>
          </motion.header>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05, duration: 0.45 }}
            >
              <div className="inline-flex items-center rounded-full border border-[#D8C7B8] bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.24em] opacity-70 backdrop-blur">
                Private luxury intelligence
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.03em] md:text-7xl">
                Build the private
                <br />
                archive your bags
                <br />
                deserve.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed opacity-75 md:text-lg">
                Luxelle helps you identify, archive, value, and track the luxury
                pieces you own — and the ones you’re still hunting. Designed for
                collectors, curated for elegance.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/app"
                    className="inline-flex rounded-2xl bg-[#2C2A29] px-6 py-3 text-sm text-white transition hover:opacity-90"
                  >
                    Start your archive
                  </Link>
                </motion.div>

                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <a
                    href="#how-it-works"
                    className="inline-flex rounded-2xl border border-[#D8C7B8] bg-white px-6 py-3 text-sm transition hover:bg-[#F8F3EE]"
                  >
                    See how it works
                  </a>
                </motion.div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-[#E7DDD3] bg-white/75 px-4 py-4 text-sm shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1, duration: 0.45 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-10">
                  <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
                    <img
                      src={featuredPieces[0].image}
                      alt={featuredPieces[0].brand}
                      className="h-[320px] w-full object-cover"
                    />
                    <div className="p-5">
                      <div className="text-lg font-semibold">
                        {featuredPieces[0].brand}
                      </div>
                      <div className="text-sm opacity-70">
                        {featuredPieces[0].model}
                      </div>
                      <div className="mt-3 text-xs uppercase tracking-[0.22em] opacity-55">
                        {featuredPieces[0].note}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-black/5 bg-[#FCF8F4] p-5 shadow-sm">
                    <div className="text-[11px] uppercase tracking-[0.24em] opacity-55">
                      Collection value
                    </div>
                    <div className="mt-3 text-2xl font-semibold">
                      $18,400 – $24,100
                    </div>
                    <div className="mt-2 text-sm opacity-70">
                      Directional archive insight across owned pieces
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
                    <div className="text-[11px] uppercase tracking-[0.24em] opacity-55">
                      Wishlist signal
                    </div>
                    <div className="mt-3 text-xl font-semibold">
                      Three collector targets
                    </div>
                    <div className="mt-2 text-sm opacity-70">
                      Move seamlessly from desire to archive.
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
                    <img
                      src={featuredPieces[1].image}
                      alt={featuredPieces[1].brand}
                      className="h-[240px] w-full object-cover"
                    />
                    <div className="p-5">
                      <div className="text-lg font-semibold">
                        {featuredPieces[1].brand}
                      </div>
                      <div className="text-sm opacity-70">
                        {featuredPieces[1].model}
                      </div>
                      <div className="mt-3 text-xs uppercase tracking-[0.22em] opacity-55">
                        {featuredPieces[1].note}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
                    <img
                      src={featuredPieces[2].image}
                      alt={featuredPieces[2].brand}
                      className="h-[180px] w-full object-cover"
                    />
                    <div className="p-5">
                      <div className="text-lg font-semibold">
                        {featuredPieces[2].brand}
                      </div>
                      <div className="text-sm opacity-70">
                        {featuredPieces[2].model}
                      </div>
                      <div className="mt-3 text-xs uppercase tracking-[0.22em] opacity-55">
                        {featuredPieces[2].note}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-7xl px-5 py-8 md:px-6 md:py-12"
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

      <section className="mx-auto w-full max-w-7xl px-5 py-4 md:px-6 md:py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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
            <p className="mt-5 max-w-xl text-sm leading-relaxed opacity-75 md:text-base">
              Most collectors keep purchase details in scattered notes, screenshots,
              memory, or resale platforms. Luxelle brings identity, valuation,
              provenance, wishlist intent, and archive design into one place that
              actually feels worthy of luxury objects.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Archive pieces you own with clarity and elegance",
                "Keep wishlist targets in a dedicated collector flow",
                "Track acquisition cost, condition, notes, and material details",
                "Create a private luxury dashboard that feels premium enough to share",
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-[22px] border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-4 text-sm"
                >
                  {line}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.06, duration: 0.45 }}
            className="rounded-[36px] border border-black/5 bg-[#2C2A29] p-8 text-white shadow-sm md:p-10"
          >
            <div className="text-[11px] uppercase tracking-[0.35em] text-white/60">
              Share-worthy feeling
            </div>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              Designed for the screenshot,
              <br />
              the story, and the save.
            </h3>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
              Virality comes when users feel elevated. Luxelle is built to make
              collections look curated, personal, intelligent, and luxurious —
              the kind of product people naturally want to show.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["Featured piece", "Create a signature object moment"],
                ["Value summary", "Turn ownership into elegant insight"],
                ["Wishlist flow", "Make desire feel intentional"],
                ["Private archive", "Luxury utility with emotional pull"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-lg font-semibold">{title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-white/70">
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 md:px-6 md:py-12">
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
            Start your archive before
            <br />
            your collection gets bigger.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed opacity-75 md:text-base">
            Luxelle is built for people who care about the objects they own and the
            ones they’re still searching for. Begin with one piece, and let the
            archive grow into something beautiful.
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