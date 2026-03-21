"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AuthCard from "../components/AuthCard";

type IdentifyResult = {
  brand: string;
  model: string;
  confidence: string;
  estimatedLow: number;
  estimatedHigh: number;
};

type SavedBag = {
  id: number;
  brand: string;
  model: string;
  confidence: string;
  estimated_low: number;
  estimated_high: number;
  image_url: string;
  created_at: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [collection, setCollection] = useState<SavedBag[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);
  }

  async function loadCollection() {
    setCollectionLoading(true);

    const { data, error } = await supabase
      .from("bags")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCollection(data);
    }

    setCollectionLoading(false);
  }

  useEffect(() => {
    loadUser();
    loadCollection();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError("");
    setSaveMessage("");

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        setPreview(base64);

        const res = await fetch("/api/identify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: base64 }),
        });

        const text = await res.text();

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          setError("Server returned HTML instead of JSON.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError(data.error || "Server returned an error.");
          setLoading(false);
          return;
        }

        setResult(data);
      } catch (err: any) {
        setError(err?.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  }

  async function saveToCollection() {
    if (!result || !preview) return;

    setSaveMessage("");

    const { error } = await supabase.from("bags").insert([
      {
        brand: result.brand,
        model: result.model,
        confidence: result.confidence,
        estimated_low: result.estimatedLow,
        estimated_high: result.estimatedHigh,
        image_url: preview,
      },
    ]);

    if (error) {
      setSaveMessage("Could not save bag.");
      return;
    }

    setSaveMessage("Saved to collection.");
    loadCollection();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  const totalLow = collection.reduce((sum, bag) => sum + (bag.estimated_low || 0), 0);
  const totalHigh = collection.reduce((sum, bag) => sum + (bag.estimated_high || 0), 0);

  return (
    <main className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 rounded-[28px] border border-black/5 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] tracking-[0.28em] uppercase opacity-70">
                Luxelle
              </div>
              <div className="mt-2 text-sm opacity-70">
                {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
              </div>
            </div>

            {userEmail && (
              <button
                onClick={signOut}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-2 text-sm"
              >
                Log out
              </button>
            )}
          </div>
        </div>

        {!userEmail && (
          <div className="mb-8">
            <AuthCard onAuthSuccess={loadUser} />
          </div>
        )}

        <div className="rounded-[28px] border border-black/5 bg-white/80 p-8 shadow-sm">
          <div className="text-[11px] tracking-[0.28em] uppercase opacity-70">
            Luxelle
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            Your luxury closet,
            <br />
            beautifully organized.
          </h1>

          <p className="mt-4 text-[15px] leading-relaxed opacity-80">
            Add your handbags with a photo, get a suggested match, and begin
            building your digital luxury collection.
          </p>

          <a
            href="https://tally.so/r/ODPO7Y"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full rounded-2xl bg-[#2C2A29] px-4 py-3 text-center text-white transition hover:opacity-90"
          >
            Join the waitlist
          </a>

          <div className="mt-8 rounded-3xl border border-[#E7DDD3] bg-[#FCF8F4] p-5">
            <div className="text-sm font-medium">Try bag identification</div>
            <p className="mt-1 text-sm opacity-70">
              Upload a photo and Luxelle will suggest the closest match.
            </p>

            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#D8C7B8] bg-white px-4 py-8 text-center text-sm opacity-80 transition hover:bg-[#FAF5EF]">
              <div>
                <div className="font-medium">Upload a bag photo</div>
                <div className="mt-1 text-xs opacity-60">
                  JPG, PNG, or HEIC
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {preview && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-black/5 bg-white">
              <img
                src={preview}
                alt="Bag preview"
                className="h-72 w-full object-cover"
              />
            </div>
          )}

          {loading && (
            <div className="mt-6 rounded-3xl bg-[#F3EAE1] p-4 text-sm">
              Identifying your bag...
            </div>
          )}

          {error && !loading && (
            <div className="mt-6 rounded-3xl border border-[#E7DDD3] bg-[#FCF8F4] p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                Error
              </div>
              <div className="mt-3 text-sm text-red-700">{error}</div>
            </div>
          )}

          {result && !loading && (
            <div className="mt-6 rounded-3xl border border-[#E7DDD3] bg-[#FCF8F4] p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                Suggested match
              </div>

              <div className="mt-3 text-xl font-semibold">{result.brand}</div>

              <div className="text-lg opacity-80">{result.model}</div>

              <div className="mt-4 h-px bg-[#E7DDD3]" />

              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-60">
                Confidence
              </div>

              <div className="mt-2 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                {result.confidence === "high"
                  ? "High confidence"
                  : result.confidence === "medium"
                  ? "Moderate confidence"
                  : "Low confidence"}
              </div>

              <div className="mt-5 text-[11px] uppercase tracking-[0.22em] opacity-60">
                Estimated resale value
              </div>

              <div className="mt-2 text-base font-medium">
                {formatCurrency(result.estimatedLow)} – {formatCurrency(result.estimatedHigh)}
              </div>

              <div className="mt-2 text-xs opacity-60">
                Early estimate based on brand and model category.
              </div>

              <button
                onClick={saveToCollection}
                className="mt-6 w-full rounded-2xl bg-[#2C2A29] px-4 py-3 text-white transition hover:opacity-90"
              >
                Save to collection
              </button>

              {saveMessage && (
                <div className="mt-3 text-sm opacity-80">{saveMessage}</div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-[28px] border border-black/5 bg-white/80 p-8 shadow-sm">
          <div className="text-[11px] tracking-[0.28em] uppercase opacity-70">
            Collection Overview
          </div>

          {collectionLoading ? (
            <div className="mt-4 text-sm opacity-70">Loading overview...</div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="rounded-3xl border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                  Total items
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {collection.length}
                </div>
              </div>

              <div className="rounded-3xl border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                  Estimated total value
                </div>
                <div className="mt-2 text-xl font-semibold">
                  {formatCurrency(totalLow)} – {formatCurrency(totalHigh)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-[28px] border border-black/5 bg-white/80 p-8 shadow-sm">
          <div className="text-[11px] tracking-[0.28em] uppercase opacity-70">
            My Collection
          </div>

          {collectionLoading ? (
            <div className="mt-4 text-sm opacity-70">Loading collection...</div>
          ) : collection.length === 0 ? (
            <div className="mt-4 text-sm opacity-70">
              No bags saved yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {collection.map((bag) => (
                <div
                  key={bag.id}
                  className="overflow-hidden rounded-3xl border border-[#E7DDD3] bg-[#FCF8F4]"
                >
                  {bag.image_url && (
                    <img
                      src={bag.image_url}
                      alt={`${bag.brand} ${bag.model}`}
                      className="h-56 w-full object-cover"
                    />
                  )}

                  <div className="p-5">
                    <div className="text-lg font-semibold">{bag.brand}</div>
                    <div className="text-base opacity-80">{bag.model}</div>

                    <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-60">
                      Estimated resale value
                    </div>
                    <div className="mt-2 text-sm font-medium">
                      {formatCurrency(bag.estimated_low)} – {formatCurrency(bag.estimated_high)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs opacity-60">
            Private by default. No public profiles.
          </div>
        </div>
      </div>
    </main>
  );
}