"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
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
  description?: string | null;
  reasoning?: string | null;
  confidence_reason?: string | null;
};

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.24em] text-[#8B7E72]">
      {children}
    </div>
  );
}

function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[34px] border border-black/5 bg-white/80 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function InfoCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-3 text-lg font-semibold leading-snug">{value}</div>
      {subtext ? (
        <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
          {subtext}
        </div>
      ) : null}
    </div>
  );
}

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
        {children}
      </div>
    </div>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function BagDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  function hydrateEditFields(data: SavedBag) {
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
  }

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

    setBag(data as SavedBag);
    hydrateEditFields(data as SavedBag);
    setLoading(false);
  }

  useEffect(() => {
    loadBag();
  }, [bagId]);

  async function saveChanges() {
    if (!bag) return;

    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please log out and back in before saving.");
      console.error("Auth error:", userError);
      return;
    }

    const updatePayload = {
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      purchase_price_currency: purchasePriceCurrency || "USD",
      purchase_date: purchaseDate || null,
      condition,
      notes: notes.trim() || null,
      color: color.trim() || null,
      material: material.trim() || null,
      size: size.trim() || null,
      provenance_notes: provenanceNotes.trim() || null,
    };

    const { data, error } = await supabase
      .from("bags")
      .update(updatePayload)
      .eq("id", bag.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Save error:", error);
      setMessage(`Changes could not be saved: ${error.message}`);
      return;
    }

    if (!data) {
      setMessage("Changes were sent, but no updated record was returned.");
      return;
    }

    setBag(data as SavedBag);
    hydrateEditFields(data as SavedBag);
    setEditing(false);
    setMessage("Archive details updated.");
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

    router.push("/app");
  }

  function handleExportPiece() {
    window.print();
  }

  const acquisitionValue = useMemo(() => {
    if (!bag || bag.purchase_price === null) return "Not added";
    return formatMoneyWithCurrency(
      bag.purchase_price,
      bag.purchase_price_currency
    );
  }, [bag]);

  const archiveDetails = useMemo(() => {
    if (!bag) return [];
    return [
      bag.color ? `Color: ${bag.color}` : null,
      bag.material ? `Material: ${bag.material}` : null,
      bag.size ? `Size: ${bag.size}` : null,
    ].filter(Boolean) as string[];
  }, [bag]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] px-5 py-8 text-[#2C2A29] md:px-6 md:py-10 print:bg-white print:px-0 print:py-0"
    >
      <div className="mx-auto w-full max-w-7xl print:max-w-none">
        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.45 }}
          className="mb-8 overflow-hidden rounded-[38px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.90)_0%,rgba(250,245,239,0.92)_100%)] shadow-sm print:hidden"
        >
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div className="max-w-3xl">
              <div className="text-[11px] uppercase tracking-[0.35em] text-[#8B7E72]">
                Luxelle Archive
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-5xl">
                A private record
                <br />
                of a single piece.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6E645B] md:text-base">
                Review acquisition, archive detail, provenance, and directional
                value in one refined collector view.
              </p>
              <div className="mt-5 text-sm text-[#7A6F65]">
                {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportPiece}
                className="rounded-2xl border border-[#D8C7B8] bg-white px-5 py-3 text-sm transition hover:bg-[#F8F3EE]"
              >
                Export / Print piece
              </button>

              <Link
                href="/app"
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <AppCard className="p-8">
            <div className="text-sm text-[#6E645B]">Loading piece...</div>
          </AppCard>
        ) : error ? (
          <AppCard className="p-8">
            <div className="text-sm text-red-700">{error}</div>
          </AppCard>
        ) : bag ? (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.02fr_0.98fr]">
            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05, duration: 0.45 }}
              className="space-y-8"
            >
              <AppCard className="overflow-hidden">
                <div className="bg-[linear-gradient(180deg,#F7F1EA_0%,#EFE4D7_100%)]">
                  <img
                    src={bag.image_url}
                    alt={`${bag.brand} ${bag.model}`}
                    className="h-[560px] w-full object-contain p-8 md:p-10"
                  />
                </div>
              </AppCard>

              {(bag.description || bag.reasoning || bag.confidence_reason) && (
                <AppCard className="p-8">
                  <FieldLabel>AI archive notes</FieldLabel>

                  {bag.description && (
                    <div className="mt-5">
                      <FieldLabel>Editorial description</FieldLabel>
                      <p className="mt-3 text-sm leading-8 text-[#6E645B]">
                        {bag.description}
                      </p>
                    </div>
                  )}

                  {bag.reasoning && (
                    <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <FieldLabel>Identification notes</FieldLabel>
                      <p className="mt-3 text-sm leading-7 text-[#6E645B]">
                        {bag.reasoning}
                      </p>
                    </div>
                  )}

                  {bag.confidence_reason && (
                    <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <FieldLabel>Confidence context</FieldLabel>
                      <p className="mt-3 text-sm leading-7 text-[#6E645B]">
                        {bag.confidence_reason}
                      </p>
                    </div>
                  )}
                </AppCard>
              )}

              <AppCard className="p-8">
                <FieldLabel>Collector record</FieldLabel>
                <div className="mt-4 space-y-4">
                  <DetailBlock label="Personal notes">
                    {bag.notes || "No personal notes added yet."}
                  </DetailBlock>

                  <DetailBlock label="Provenance / receipt notes">
                    {bag.provenance_notes || "No provenance notes added yet."}
                  </DetailBlock>
                </div>
              </AppCard>
            </motion.section>

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08, duration: 0.45 }}
              className="rounded-[34px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-[0.32em] text-[#8B7E72]">
                Piece details
              </div>

              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.03em]">
                {bag.brand}
              </h2>
              <div className="mt-2 text-xl text-[#6E645B]">{bag.model}</div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                  {bag.condition || "Excellent"}
                </div>
                <div className="rounded-full border border-[#E7DDD3] bg-white px-3 py-1 text-xs uppercase tracking-wide">
                  {formatConfidence(bag.confidence)}
                </div>
              </div>

              <div className="mt-8">
                <FieldLabel>Acquisition cost</FieldLabel>
                <div className="mt-3 text-3xl font-semibold leading-tight">
                  {acquisitionValue}
                </div>
                <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
                  Your recorded purchase amount for this piece.
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <FieldLabel>Estimated value</FieldLabel>
                <div className="mt-3 text-lg font-semibold">
                  {formatCurrency(bag.estimated_low)} –{" "}
                  {formatCurrency(bag.estimated_high)}
                </div>
                <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
                  Directional estimate only. Market-validated resale pricing
                  coming later.
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard
                  label="Purchase date"
                  value={
                    bag.purchase_date ? formatDate(bag.purchase_date) : "Not added"
                  }
                />

                <InfoCard
                  label="Added to archive"
                  value={formatDate(bag.created_at)}
                />

                <InfoCard
                  label="Confidence"
                  value={formatConfidence(bag.confidence)}
                  subtext={
                    bag.confidence_reason ||
                    "Confidence context will appear here when available."
                  }
                />

                <InfoCard
                  label="Market context"
                  value="Coming soon"
                  subtext="Comparable resale data will appear here later."
                />
              </div>

              <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <FieldLabel>Archive details</FieldLabel>
                <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
                  {archiveDetails.length > 0 ? (
                    <div className="space-y-2">
                      {archiveDetails.map((item) => (
                        <div key={item}>{item}</div>
                      ))}
                    </div>
                  ) : (
                    "No archive details added yet."
                  )}
                </div>
              </div>

              <div className="mt-6">
                {!editing ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEditing(true);
                        setMessage("");
                      }}
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
                  <div className="rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
                    <FieldLabel>Edit details</FieldLabel>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <EditField label="Acquisition cost">
                        <input
                          type="number"
                          placeholder="Optional"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        />
                      </EditField>

                      <EditField label="Currency">
                        <select
                          value={purchasePriceCurrency}
                          onChange={(e) =>
                            setPurchasePriceCurrency(e.target.value)
                          }
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CHF">CHF</option>
                          <option value="AED">AED</option>
                        </select>
                      </EditField>

                      <EditField label="Purchase date">
                        <input
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        />
                      </EditField>

                      <EditField label="Condition">
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
                      </EditField>

                      <EditField label="Color">
                        <input
                          type="text"
                          placeholder="Optional"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        />
                      </EditField>

                      <EditField label="Material">
                        <input
                          type="text"
                          placeholder="Optional"
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        />
                      </EditField>

                      <div className="sm:col-span-2">
                        <EditField label="Size">
                          <input
                            type="text"
                            placeholder="Optional"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                          />
                        </EditField>
                      </div>
                    </div>

                    <div className="mt-4">
                      <EditField label="Personal notes">
                        <textarea
                          rows={4}
                          placeholder="Optional notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        />
                      </EditField>
                    </div>

                    <div className="mt-4">
                      <EditField label="Provenance / receipt notes">
                        <textarea
                          rows={4}
                          placeholder="Boutique, receipt, year, provenance, serial details, etc."
                          value={provenanceNotes}
                          onChange={(e) => setProvenanceNotes(e.target.value)}
                          className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                        />
                      </EditField>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          hydrateEditFields(bag);
                          setMessage("");
                        }}
                        className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                )}

                {message && (
                  <div className="mt-3 text-sm text-[#6E645B]">{message}</div>
                )}
              </div>
            </motion.section>
          </div>
        ) : null}
      </div>
    </motion.main>
  );
}