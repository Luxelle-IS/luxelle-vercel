"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type SavedBag = {
  id: number;
  brand: string;
  model: string;
  confidence: string;
  estimated_low: number;
  estimated_high: number;
  image_url: string;
  created_at: string;
  user_id: string | null;
  purchase_price: number | null;
  purchase_price_currency: string | null;
  purchase_date: string | null;
  condition: string | null;
  notes: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  provenance_notes: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoneyWithCurrency(value: number, currency?: string | null) {
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${value}`;
  }
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatConfidence(confidence: string) {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Moderate confidence";
  return "Low confidence";
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function BagDetailPage() {
  const params = useParams();
  const bagId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [bag, setBag] = useState<SavedBag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePriceCurrency, setPurchasePriceCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [provenanceNotes, setProvenanceNotes] = useState("");
  const [message, setMessage] = useState("");

  async function loadBag() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);

    if (!user) {
      setError("You must be signed in to view this piece.");
      setLoading(false);
      return;
    }

    if (!bagId) {
      setError("This piece could not be found.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("bags")
      .select("*")
      .eq("id", Number(bagId))
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      setError("This piece could not be found.");
      setLoading(false);
      return;
    }

    setBag(data);
    setPurchasePrice(
      data.purchase_price !== null ? String(data.purchase_price) : ""
    );
    setPurchasePriceCurrency(data.purchase_price_currency || "USD");
    setPurchaseDate(data.purchase_date || "");
    setCondition(data.condition || "Excellent");
    setNotes(data.notes || "");
    setColor(data.color || "");
    setMaterial(data.material || "");
    setSize(data.size || "");
    setProvenanceNotes(data.provenance_notes || "");
    setLoading(false);
  }

  useEffect(() => {
    loadBag();
  }, [bagId]);

  async function saveChanges() {
    if (!bag) return;

    setMessage("");

    const { error } = await supabase
      .from("bags")
      .update({
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        purchase_price_currency: purchasePriceCurrency || "USD",
        purchase_date: purchaseDate || null,
        condition,
        notes: notes.trim() || null,
        color: color.trim() || null,
        material: material.trim() || null,
        size: size.trim() || null,
        provenance_notes: provenanceNotes.trim() || null,
      })
      .eq("id", bag.id);

    if (error) {
      setMessage("Changes could not be saved.");
      return;
    }

    setMessage("Details updated.");
    setEditing(false);
    await loadBag();
  }

  async function deleteBag() {
    if (!bag) return;

    const confirmed = window.confirm("Remove this piece from your archive?");
    if (!confirmed) return;

    const { error } = await supabase.from("bags").delete().eq("id", bag.id);

    if (error) {
      setMessage("This piece could not be removed.");
      return;
    }

    window.location.href = "/app";
  }

  const gainLow =
    bag && bag.purchase_price !== null
      ? bag.estimated_low - bag.purchase_price
      : null;

  const gainHigh =
    bag && bag.purchase_price !== null
      ? bag.estimated_high - bag.purchase_price
      : null;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-5 py-8 md:px-6 md:py-10"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.45 }}
          className="mb-8 flex items-center justify-between rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-sm"
        >
          <div>
            <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
              Luxelle
            </div>
            <div className="mt-2 text-sm opacity-70">
              {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
            </div>
          </div>

          <Link
            href="/app"
            className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
          >
            Back to dashboard
          </Link>
        </motion.div>

        {loading ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            Loading piece...
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            <div className="text-red-700">{error}</div>
          </div>
        ) : bag ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05, duration: 0.45 }}
              className="overflow-hidden rounded-[32px] border border-black/5 bg-white/80 shadow-sm"
            >
              <img
                src={bag.image_url}
                alt={`${bag.brand} ${bag.model}`}
                className="h-full min-h-[420px] w-full object-cover"
              />
            </motion.section>

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08, duration: 0.45 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Piece Details
              </div>

              <h1 className="mt-4 text-3xl font-semibold leading-tight">
                {bag.brand}
              </h1>
              <div className="mt-1 text-xl opacity-75">{bag.model}</div>

              <div className="mt-6 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                {bag.condition || "Excellent"}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Estimated value
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {formatCurrency(bag.estimated_low)} –{" "}
                    {formatCurrency(bag.estimated_high)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Confidence
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {formatConfidence(bag.confidence)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Acquisition cost
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {bag.purchase_price !== null
                      ? formatMoneyWithCurrency(
                          bag.purchase_price,
                          bag.purchase_price_currency
                        )
                      : "Not added"}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Added to archive
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {formatDate(bag.created_at)}
                  </div>
                </div>

                {bag.purchase_date && (
                  <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                      Purchase date
                    </div>
                    <div className="mt-3 text-lg font-semibold">
                      {formatDate(bag.purchase_date)}
                    </div>
                  </div>
                )}

                {(bag.color || bag.material || bag.size) && (
                  <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                      Archive details
                    </div>
                    <div className="mt-3 text-sm leading-relaxed opacity-80">
                      {bag.color && <div>Color: {bag.color}</div>}
                      {bag.material && <div>Material: {bag.material}</div>}
                      {bag.size && <div>Size: {bag.size}</div>}
                    </div>
                  </div>
                )}
              </div>

              {bag.purchase_price !== null && (
                <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Performance potential
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {formatCurrency(gainLow ?? 0)} –{" "}
                    {formatCurrency(gainHigh ?? 0)}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                  Personal notes
                </div>
                <div className="mt-3 text-sm opacity-75">
                  {bag.notes || "No notes have been added yet."}
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                  Provenance / receipt notes
                </div>
                <div className="mt-3 text-sm opacity-75">
                  {bag.provenance_notes || "No provenance notes have been added yet."}
                </div>
              </div>

              <div className="mt-6">
                {!editing ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEditing(true)}
                      className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-white transition hover:opacity-90"
                    >
                      Edit details
                    </motion.button>

                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={deleteBag}
                      className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 transition hover:bg-[#F8F3EE]"
                    >
                      Remove piece
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                      Edit details
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <input
                        type="number"
                        placeholder="Acquisition cost"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />

                      <select
                        value={purchasePriceCurrency}
                        onChange={(e) => setPurchasePriceCurrency(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CHF">CHF</option>
                        <option value="AED">AED</option>
                      </select>

                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />

                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      >
                        <option>Excellent</option>
                        <option>Very good</option>
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Collector piece</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Material"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Size"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none sm:col-span-2"
                      />
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Personal notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                    />

                    <textarea
                      rows={3}
                      placeholder="Provenance / receipt notes"
                      value={provenanceNotes}
                      onChange={(e) => setProvenanceNotes(e.target.value)}
                      className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                    />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={saveChanges}
                        className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-white"
                      >
                        Save changes
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setEditing(false);
                          setPurchasePrice(
                            bag.purchase_price !== null ? String(bag.purchase_price) : ""
                          );
                          setPurchasePriceCurrency(bag.purchase_price_currency || "USD");
                          setPurchaseDate(bag.purchase_date || "");
                          setCondition(bag.condition || "Excellent");
                          setNotes(bag.notes || "");
                          setColor(bag.color || "");
                          setMaterial(bag.material || "");
                          setSize(bag.size || "");
                          setProvenanceNotes(bag.provenance_notes || "");
                          setMessage("");
                        }}
                        className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                )}

                {message && <div className="mt-3 text-sm opacity-75">{message}</div>}
              </div>
            </motion.section>
          </div>
        ) : null}
      </div>
    </motion.main>
  );
}