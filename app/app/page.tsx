"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import AuthCard from "../../components/AuthCard";

type IdentifyResult = {
  brand: string;
  model: string;
  confidence: string;
  confidenceReason: string;
  description: string;
  reasoning: string;
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

type SortOption = "newest" | "highest" | "brand";

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

function formatDateLong(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function getConditionLabel(bag: SavedBag) {
  if (bag.condition) return bag.condition;

  const value = bag.estimated_high || 0;
  if (value >= 5000) return "Collector piece";
  if (value >= 2000) return "Excellent";
  if (value >= 1000) return "Very good";
  return "Curated";
}

function extractStoragePath(publicUrl: string) {
  const marker = "/storage/v1/object/public/bag-images/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
}

function getMidValue(bag: SavedBag) {
  return ((bag.estimated_low || 0) + (bag.estimated_high || 0)) / 2;
}

function getGainLow(bag: SavedBag) {
  if (bag.purchase_price == null) return null;
  return (bag.estimated_low || 0) - bag.purchase_price;
}

function getGainHigh(bag: SavedBag) {
  if (bag.purchase_price == null) return null;
  return (bag.estimated_high || 0) - bag.purchase_price;
}

function getPerformanceTone(value: number | null) {
  if (value == null) return "text-[#2C2A29]";
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-amber-700";
  return "text-[#2C2A29]";
}

async function compressImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas.");

  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) throw new Error("Could not compress image.");

  return blob;
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
      <div className="h-48 rounded-[20px] bg-[#EFE6DC]" />
      <div className="mt-5 h-5 w-1/2 rounded bg-[#EFE6DC]" />
      <div className="mt-3 h-4 w-1/3 rounded bg-[#EFE6DC]" />
      <div className="mt-6 h-4 w-1/4 rounded bg-[#EFE6DC]" />
      <div className="mt-3 h-4 w-2/3 rounded bg-[#EFE6DC]" />
      <div className="mt-5 h-10 rounded-2xl bg-[#EFE6DC]" />
    </div>
  );
}

function PortfolioChart({ collection }: { collection: SavedBag[] }) {
  if (collection.length === 0) {
    return (
      <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6 text-sm opacity-70">
        Start your private archive to reveal how your collection evolves over time.
      </div>
    );
  }

  const sorted = [...collection].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let runningTotal = 0;
  const points = sorted.map((bag) => {
    runningTotal += getMidValue(bag);
    return {
      label: formatDate(bag.created_at),
      value: runningTotal,
    };
  });

  const width = 640;
  const height = 220;
  const padding = 18;

  const min = Math.min(...points.map((p) => p.value), 0);
  const max = Math.max(...points.map((p) => p.value), 1);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x =
        padding +
        (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
      const y =
        height -
        padding -
        ((point.value - min) / range) * (height - padding * 2);

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="luxelleAreaApp" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#D9C8B8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#D9C8B8" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#luxelleAreaApp)" />
        <path
          d={path}
          fill="none"
          stroke="#2C2A29"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const x =
            padding +
            (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
          const y =
            height -
            padding -
            ((point.value - min) / range) * (height - padding * 2);

          return <circle key={index} cx={x} cy={y} r="4" fill="#2C2A29" />;
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs opacity-55">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function OnboardingCard({
  userEmail,
  onStart,
  onSkip,
}: {
  userEmail: string | null;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay: 0.08, duration: 0.45 }}
      className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
    >
      <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
        Welcome to Luxelle
      </div>

      <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
        Your private archive
        <br />
        starts here.
      </h2>

      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed opacity-75">
        {userEmail
          ? `You’re signed in as ${userEmail}.`
          : "You’re signed in."} Add your first piece to begin building a refined
        private archive of your luxury collection.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
          <div className="text-sm font-semibold">1. Upload a piece</div>
          <div className="mt-3 text-sm leading-relaxed opacity-75">
            Start with a clear handbag image to create your first archive entry.
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
          <div className="text-sm font-semibold">2. Review the match</div>
          <div className="mt-3 text-sm leading-relaxed opacity-75">
            Luxelle suggests a likely match and prepares a directional value range.
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
          <div className="text-sm font-semibold">3. Build your archive</div>
          <div className="mt-3 text-sm leading-relaxed opacity-75">
            Save acquisition cost, condition, and notes in one private place.
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="rounded-2xl bg-[#2C2A29] px-6 py-3 text-sm text-white transition hover:opacity-90"
        >
          Add your first piece
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          className="rounded-2xl border border-[#D8C7B8] bg-white px-6 py-3 text-sm transition hover:bg-[#F8F3EE]"
        >
          Skip for now
        </motion.button>
      </div>
    </motion.section>
  );
}

export default function AppPage() {
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
  const [conditionFilter, setConditionFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideOnboarding, setHideOnboarding] = useState(false);

  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePriceCurrency, setPurchasePriceCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [provenanceNotes, setProvenanceNotes] = useState("");

  useEffect(() => {
    const dismissed = window.localStorage.getItem("luxelle_onboarding_hidden");
    setHideOnboarding(dismissed === "true");
  }, []);

  function clearCurrentBagState() {
    setResult(null);
    setPreview("");
    setSelectedFile(null);
    setError("");
    setSaveMessage("");
    setLoading(false);
    setPurchasePrice("");
    setPurchasePriceCurrency("USD");
    setPurchaseDate("");
    setCondition("Excellent");
    setNotes("");
    setColor("");
    setMaterial("");
    setSize("");
    setProvenanceNotes("");
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
          setError("The server returned an unexpected response.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setError(data.error || "The identification request could not be completed.");
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
    const compressedBlob = await compressImage(file);
    const fileName = `${userId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("bag-images")
      .upload(fileName, compressedBlob, {
        cacheControl: "3600",
        contentType: "image/jpeg",
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
      data,
      error: userError,
    } = await supabase.auth.getUser();

    const user = data?.user;

    if (userError || !user || !user.id) {
      setSaveMessage("Please log out and back in before saving.");
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
          purchase_price: purchasePrice ? Number(purchasePrice) : null,
          purchase_price_currency: purchasePriceCurrency || "USD",
          purchase_date: purchaseDate || null,
          condition,
          notes: notes.trim() || null,
          color: color.trim() || null,
          material: material.trim() || null,
          size: size.trim() || null,
          provenance_notes: provenanceNotes.trim() || null,
        },
      ]);

      if (error) {
        setSaveMessage(error.message || "This piece could not be saved.");
        return;
      }

      window.localStorage.setItem("luxelle_onboarding_hidden", "true");
      setHideOnboarding(true);
      setSaveMessage("Saved to your private collection.");
      loadCollection();
    } catch (err: any) {
      setSaveMessage(err?.message || "The image could not be uploaded.");
    }
  }

  async function deleteBag(bag: SavedBag) {
    const confirmed = window.confirm("Remove this bag from your collection?");
    if (!confirmed) return;

    const storagePath = extractStoragePath(bag.image_url);

    if (storagePath) {
      await supabase.storage.from("bag-images").remove([storagePath]);
    }

    const { error } = await supabase.from("bags").delete().eq("id", bag.id);

    if (error) {
      alert("This bag could not be removed.");
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

  const totalLow = collection.reduce((sum, bag) => sum + (bag.estimated_low || 0), 0);
  const totalHigh = collection.reduce((sum, bag) => sum + (bag.estimated_high || 0), 0);
  const totalPurchasePrice = collection.reduce((sum, bag) => sum + (bag.purchase_price || 0), 0);

  const potentialGainLow = totalLow - totalPurchasePrice;
  const potentialGainHigh = totalHigh - totalPurchasePrice;

  const averageValue =
    collection.length > 0 ? Math.round((totalLow + totalHigh) / 2 / collection.length) : 0;

  const mostValuableBag = useMemo(() => {
    if (collection.length === 0) return null;
    return [...collection].sort((a, b) => (b.estimated_high || 0) - (a.estimated_high || 0))[0];
  }, [collection]);

  const latestBag = collection.length > 0 ? collection[0] : null;

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(collection.map((bag) => bag.brand).filter(Boolean))
    );
    return uniqueBrands.sort((a, b) => a.localeCompare(b));
  }, [collection]);

  const materials = useMemo(() => {
    const uniqueMaterials = Array.from(
      new Set(collection.map((bag) => bag.material).filter(Boolean))
    ) as string[];
    return uniqueMaterials.sort((a, b) => a.localeCompare(b));
  }, [collection]);

  const conditions = useMemo(() => {
    const uniqueConditions = Array.from(
      new Set(collection.map((bag) => getConditionLabel(bag)).filter(Boolean))
    ) as string[];
    return uniqueConditions.sort((a, b) => a.localeCompare(b));
  }, [collection]);

  const displayedCollection = useMemo(() => {
    let items = [...collection];

    if (brandFilter !== "all") {
      items = items.filter((bag) => bag.brand === brandFilter);
    }

    if (conditionFilter !== "all") {
      items = items.filter((bag) => getConditionLabel(bag) === conditionFilter);
    }

    if (materialFilter !== "all") {
      items = items.filter((bag) => (bag.material || "") === materialFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((bag) => {
        const haystack = [bag.brand, bag.model]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
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
  }, [collection, brandFilter, conditionFilter, materialFilter, searchQuery, sortBy]);

  const showOnboarding = !collectionLoading && collection.length === 0 && !hideOnboarding;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-5 py-8 md:px-6 md:py-10"
    >
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.45 }}
          className="mb-8 rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Luxelle Archive
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
              <Link
                href="/settings"
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
              >
                Settings
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-5 py-3 text-sm transition hover:bg-white"
              >
                Home
              </Link>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={signOut}
                className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
              >
                Log out
              </motion.button>
            </div>
          </div>
        </motion.div>

        {!userEmail && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.05, duration: 0.45 }}
            className="mb-8"
          >
            <AuthCard
              onAuthSuccess={() => {
                clearCurrentBagState();
                loadUser();
                loadCollection();
              }}
            />
          </motion.div>
        )}

        {showOnboarding && (
          <div className="mb-8">
            <OnboardingCard
              userEmail={userEmail}
              onStart={() => {
                const el = document.getElementById("upload-panel");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onSkip={() => {
                window.localStorage.setItem("luxelle_onboarding_hidden", "true");
                setHideOnboarding(true);
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.08, duration: 0.45 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                  Collection Overview
                </div>
                <div className="text-xs opacity-50">
                  A private archive of your most important pieces
                </div>
              </div>

              {collectionLoading ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                  <LoadingCard />
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Total pieces", String(collection.length)],
                      [
                        "Collection value",
                        `${formatCurrency(totalLow)} – ${formatCurrency(totalHigh)}`,
                      ],
                      ["Total acquisition cost", formatCurrency(totalPurchasePrice)],
                      ["Average piece value", formatCurrency(averageValue)],
                    ].map(([label, value]) => (
                      <motion.div
                        key={label}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5"
                      >
                        <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                          {label}
                        </div>
                        <div className="mt-3 text-2xl font-semibold leading-snug">
                          {value}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <motion.div whileHover={{ y: -3 }} className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Potential performance
                      </div>
                      <div className="mt-3 text-lg font-semibold">
                        {formatCurrency(potentialGainLow)} – {formatCurrency(potentialGainHigh)}
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -3 }} className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Signature piece
                      </div>
                      {mostValuableBag ? (
                        <>
                          <div className="mt-3 text-lg font-semibold">{mostValuableBag.brand}</div>
                          <div className="text-sm opacity-70">{mostValuableBag.model}</div>
                        </>
                      ) : (
                        <div className="mt-3 text-sm opacity-70">No pieces saved yet.</div>
                      )}
                    </motion.div>

                    <motion.div whileHover={{ y: -3 }} className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Latest addition
                      </div>
                      {latestBag ? (
                        <>
                          <div className="mt-3 text-lg font-semibold">{latestBag.brand}</div>
                          <div className="text-sm opacity-70">{latestBag.model}</div>
                          <div className="mt-3 text-sm opacity-60">
                            Added {formatDate(latestBag.created_at)}
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 text-sm opacity-70">No pieces saved yet.</div>
                      )}
                    </motion.div>
                  </div>

                  <PortfolioChart collection={collection} />
                </>
              )}
            </motion.section>

            {mostValuableBag && (
              <motion.section
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.12, duration: 0.45 }}
                className="overflow-hidden rounded-[32px] border border-black/5 bg-white/80 shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-8">
                    <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                      Featured archive piece
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
              </motion.section>
            )}

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.16, duration: 0.45 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                      Collection Archive
                    </div>
                    <div className="mt-2 text-sm opacity-60">
                      Curated, private, and visible only to you
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none transition hover:bg-white"
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
                      className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none transition hover:bg-white"
                    >
                      <option value="newest">Newest</option>
                      <option value="highest">Highest value</option>
                      <option value="brand">Brand A–Z</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Search brand or model"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none transition hover:bg-white md:col-span-2"
                  />

                  <select
                    value={conditionFilter}
                    onChange={(e) => setConditionFilter(e.target.value)}
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none transition hover:bg-white"
                  >
                    <option value="all">All conditions</option>
                    {conditions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={materialFilter}
                    onChange={(e) => setMaterialFilter(e.target.value)}
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none transition hover:bg-white"
                  >
                    <option value="all">All materials</option>
                    {materials.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {collectionLoading ? (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <LoadingCard />
                  <LoadingCard />
                </div>
              ) : displayedCollection.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-8">
                  <div className="text-lg font-semibold">No pieces match this view</div>
                  <div className="mt-2 text-sm opacity-70">
                    Try clearing or changing your search and filters.
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {displayedCollection.map((bag) => {
                    const gainLow = getGainLow(bag);
                    const gainHigh = getGainHigh(bag);

                    return (
                      <motion.div
                        key={bag.id}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] shadow-sm"
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
                              <div className="text-lg font-semibold">{bag.brand}</div>
                              <div className="text-base opacity-70">{bag.model}</div>
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
                            {formatCurrency(bag.estimated_low)} – {formatCurrency(bag.estimated_high)}
                          </div>

                          {bag.purchase_price !== null && (
                            <>
                              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-55">
                                Acquisition cost
                              </div>
                              <div className="mt-2 text-sm font-medium">
                                {formatMoneyWithCurrency(
                                  bag.purchase_price,
                                  bag.purchase_price_currency
                                )}
                              </div>

                              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-55">
                                Performance potential
                              </div>
                              <div className={`mt-2 text-sm font-medium ${getPerformanceTone(gainHigh)}`}>
                                {formatCurrency(gainLow ?? 0)} – {formatCurrency(gainHigh ?? 0)}
                              </div>
                            </>
                          )}

                          {(bag.color || bag.material || bag.size) && (
                            <>
                              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-55">
                                Details
                              </div>
                              <div className="mt-2 text-sm opacity-75">
                                {[bag.color, bag.material, bag.size]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </div>
                            </>
                          )}

                          {bag.purchase_date && (
                            <>
                              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-55">
                                Purchase date
                              </div>
                              <div className="mt-2 text-sm font-medium">
                                {formatDateLong(bag.purchase_date)}
                              </div>
                            </>
                          )}

                          <div className="mt-4 text-xs opacity-55">
                            Added {formatDate(bag.created_at)}
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <motion.div whileTap={{ scale: 0.98 }}>
                              <Link
                                href={`/bag/${bag.id}`}
                                className="block rounded-2xl bg-[#2C2A29] px-4 py-3 text-center text-sm text-white transition hover:opacity-90"
                              >
                                View details
                              </Link>
                            </motion.div>

                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={() => deleteBag(bag)}
                              className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm transition hover:bg-[#F8F3EE]"
                            >
                              Remove piece
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          </div>

          <div className="space-y-8">
            <motion.section
              id="upload-panel"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.12, duration: 0.45 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Identify a Piece
              </div>

              <h2 className="mt-4 text-3xl font-semibold leading-tight">
                Add a new piece to your
                <br />
                private archive
              </h2>

              <p className="mt-4 text-[15px] leading-relaxed opacity-75">
                Upload a handbag image and Luxelle will suggest the closest match,
                estimate a value range, and prepare it for your personal collection.
              </p>

              <div className="mt-8 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <label className="flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-[#D8C7B8] bg-white px-4 py-10 text-center text-sm opacity-80 transition hover:bg-[#FAF5EF]">
                  <div>
                    <div className="font-medium">Upload a bag image</div>
                    <div className="mt-1 text-xs opacity-60">JPG, PNG, or HEIC</div>
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 overflow-hidden rounded-[28px] border border-black/5 bg-white"
                >
                  <img
                    src={preview}
                    alt="Bag preview"
                    className="h-72 w-full object-cover"
                  />
                </motion.div>
              )}

              {loading && (
                <div className="mt-6 rounded-[24px] bg-[#F3EAE1] p-4 text-sm">
                  Reviewing your piece...
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
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Suggested match
                  </div>

                  <div className="mt-3 text-2xl font-semibold">{result.brand}</div>
                  <div className="text-lg opacity-75">{result.model}</div>

                  <div className="mt-4 text-sm leading-relaxed opacity-80">
                    {result.description}
                  </div>

                  <div className="mt-4 h-px bg-[#E7DDD3]" />

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Confidence
                      </div>
                      <div className="mt-2 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                        {formatConfidence(result.confidence)}
                      </div>
                      <div className="mt-2 text-sm leading-relaxed opacity-75">
                        {result.confidenceReason}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Estimated value range
                      </div>
                      <div className="mt-2 text-base font-medium">
                        {formatCurrency(result.estimatedLow)} – {formatCurrency(result.estimatedHigh)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-[#E7DDD3] bg-white p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                      What the model noticed
                    </div>
                    <div className="mt-2 text-sm leading-relaxed opacity-75">
                      {result.reasoning}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Acquisition cost
                      </div>
                      <input
                        type="number"
                        placeholder="Optional"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Currency
                      </div>
                      <select
                        value={purchasePriceCurrency}
                        onChange={(e) => setPurchasePriceCurrency(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CHF">CHF</option>
                        <option value="AED">AED</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Purchase date
                      </div>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Condition
                      </div>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      >
                        <option>Excellent</option>
                        <option>Very good</option>
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Collector piece</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Color
                      </div>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Material
                      </div>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="text-[11px] uppercase tracking-[0.22em] opacity-55">
                        Size
                      </div>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-5 text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Personal notes
                  </div>
                  <textarea
                    placeholder="Optional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                  />

                  <div className="mt-5 text-[11px] uppercase tracking-[0.22em] opacity-55">
                    Provenance / receipt notes
                  </div>
                  <textarea
                    placeholder="Boutique, year, receipt details, provenance, serial info, etc."
                    value={provenanceNotes}
                    onChange={(e) => setProvenanceNotes(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                  />

                  <div className="mt-3 text-xs opacity-60">
                    Estimates are directional and designed for collection management.
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={saveToCollection}
                    className="mt-6 w-full rounded-2xl bg-[#2C2A29] px-4 py-3 text-white transition hover:opacity-90"
                  >
                    Save to collection
                  </motion.button>

                  {saveMessage && <div className="mt-3 text-sm opacity-80">{saveMessage}</div>}
                </motion.div>
              )}
            </motion.section>

            <motion.section
              variants={fadeUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.16, duration: 0.45 }}
              className="rounded-[32px] border border-black/5 bg-white/80 p-8 shadow-sm"
            >
              <div className="text-[11px] tracking-[0.32em] uppercase opacity-60">
                Private by Design
              </div>
              <div className="mt-4 space-y-3 text-sm opacity-70">
                <p>• Your archive is visible only to your account.</p>
                <p>• Value ranges are directional, not final resale offers.</p>
                <p>• Each piece can be refined over time with notes and acquisition history.</p>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </motion.main>
  );
}