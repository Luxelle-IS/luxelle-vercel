"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  condition: string | null;
  notes: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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

export default function BagDetailPage() {
  const params = useParams();
  const bagId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [bag, setBag] = useState<SavedBag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function loadBag() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    if (!bagId) {
      setError("Bag not found.");
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
      setError("Bag not found.");
      setLoading(false);
      return;
    }

    setBag(data);
    setPurchasePrice(
      data.purchase_price !== null ? String(data.purchase_price) : ""
    );
    setCondition(data.condition || "Excellent");
    setNotes(data.notes || "");
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
        condition,
        notes: notes.trim() || null,
      })
      .eq("id", bag.id);

    if (error) {
      setMessage("Could not save changes.");
      return;
    }

    setMessage("Saved.");
    setEditing(false);
    await loadBag();
  }

  async function deleteBag() {
    if (!bag) return;

    const confirmed = window.confirm("Delete this bag?");
    if (!confirmed) return;

    const { error } = await supabase.from("bags").delete().eq("id", bag.id);

    if (error) {
      setMessage("Could not delete bag.");
      return;
    }

    window.location.href = "/";
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
    <main className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-5 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex items-center justify-between rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-sm">
          <div>
            <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
              Luxelle
            </div>
            <div className="mt-2 text-sm opacity-70">
              {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
            </div>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
          >
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            Loading bag...
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
            <div className="text-red-700">{error}</div>
          </div>
        ) : bag ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white/80 shadow-sm">
              <img
                src={bag.image_url}
                alt={`${bag.brand} ${bag.model}`}
                className="h-full min-h-[420px] w-full object-cover"
              />
            </section>

            <section className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Bag Details
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
                    Purchase price
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {bag.purchase_price !== null
                      ? formatCurrency(bag.purchase_price)
                      : "Not added"}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Added to collection
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {formatDate(bag.created_at)}
                  </div>
                </div>
              </div>

              {bag.purchase_price !== null && (
                <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Gain / loss potential
                  </div>
                  <div className="mt-3 text-lg font-semibold">
                    {formatCurrency(gainLow ?? 0)} –{" "}
                    {formatCurrency(gainHigh ?? 0)}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                  Notes
                </div>
                <div className="mt-3 text-sm opacity-75">
                  {bag.notes || "No notes added yet."}
                </div>
              </div>

              <div className="mt-6">
                {!editing ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-white transition hover:opacity-90"
                    >
                      Edit details
                    </button>

                    <button
                      onClick={deleteBag}
                      className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 transition hover:bg-[#F8F3EE]"
                    >
                      Delete bag
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                      Edit details
                    </div>

                    <input
                      type="number"
                      placeholder="Purchase price"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
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

                    <textarea
                      rows={4}
                      placeholder="Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                    />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        onClick={saveChanges}
                        className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-white"
                      >
                        Save changes
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setPurchasePrice(
                            bag.purchase_price !== null
                              ? String(bag.purchase_price)
                              : ""
                          );
                          setCondition(bag.condition || "Excellent");
                          setNotes(bag.notes || "");
                          setMessage("");
                        }}
                        className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {message && (
                  <div className="mt-3 text-sm opacity-75">{message}</div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}