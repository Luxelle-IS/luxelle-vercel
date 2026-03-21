"use client";

import { useEffect, useMemo, useState } from "react";
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
  user_id: string | null;
};

type SortOption = "newest" | "highest" | "brand";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatConfidence(confidence: string) {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Moderate confidence";
  return "Low confidence";
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function getConditionLabel(bag: SavedBag) {
  const value = bag.estimated_high || 0;
  if (value >= 5000) return "Collector piece";
  if (value >= 2000) return "Excellent";
  if (value >= 1000) return "Very good";
  return "Curated";
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [collection, setCollection] = useState<SavedBag[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [brandFilter, setBrandFilter] = useState("all");

  function clearCurrentBagState() {
    setResult(null);
    setPreview("");
    setSelectedFile(null);
    setError("");
    setSaveMessage("");
    setLoading(false);
  }

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserEmail(user?.email ?? null);
  }

  async function loadCollection() {
    setCollectionLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCollection([]);
      setCollectionLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("bags")
      .select("*")
      .eq("user_id", user.id)
      .not("user_id", "is", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCollection(data);
    } else {
      setCollection([]);
    }

    setCollectionLoading(false);
  }

  useEffect(() => {
    loadUser();
    loadCollection();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      clearCurrentBagState();
      loadUser();
      loadCollection();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
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

  async function uploadImageToStorage(file: File, userId: string) {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("bag-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("bag-images").getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function saveToCollection() {
    if (!result || !selectedFile) return;

    setSaveMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveMessage("You must be logged in to save.");
      return;
    }

    try {
      const imageUrl = await uploadImageToStorage(selectedFile, user.id);

      const { error } = await supabase.from("bags").insert([
        {
          brand: result.brand,
          model: result.model,
          confidence: result.confidence,
          estimated_low: result.estimatedLow,
          estimated_high: result.estimatedHigh,
          image_url: imageUrl,
          user_id: user.id,
        },
      ]);

      if (error) {
        setSaveMessage("Could not save bag.");
        return;
      }

      setSaveMessage("Saved to your collection.");
      loadCollection();
    } catch (err: any) {
      setSaveMessage(err?.message || "Could not upload image.");
    }
  }

  async function deleteBag(id: number) {
    const confirmed = window.confirm("Delete this bag from your collection?");
    if (!confirmed) return;

    const { error } = await supabase.from("bags").delete().eq("id", id);

    if (error) {
      alert("Could not delete bag.");
      return;
    }

    loadCollection();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setCollection([]);
    clearCurrentBagState();
  }

  const totalLow = collection.reduce(
    (sum, bag) => sum + (bag.estimated_low || 0),
    0
  );

  const totalHigh = collection.reduce(
    (sum, bag) => sum + (bag.estimated_high || 0),
    0
  );

  const averageValue =
    collection.length > 0
      ? Math.round((totalLow + totalHigh) / 2 / collection.length)
      : 0;

  const mostValuableBag = useMemo(() => {
    if (collection.length === 0) return null;
    return [...collection].sort(
      (a, b) => (b.estimated_high || 0) - (a.estimated_high || 0)
    )[0];
  }, [collection]);

  const latestBag = collection.length > 0 ? collection[0] : null;

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(collection.map((bag) => bag.brand).filter(Boolean))
    );
    return uniqueBrands.sort((a, b) => a.localeCompare(b));
  }, [collection]);

  const displayedCollection = useMemo(() => {
    let items = [...collection];

    if (brandFilter !== "all") {
      items = items.filter((bag) => bag.brand === brandFilter);
    }

    if (sortBy === "highest") {
      items.sort((a, b) => (b.estimated_high || 0) - (a.estimated_high || 0));
    } else if (sortBy === "brand") {
      items.sort((a, b) => a.brand.localeCompare(b.brand));
    } else {
      items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return items;
  }, [collection, brandFilter, sortBy]);

  return (
    <main className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-5 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Luxelle
              </div>
              <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
                Your private luxury
                <br />
                collection dashboard
              </h1>
              <div className="mt-3 text-sm opacity-70">
                {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
              </div>
            </div>

            <div className="flex gap-3">
              {userEmail ? (
                <button
                  onClick={signOut}
                  className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
                >
                  Log out
                </button>
              ) : (
                <a
                  href="https://tally.so/r/ODPO7Y"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
                >
                  Join the waitlist
                </a>
              )}
            </div>
          </div>
        </div>

        {!userEmail && (
          <div className="mb-8">
            <AuthCard
              onAuthSuccess={() => {
                clearCurrentBagState();
                loadUser();
                loadCollection();
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <section className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Collection Overview
              </div>

              {collectionLoading ? (
                <div className="mt-6 text-sm opacity-70">Loading overview...</div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Total items
                      </div>
                      <div className="mt-3 text-3xl font-semibold">
                        {collection.length}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Portfolio value
                      </div>
                      <div className="mt-3 text-lg font-semibold leading-snug">
                        {formatCurrency(totalLow)} – {formatCurrency(totalHigh)}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Average bag value
                      </div>
                      <div className="mt-3 text-2xl font-semibold">
                        {formatCurrency(averageValue)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Most valuable bag
                      </div>
                      {mostValuableBag ? (
                        <>
                          <div className="mt-3 text-lg font-semibold">
                            {mostValuableBag.brand}
                          </div>
                          <div className="text-sm opacity-70">
                            {mostValuableBag.model}
                          </div>
                          <div className="mt-3 text-sm font-medium">
                            {formatCurrency(mostValuableBag.estimated_low)} –{" "}
                            {formatCurrency(mostValuableBag.estimated_high)}
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 text-sm opacity-70">
                          No bags saved yet.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Latest addition
                      </div>
                      {latestBag ? (
                        <>
                          <div className="mt-3 text-lg font-semibold">
                            {latestBag.brand}
                          </div>
                          <div className="text-sm opacity-70">
                            {latestBag.model}
                          </div>
                          <div className="mt-3 text-sm opacity-60">
                            Added {formatDate(latestBag.created_at)}
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 text-sm opacity-70">
                          No bags saved yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>

            {mostValuableBag && (
              <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white/80 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-8">
                    <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                      Featured piece
                    </div>
                    <div className="mt-4 text-3xl font-semibold">
                      {mostValuableBag.brand}
                    </div>
                    <div className="mt-1 text-lg opacity-75">
                      {mostValuableBag.model}
                    </div>
                    <div className="mt-6 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                      {getConditionLabel(mostValuableBag)}
                    </div>
                    <div className="mt-6 text-[11px] uppercase tracking-[0.22em] opacity-55">
                      Estimated value
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {formatCurrency(mostValuableBag.estimated_low)} –{" "}
                      {formatCurrency(mostValuableBag.estimated_high)}
                    </div>
                    <div className="mt-3 text-sm opacity-60">
                      Added {formatDate(mostValuableBag.created_at)}
                    </div>
                  </div>

                  <div className="min-h-[320px]">
                    <img
                      src={mostValuableBag.image_url}
                      alt={`${mostValuableBag.brand} ${mostValuableBag.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                    My Collection
                  </div>
                  <div className="mt-2 text-sm opacity-60">
                    Private by default
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
                  >
                    <option value="all">All brands</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
                  >
                    <option value="newest">Newest</option>
                    <option value="highest">Highest value</option>
                    <option value="brand">Brand A–Z</option>
                  </select>
                </div>
              </div>

              {collectionLoading ? (
                <div className="mt-6 text-sm opacity-70">Loading collection...</div>
              ) : displayedCollection.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6 text-sm opacity-70">
                  No bags match this view yet.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {displayedCollection.map((bag) => (
                    <div
                      key={bag.id}
                      className="overflow-hidden rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4]"
                    >
                      {bag.image_url && (
                        <img
                          src={bag.image_url}
                          alt={`${bag.brand} ${bag.model}`}
                          className="h-64 w-full object-cover"
                        />
                      )}

                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">
                              {bag.brand}
                            </div>
                            <div className="text-base opacity-70">
                              {bag.model}
                            </div>
                          </div>

                          <div className="rounded-full bg-[#E8DED4] px-3 py-1 text-[11px] uppercase tracking-wide">
                            {getConditionLabel(bag)}
                          </div>
                        </div>

                        <div className="mt-4 h-px bg-[#E7DDD3]" />

                        <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-55">
                          Estimated value
                        </div>

                        <div className="mt-2 text-sm font-medium">
                          {formatCurrency(bag.estimated_low)} –{" "}
                          {formatCurrency(bag.estimated_high)}
                        </div>

                        <div className="mt-2 text-xs opacity-55">
                          Added {formatDate(bag.created_at)}
                        </div>

                        <button
                          onClick={() => deleteBag(bag.id)}
                          className="mt-5 w-full rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm transition hover:bg-[#F8F3EE]"
                        >
                          Delete bag
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <section className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Bag Identification
              </div>

              <h2 className="mt-4 text-3xl font-semibold leading-tight">
                Add a bag to your
                <br />
                digital closet
              </h2>

              <p className="mt-4 text-[15px] leading-relaxed opacity-75">
                Upload a handbag photo and Luxelle will suggest the closest
                match, estimate its value, and let you save it privately.
              </p>

              <div className="mt-8 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <label className="flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-[#D8C7B8] bg-white px-4 py-10 text-center text-sm opacity-80 transition hover:bg-[#FAF5EF]">
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
                <div className="mt-6 overflow-hidden rounded-[28px] border border-black/5 bg-white">
                  <img
                    src={preview}
                    alt="Bag preview"
                    className="h-72 w-full object-cover"
                  />
                </div>
              )}

              {loading && (
                <div className="mt-6 rounded-[24px] bg-[#F3EAE1] p-4 text-sm">
                  Identifying your bag...
                </div>
              )}

              {error && !loading && (
                <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Error
                  </div>
                  <div className="mt-3 text-sm text-red-700">{error}</div>
                </div>
              )}

              {result && !loading && (
                <div className="mt-6 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Suggested match
                  </div>

                  <div className="mt-3 text-2xl font-semibold">
                    {result.brand}
                  </div>

                  <div className="text-lg opacity-75">{result.model}</div>

                  <div className="mt-4 h-px bg-[#E7DDD3]" />

                  <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Confidence
                  </div>

                  <div className="mt-2 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                    {formatConfidence(result.confidence)}
                  </div>

                  <div className="mt-5 text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Estimated resale value
                  </div>

                  <div className="mt-2 text-base font-medium">
                    {formatCurrency(result.estimatedLow)} –{" "}
                    {formatCurrency(result.estimatedHigh)}
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
            </section>

            <section className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm">
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Notes
              </div>
              <div className="mt-4 space-y-3 text-sm opacity-70">
                <p>• Your collection is private to your account.</p>
                <p>• Value estimates are directional, not final market prices.</p>
                <p>• Build your private portfolio one piece at a time.</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}