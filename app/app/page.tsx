"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import AuthCard from "../../components/AuthCard";
import SectionHeader from "@/components/app/SectionHeader";
import StatCard from "@/components/app/StatCard";
import AppShellCard from "@/components/app/AppShellCard";

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

type WishlistItem = {
  id: number;
  created_at: string;
  user_id: string | null;
  brand: string;
  model: string;
  target_price: number | null;
  currency: string | null;
  desired_condition: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  notes: string | null;
};

type SortOption = "newest" | "highest" | "brand";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const BRAND_MODEL_CATALOG: Record<string, string[]> = {
  "Louis Vuitton": [
    "Speedy",
    "Neverfull",
    "Alma",
    "Capucines",
    "Pochette Métis",
    "Twist",
    "Petite Malle",
    "Keepall",
    "Noé",
    "Loop",
  ],
  Chanel: [
    "Classic Flap",
    "Boy Bag",
    "2.55 Reissue",
    "Gabrielle",
    "Coco Handle",
    "19 Bag",
    "Wallet on Chain",
  ],
  Hermès: [
    "Birkin",
    "Kelly",
    "Constance",
    "Evelyne",
    "Picotin",
    "Lindy",
    "Garden Party",
    "Bolide",
  ],
  Dior: [
    "Lady Dior",
    "Saddle",
    "Book Tote",
    "Bobby",
    "Dior Caro",
    "30 Montaigne",
  ],
  Gucci: [
    "Jackie",
    "Dionysus",
    "Marmont",
    "Horsebit 1955",
    "Bamboo 1947",
    "Ophidia",
  ],
  Prada: [
    "Galleria",
    "Re-Edition 2000",
    "Re-Edition 2005",
    "Cleo",
    "Cahier",
    "Symbole",
  ],
  Celine: [
    "Luggage",
    "Triomphe",
    "Belt Bag",
    "16",
    "Ava",
    "Classique Triomphe",
  ],
  "Saint Laurent": [
    "Sac de Jour",
    "LouLou",
    "Kate",
    "Le 5 à 7",
    "Niki",
    "Sunset",
  ],
  "Bottega Veneta": [
    "Jodie",
    "Cassette",
    "Sardine",
    "Andiamo",
    "Arco",
    "Knot",
  ],
  Fendi: ["Baguette", "Peekaboo", "First", "Sunshine Shopper"],
  Loewe: ["Puzzle", "Hammock", "Flamenco", "Gate", "Amazona"],
  Balenciaga: ["City", "Le Cagole", "Hourglass", "Neo Classic"],
  Valextra: ["Iside", "Brera", "Tric Trac"],
};

const ALL_BRANDS = Object.keys(BRAND_MODEL_CATALOG).sort((a, b) =>
  a.localeCompare(b)
);

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

function normalizeBrandInput(input: string) {
  const trimmed = input.trim().toLowerCase();
  const exact = ALL_BRANDS.find((brand) => brand.toLowerCase() === trimmed);
  return exact || input.trim();
}

function getBrandSuggestions(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_BRANDS.slice(0, 8);

  const starts = ALL_BRANDS.filter((brand) =>
    brand.toLowerCase().startsWith(q)
  );
  const contains = ALL_BRANDS.filter(
    (brand) =>
      !brand.toLowerCase().startsWith(q) && brand.toLowerCase().includes(q)
  );

  return [...starts, ...contains].slice(0, 8);
}

function getModelSuggestions(brandInput: string, modelQuery: string) {
  const normalizedBrand = normalizeBrandInput(brandInput);
  const models = BRAND_MODEL_CATALOG[normalizedBrand] || [];
  const q = modelQuery.trim().toLowerCase();

  if (!q) return models.slice(0, 8);

  const starts = models.filter((model) => model.toLowerCase().startsWith(q));
  const contains = models.filter(
    (model) =>
      !model.toLowerCase().startsWith(q) && model.toLowerCase().includes(q)
  );

  return [...starts, ...contains].slice(0, 8);
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

async function downloadCollectionOverviewPdf(
  collection: SavedBag[],
  wishlistCount: number
) {
  const res = await fetch("/api/collection-overview-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      collection,
      wishlistCount,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Could not generate PDF overview.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "luxelle-collection-overview.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
      <div className="h-52 rounded-[22px] bg-[#EFE6DC]" />
      <div className="mt-5 h-5 w-1/2 rounded bg-[#EFE6DC]" />
      <div className="mt-3 h-4 w-1/3 rounded bg-[#EFE6DC]" />
      <div className="mt-6 h-4 w-1/4 rounded bg-[#EFE6DC]" />
      <div className="mt-3 h-4 w-2/3 rounded bg-[#EFE6DC]" />
      <div className="mt-5 h-10 rounded-2xl bg-[#EFE6DC]" />
    </div>
  );
}

function SuggestionDropdown({
  items,
  onSelect,
}: {
  items: string[];
  onSelect: (value: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#E7DDD3] bg-white shadow-lg">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className="block w-full border-b border-[#F1E8DE] px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-[#FAF5EF]"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function PortfolioChart({ collection }: { collection: SavedBag[] }) {
  if (collection.length === 0) {
    return (
      <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6 text-sm text-[#6C6258]">
        Begin your archive to reveal how your collection evolves over time.
      </div>
    );
  }

  const sorted = [...collection].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
  const height = 180;
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

  const areaPath = `${path} L ${width - padding} ${
    height - padding
  } L ${padding} ${height - padding} Z`;

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E7DDD3] bg-[linear-gradient(180deg,#FCF8F4_0%,#F7F1EA_100%)] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="luxelleArchiveChartRedesignSplit" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#D9C8B8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#D9C8B8" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#luxelleArchiveChartRedesignSplit)" />
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

          return <circle key={index} cx={x} cy={y} r="3.5" fill="#2C2A29" />;
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs text-[#85796D]">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
      {children}
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
      className="rounded-[36px] border border-black/5 bg-white/80 p-8 shadow-sm"
    >
      <div className="text-[11px] tracking-[0.32em] uppercase text-[#8B7E72]">
        Welcome to Luxelle
      </div>

      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-4xl">
        Your private archive
        <br />
        begins with one piece.
      </h2>

      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#6E645B]">
        {userEmail
          ? `You’re signed in as ${userEmail}.`
          : "You’re signed in."}{" "}
        Add your first piece to begin a private record of what you own and what
        you are still pursuing.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
          <div className="text-sm font-semibold">1. Upload a piece</div>
          <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
            Start with a clear image and let Luxelle prepare a polished archive
            entry.
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
          <div className="text-sm font-semibold">2. Review the match</div>
          <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
            See an editorial identification result with confidence signals and a
            directional value range.
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
          <div className="text-sm font-semibold">3. Save beautifully</div>
          <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
            Keep acquisition, condition, notes, provenance, and wishlist intent
            in one private place.
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

function EmptyArchiveState({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-6 overflow-hidden rounded-[30px] border border-[#E7DDD3] bg-[#FCF8F4]">
      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr]">
        <div className="p-8 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#8B7E72]">
            First archive moment
          </div>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
            Start your private
            <br />
            collection beautifully.
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6E645B]">
            Your archive is still empty. Add your first bag to unlock collection
            value, signature-piece tracking, and a more refined overview of what
            you own.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              "AI identification and value guidance",
              "Private archive records with acquisition detail",
              "A collector dashboard that becomes richer over time",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-[#E7DDD3] bg-white px-4 py-4 text-sm"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onStart}
              className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
            >
              Upload your first piece
            </button>
          </div>
        </div>

        <div className="flex min-h-[280px] items-center justify-center bg-[linear-gradient(180deg,#F7F1EA_0%,#EFE4D7_100%)] p-8">
          <div className="max-w-xs text-center">
            <div className="text-sm uppercase tracking-[0.28em] text-[#9A8C80]">
              Luxelle
            </div>
            <div className="mt-5 rounded-[26px] border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
              <div className="text-lg font-semibold">Your first saved piece</div>
              <div className="mt-2 text-sm text-[#6E645B]">
                will appear here as the beginning of your archive.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyWishlistState({
  onFocusWishlist,
}: {
  onFocusWishlist: () => void;
}) {
  return (
    <div className="mt-8 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-8">
      <div className="text-[11px] uppercase tracking-[0.28em] text-[#8B7E72]">
        Wishlist
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
        Nothing on your radar yet.
      </div>
      <div className="mt-3 max-w-xl text-sm leading-relaxed text-[#6E645B]">
        Add the pieces you are still pursuing so Luxelle becomes both a record
        of ownership and a map of future acquisitions.
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onFocusWishlist}
          className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
        >
          Add first wishlist item
        </button>
      </div>
    </div>
  );
}

function FirstSaveCelebration({
  message,
  onUploadAnother,
  onGoWishlist,
}: {
  message: string;
  onUploadAnother: () => void;
  onGoWishlist: () => void;
}) {
  return (
    <div className="mt-6 rounded-[28px] border border-[#D8C7B8] bg-[linear-gradient(180deg,#FFFDFC_0%,#F6EEE7_100%)] p-6 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.28em] text-[#8B7E72]">
        Archive updated
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
        Your piece is now part of Luxelle.
      </div>
      <div className="mt-3 text-sm leading-relaxed text-[#6E645B]">
        {message}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={onUploadAnother}
          className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
        >
          Add another piece
        </button>
        <button
          onClick={onGoWishlist}
          className="rounded-2xl border border-[#D8C7B8] bg-white px-5 py-3 text-sm transition hover:bg-[#F8F3EE]"
        >
          Build your wishlist
        </button>
      </div>
    </div>
  );
}

export default function AppPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  // ✨ Manual override (NEW)
const [manualMode, setManualMode] = useState(false);
const [manualBrand, setManualBrand] = useState("");
const [manualModel, setManualModel] = useState("");
const [showManualBrandSuggestions, setShowManualBrandSuggestions] = useState(false);
const [showManualModelSuggestions, setShowManualModelSuggestions] = useState(false);

const manualBrandWrapRef = useRef<HTMLDivElement | null>(null);
const manualModelWrapRef = useRef<HTMLDivElement | null>(null);

const manualBrandSuggestions = useMemo(
  () => getBrandSuggestions(manualBrand),
  [manualBrand]
);

const manualModelSuggestions = useMemo(
  () => getModelSuggestions(manualBrand, manualModel),
  [manualBrand, manualModel]
);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [collection, setCollection] = useState<SavedBag[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [brandFilter, setBrandFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideOnboarding, setHideOnboarding] = useState(false);
  const [archiveSourceMessage, setArchiveSourceMessage] = useState("");
  const [activeWishForArchive, setActiveWishForArchive] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePriceCurrency, setPurchasePriceCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [condition, setCondition] = useState("Excellent");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [provenanceNotes, setProvenanceNotes] = useState("");

  const [wishBrand, setWishBrand] = useState("");
  const [wishModel, setWishModel] = useState("");
  const [wishTargetPrice, setWishTargetPrice] = useState("");
  const [wishCurrency, setWishCurrency] = useState("USD");
  const [wishCondition, setWishCondition] = useState("Excellent");
  const [wishColor, setWishColor] = useState("");
  const [wishMaterial, setWishMaterial] = useState("");
  const [wishSize, setWishSize] = useState("");
  const [wishNotes, setWishNotes] = useState("");
  const [wishMessage, setWishMessage] = useState("");

  const [showWishBrandSuggestions, setShowWishBrandSuggestions] =
    useState(false);
  const [showWishModelSuggestions, setShowWishModelSuggestions] =
    useState(false);

  const [editingWishId, setEditingWishId] = useState<number | null>(null);
  const [editWishBrand, setEditWishBrand] = useState("");
  const [editWishModel, setEditWishModel] = useState("");
  const [editWishTargetPrice, setEditWishTargetPrice] = useState("");
  const [editWishCurrency, setEditWishCurrency] = useState("USD");
  const [editWishCondition, setEditWishCondition] = useState("Excellent");
  const [editWishColor, setEditWishColor] = useState("");
  const [editWishMaterial, setEditWishMaterial] = useState("");
  const [editWishSize, setEditWishSize] = useState("");
  const [editWishNotes, setEditWishNotes] = useState("");
  const [editWishMessage, setEditWishMessage] = useState("");
  const [showEditWishBrandSuggestions, setShowEditWishBrandSuggestions] =
    useState(false);
  const [showEditWishModelSuggestions, setShowEditWishModelSuggestions] =
    useState(false);

  const addWishBrandWrapRef = useRef<HTMLDivElement | null>(null);
  const addWishModelWrapRef = useRef<HTMLDivElement | null>(null);
  const editWishBrandWrapRef = useRef<HTMLDivElement | null>(null);
  const editWishModelWrapRef = useRef<HTMLDivElement | null>(null);
  const wishlistSectionRef = useRef<HTMLElement | null>(null);

  const wishBrandSuggestions = useMemo(
    () => getBrandSuggestions(wishBrand),
    [wishBrand]
  );

  const wishModelSuggestions = useMemo(
    () => getModelSuggestions(wishBrand, wishModel),
    [wishBrand, wishModel]
  );

  const editWishBrandSuggestions = useMemo(
    () => getBrandSuggestions(editWishBrand),
    [editWishBrand]
  );

  const editWishModelSuggestions = useMemo(
    () => getModelSuggestions(editWishBrand, editWishModel),
    [editWishBrand, editWishModel]
  );

  useEffect(() => {
    const dismissed = window.localStorage.getItem("luxelle_onboarding_hidden");
    setHideOnboarding(dismissed === "true");
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        addWishBrandWrapRef.current &&
        !addWishBrandWrapRef.current.contains(target)
      ) {
        setShowWishBrandSuggestions(false);
      }

      if (
        addWishModelWrapRef.current &&
        !addWishModelWrapRef.current.contains(target)
      ) {
        setShowWishModelSuggestions(false);
      }

      if (
        editWishBrandWrapRef.current &&
        !editWishBrandWrapRef.current.contains(target)
      ) {
        setShowEditWishBrandSuggestions(false);
      }

      if (
        editWishModelWrapRef.current &&
        !editWishModelWrapRef.current.contains(target)
      ) {
        setShowEditWishModelSuggestions(false);
      }
      if (
  manualBrandWrapRef.current &&
  !manualBrandWrapRef.current.contains(target)
) {
  setShowManualBrandSuggestions(false);
}

if (
  manualModelWrapRef.current &&
  !manualModelWrapRef.current.contains(target)
) {
  setShowManualModelSuggestions(false);
}
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function scrollToUploadPanel() {
    const uploadEl = document.getElementById("upload-panel");
    uploadEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToWishlist() {
    const wishlistEl = document.getElementById("wishlist-section");
    wishlistEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    setArchiveSourceMessage("");
    setActiveWishForArchive(null);
  }

  function clearWishlistForm() {
    setWishBrand("");
    setWishModel("");
    setWishTargetPrice("");
    setWishCurrency("USD");
    setWishCondition("Excellent");
    setWishColor("");
    setWishMaterial("");
    setWishSize("");
    setWishNotes("");
    setWishMessage("");
    setShowWishBrandSuggestions(false);
    setShowWishModelSuggestions(false);
  }

  function startEditingWishlist(item: WishlistItem) {
    setEditingWishId(item.id);
    setEditWishBrand(item.brand || "");
    setEditWishModel(item.model || "");
    setEditWishTargetPrice(
      item.target_price !== null && item.target_price !== undefined
        ? String(item.target_price)
        : ""
    );
    setEditWishCurrency(item.currency || "USD");
    setEditWishCondition(item.desired_condition || "Excellent");
    setEditWishColor(item.color || "");
    setEditWishMaterial(item.material || "");
    setEditWishSize(item.size || "");
    setEditWishNotes(item.notes || "");
    setEditWishMessage("");
    setShowEditWishBrandSuggestions(false);
    setShowEditWishModelSuggestions(false);
  }

  function cancelEditingWishlist() {
    setEditingWishId(null);
    setEditWishBrand("");
    setEditWishModel("");
    setEditWishTargetPrice("");
    setEditWishCurrency("USD");
    setEditWishCondition("Excellent");
    setEditWishColor("");
    setEditWishMaterial("");
    setEditWishSize("");
    setEditWishNotes("");
    setEditWishMessage("");
    setShowEditWishBrandSuggestions(false);
    setShowEditWishModelSuggestions(false);
  }

  function startArchiveFromWishlist(item: WishlistItem) {
    clearCurrentBagState();
    setJustSaved(false);
    setPurchasePrice(
      item.target_price !== null && item.target_price !== undefined
        ? String(item.target_price)
        : ""
    );
    setPurchasePriceCurrency(item.currency || "USD");
    setCondition(item.desired_condition || "Excellent");
    setColor(item.color || "");
    setMaterial(item.material || "");
    setSize(item.size || "");
    setNotes(item.notes || "");
    setArchiveSourceMessage(
      `Archive starter loaded from wishlist: ${item.brand} ${item.model}. Upload an image to continue.`
    );
    setActiveWishForArchive(item.id);
    scrollToUploadPanel();
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

  async function loadWishlist() {
    setWishlistLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setWishlist([]);
      setWishlistLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWishlist(data);
    } else {
      setWishlist([]);
    }

    setWishlistLoading(false);
  }

  useEffect(() => {
    loadUser();
    loadCollection();
    loadWishlist();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      clearCurrentBagState();
      clearWishlistForm();
      cancelEditingWishlist();
      setJustSaved(false);
      setPdfMessage("");
      loadUser();
      loadCollection();
      loadWishlist();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  // Reset UI
  setSelectedFile(file);
  setLoading(true);
  setResult(null);
  setError("");
  setSaveMessage("");
  setJustSaved(false);

  // Basic validation
  if (!file.type.startsWith("image/")) {
    setError("Please upload a valid image file.");
    setLoading(false);
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setError("Please upload an image smaller than 10MB.");
    setLoading(false);
    return;
  }

  const reader = new FileReader();

  reader.onloadend = async () => {
    try {
      const base64 = reader.result as string;
      setPreview(base64);

      // ⛔ prevent double submits (VERY important for viral traffic)
      if (loading) return;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64 }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to identify piece.");
      }

      const data = await res.json();
      setResult(data);

// 👇 NEW: auto-switch if low confidence
if (data.confidence === "low") {
  setManualMode(true);
  setManualBrand(data.brand || "");
  setManualModel(data.model || "");
}

    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("This is taking longer than expected. Please try again.");
      } else {
        setError(err.message || "Something went wrong.");
      }
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
          brand: manualMode ? manualBrand || result.brand : result.brand,
model: manualMode ? manualModel || result.model : result.model,
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
      setArchiveSourceMessage("");
      setActiveWishForArchive(null);
      setJustSaved(true);
      await loadCollection();
    } catch (err: any) {
      setSaveMessage(err?.message || "The image could not be uploaded.");
    }
  }

  async function addWishlistItem() {
    setWishMessage("");

    if (!wishBrand.trim() || !wishModel.trim()) {
      setWishMessage("Brand and model are required.");
      return;
    }

    const {
      data,
      error: userError,
    } = await supabase.auth.getUser();

    const user = data?.user;

    if (userError || !user || !user.id) {
      setWishMessage("Please log out and back in before saving.");
      return;
    }

    const normalizedBrand = normalizeBrandInput(wishBrand);

    const { error } = await supabase.from("wishlist_items").insert([
      {
        user_id: user.id,
        brand: normalizedBrand,
        model: wishModel.trim(),
        target_price: wishTargetPrice ? Number(wishTargetPrice) : null,
        currency: wishCurrency || "USD",
        desired_condition: wishCondition || null,
        color: wishColor.trim() || null,
        material: wishMaterial.trim() || null,
        size: wishSize.trim() || null,
        notes: wishNotes.trim() || null,
      },
    ]);

    if (error) {
      setWishMessage(error.message || "Could not save wishlist item.");
      return;
    }

    clearWishlistForm();
    setWishMessage("Saved to your wishlist.");
    await loadWishlist();
  }

  async function saveWishlistEdits(itemId: number) {
    setEditWishMessage("");

    if (!editWishBrand.trim() || !editWishModel.trim()) {
      setEditWishMessage("Brand and model are required.");
      return;
    }

    const normalizedBrand = normalizeBrandInput(editWishBrand);

    const { error } = await supabase
      .from("wishlist_items")
      .update({
        brand: normalizedBrand,
        model: editWishModel.trim(),
        target_price: editWishTargetPrice ? Number(editWishTargetPrice) : null,
        currency: editWishCurrency || "USD",
        desired_condition: editWishCondition || null,
        color: editWishColor.trim() || null,
        material: editWishMaterial.trim() || null,
        size: editWishSize.trim() || null,
        notes: editWishNotes.trim() || null,
      })
      .eq("id", itemId);

    if (error) {
      setEditWishMessage("Could not save changes.");
      return;
    }

    setEditWishMessage("Saved.");
    await loadWishlist();
    setEditingWishId(null);
  }

  async function deleteWishlistItem(item: WishlistItem) {
    const confirmed = window.confirm("Delete this wishlist item?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Could not delete wishlist item.");
      return;
    }

    if (activeWishForArchive === item.id) {
      setActiveWishForArchive(null);
      setArchiveSourceMessage("");
    }

    await loadWishlist();
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

    await loadCollection();
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setCollection([]);
    setWishlist([]);
    clearCurrentBagState();
    clearWishlistForm();
    cancelEditingWishlist();
    setJustSaved(false);
    setPdfMessage("");
  }

  async function handleDownloadPdf() {
    setPdfMessage("");
    setIsDownloadingPdf(true);

    try {
      await downloadCollectionOverviewPdf(collection, wishlist.length);
      setPdfMessage("Your PDF overview is ready and downloading.");
    } catch (error: any) {
      setPdfMessage(error?.message || "Could not generate PDF overview.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  const totalLow = collection.reduce(
    (sum, bag) => sum + (bag.estimated_low || 0),
    0
  );
  const totalHigh = collection.reduce(
    (sum, bag) => sum + (bag.estimated_high || 0),
    0
  );
  const totalPurchasePrice = collection.reduce(
    (sum, bag) => sum + (bag.purchase_price || 0),
    0
  );

 const averageAcquisitionCost =
  collection.length > 0
    ? Math.round(totalPurchasePrice / collection.length)
    : 0;

  const collectionMid = Math.round((totalLow + totalHigh) / 2);
  const wishlistCount = wishlist.length;

  const mostValuableBag = useMemo(() => {
    if (collection.length === 0) return null;
    return [...collection].sort(
      (a, b) => (b.estimated_high || 0) - (a.estimated_high || 0)
    )[0];
  }, [collection]);

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
      items = items.filter(
        (bag) => getConditionLabel(bag) === conditionFilter
      );
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
  }, [
    collection,
    brandFilter,
    conditionFilter,
    materialFilter,
    searchQuery,
    sortBy,
  ]);

  const showOnboarding =
    !collectionLoading && collection.length === 0 && !hideOnboarding;
      return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#F6F1EB] px-5 py-8 text-[#2C2A29] md:px-6 md:py-10"
    >
      <div className="mx-auto w-full max-w-7xl">
        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.45 }}
          className="mb-8 overflow-hidden rounded-[40px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.90)_0%,rgba(250,245,239,0.92)_100%)] shadow-sm backdrop-blur"
        >
          <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
            <div className="max-w-3xl">
              <div className="text-[11px] uppercase tracking-[0.35em] text-[#8B7E72]">
                Luxelle Archive
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
                Your collection,
                <br />
                understood more clearly.
              </h1>
<p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#6E645B] md:text-base">
  Track what you own, understand its value, and keep your collection in one private record.
</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={scrollToUploadPanel}
                  className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
                >
                  Add a piece
                </button>
                <button
                  onClick={scrollToWishlist}
                  className="rounded-2xl border border-[#D8C7B8] bg-white px-5 py-3 text-sm transition hover:bg-[#F8F3EE]"
                >
                  Open wishlist
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf || collection.length === 0}
                  className="rounded-2xl border border-[#D8C7B8] bg-white px-5 py-3 text-sm transition hover:bg-[#F8F3EE] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloadingPdf ? "Preparing PDF..." : "Download overview"}
                </button>
              </div>

              <div className="mt-5 text-sm text-[#7A6F65]">
                {userEmail ? `Signed in as ${userEmail}` : "Not signed in"}
              </div>

              {pdfMessage && (
                <div className="mt-3 text-sm text-[#6E645B]">{pdfMessage}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[28px] border border-[#E7DDD3] bg-white/70 p-5">
<div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
  Collection value
</div>
<div className="mt-3 text-3xl font-semibold">
  {collection.length ? formatCurrency(totalPurchasePrice) : "—"}
</div>
<div className="mt-2 text-sm text-[#6E645B]">
  Total recorded value of your collection
</div>
              </div>

              <div className="rounded-[28px] border border-[#E7DDD3] bg-white/70 p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
                  Pieces archived
                </div>
                <div className="mt-3 text-3xl font-semibold">
                  {collection.length}
                </div>
            <div className="mt-2 text-sm text-[#6E645B]">
  Saved archive pieces
</div>
              </div>

              <div className="rounded-[28px] border border-[#E7DDD3] bg-white/70 p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
                  Wishlist targets
                </div>
                <div className="mt-3 text-3xl font-semibold">
                  {wishlistCount}
                </div>
            <div className="mt-2 text-sm text-[#6E645B]">
  Current targets
</div>
              </div>

              <div className="rounded-[28px] border border-[#E7DDD3] bg-white/70 p-5">
<div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
  Average value
</div>
<div className="mt-3 text-3xl font-semibold">
  {collection.length ? formatCurrency(averageAcquisitionCost) : "—"}
</div>
<div className="mt-2 text-sm text-[#6E645B]">
  Average recorded value
</div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#EEE4D9] px-6 py-4 md:px-8">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/settings"
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-2.5 text-sm transition hover:bg-white"
              >
                Settings
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-2.5 text-sm transition hover:bg-white"
              >
                Home
              </Link>
              <button
                onClick={signOut}
                className="rounded-2xl bg-[#2C2A29] px-4 py-2.5 text-sm text-white transition hover:opacity-90"
              >
                Log out
              </button>
            </div>
          </div>
        </motion.section>

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
                clearWishlistForm();
                cancelEditingWishlist();
                loadUser();
                loadCollection();
                loadWishlist();
              }}
            />
          </motion.div>
        )}

        {showOnboarding && (
          <div className="mb-8">
            <OnboardingCard
              userEmail={userEmail}
              onStart={scrollToUploadPanel}
              onSkip={() => {
                window.localStorage.setItem(
                  "luxelle_onboarding_hidden",
                  "true"
                );
                setHideOnboarding(true);
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.98fr_1.02fr]">
          <motion.section
            id="upload-panel"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08, duration: 0.45 }}
          >
            <AppShellCard className="h-full p-8">
              <SectionHeader
                eyebrow="Identify a piece"
                title="Add a new archive entry."
                description="Upload an image and let Luxelle identify the piece and prepare the archive record."
              />

              {!preview && !result && !loading && collection.length === 0 && (
                <div className="mt-6 rounded-[26px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">
                  <div className="text-lg font-semibold">
                    Your first upload starts everything.
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
                    Once you add your first piece, Luxelle can begin shaping
                    your archive and making the dashboard feel distinctly yours.
                  </div>
                </div>
              )}
              {result && !loading && (
  <div className="mt-6 rounded-[26px] border border-[#E7DDD3] bg-[#FCF8F4] p-6">

    <FieldLabel>AI suggestion</FieldLabel>

    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => setManualMode(!manualMode)}
        className="text-xs underline text-[#6E645B]"
      >
        {manualMode ? "Use AI suggestion instead" : "Edit manually"}
      </button>
    </div>

    {manualMode && (
      <div className="mt-3 text-xs text-[#8B7E72]">
        If you manually change the brand or model, the AI estimate may no longer match the final saved record.
      </div>
    )}

    {/* Your existing result UI continues here */}

  </div>
)}

              {archiveSourceMessage && (
                <div className="mt-6 rounded-[24px] border border-[#D8C7B8] bg-[#FCF8F4] p-4 text-sm text-[#6E645B]">
                  {archiveSourceMessage}
                </div>
              )}

              <div className="mt-8 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
                <label className="flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-[#D8C7B8] bg-white px-4 py-12 text-center text-sm text-[#6E645B] transition hover:bg-[#FAF5EF]">
                  <div>
                    <div className="font-medium text-[#2C2A29]">
                      Upload a bag image
                    </div>
                    <div className="mt-1 text-xs text-[#8B7E72]">
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 overflow-hidden rounded-[28px] border border-black/5 bg-white"
                >
                  <img
                    src={preview}
                    alt="Bag preview"
                    className="h-80 w-full object-cover"
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
                  <FieldLabel>Error</FieldLabel>
                  <div className="mt-3 text-sm text-red-700">{error}</div>
                </div>
              )}

              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-[28px] border border-[#E7DDD3] bg-[#FCF8F4] p-6"
                >
                  <FieldLabel>Suggested match</FieldLabel>
                  <div className="mt-4 flex items-center gap-3">
  <button
    type="button"
    onClick={() => setManualMode(!manualMode)}
    className="text-xs underline text-[#6E645B]"
  >
    {manualMode ? "Use AI suggestion instead" : "Edit manually"}
  </button>
</div>
{manualMode && (
  <div className="mt-3 text-xs text-[#8B7E72]">
    If you manually change the brand or model, the AI estimate may no longer match the final saved record.
  </div>
)}
{manualMode ? (
  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div ref={manualBrandWrapRef} className="relative">
      <FieldLabel>Brand</FieldLabel>
      <input
        type="text"
        value={manualBrand}
        onFocus={() => setShowManualBrandSuggestions(true)}
        onChange={(e) => {
          setManualBrand(e.target.value);
          setShowManualBrandSuggestions(true);
        }}
        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
      />

      {showManualBrandSuggestions && (
        <SuggestionDropdown
          items={manualBrandSuggestions}
          onSelect={(value) => {
            setManualBrand(value);
            setShowManualBrandSuggestions(false);
            setManualModel("");
            setShowManualModelSuggestions(true);
          }}
        />
      )}
    </div>

    <div ref={manualModelWrapRef} className="relative">
      <FieldLabel>Model</FieldLabel>
      <input
        type="text"
        value={manualModel}
        onFocus={() => setShowManualModelSuggestions(true)}
        onChange={(e) => {
          setManualModel(e.target.value);
          setShowManualModelSuggestions(true);
        }}
        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
      />

      {showManualModelSuggestions && (
        <SuggestionDropdown
          items={manualModelSuggestions}
          onSelect={(value) => {
            setManualModel(value);
            setShowManualModelSuggestions(false);
          }}
        />
      )}
    </div>
  </div>
) : (
  <>
    <div className="mt-3 text-2xl font-semibold">
      {result.brand}
    </div>
    <div className="text-lg text-[#6E645B]">{result.model}</div>
  </>
)}

                  <div className="mt-4 text-sm leading-relaxed text-[#6E645B]">
                    {result.description}
                  </div>

                  <div className="mt-4 h-px bg-[#E7DDD3]" />

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Confidence</FieldLabel>
                      <div className="mt-2 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                        {formatConfidence(result.confidence)}
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
                        {result.confidenceReason}
                      </div>
                      {result.confidence === "low" && (
  <div className="mt-4 rounded-[18px] border border-[#E7DDD3] bg-white px-4 py-3 text-sm text-[#6E645B]">
    This match has low confidence. You may want to review or edit the details before saving.
  </div>
)}
                    </div>

                    <div
  className={`rounded-[20px] border px-4 py-4 transition ${
    manualMode
      ? "border-[#E7DDD3] bg-white/60 opacity-70"
      : "border-transparent bg-transparent opacity-100"
  }`}
>
  <FieldLabel>{manualMode ? "AI estimate" : "Estimated value range"}</FieldLabel>

  <div className="mt-2 text-base font-medium">
    {formatCurrency(result.estimatedLow)} –{" "}
    {formatCurrency(result.estimatedHigh)}
  </div>

  {manualMode && (
    <div className="mt-2 text-xs text-[#8B7E72]">
      Shown for reference only. This estimate may not reflect your edited brand or model.
    </div>
  )}
</div>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-[#E7DDD3] bg-white p-4">
                    <FieldLabel>What the model noticed</FieldLabel>
                    <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
                      {result.reasoning}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Acquisition cost</FieldLabel>
                      <input
                        type="number"
                        placeholder="Optional"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <FieldLabel>Currency</FieldLabel>
                      <select
                        value={purchasePriceCurrency}
                        onChange={(e) =>
                          setPurchasePriceCurrency(e.target.value)
                        }
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
                      <FieldLabel>Purchase date</FieldLabel>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <FieldLabel>Condition</FieldLabel>
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
                      <FieldLabel>Color</FieldLabel>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <FieldLabel>Material</FieldLabel>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FieldLabel>Size</FieldLabel>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <FieldLabel>Personal notes</FieldLabel>
                    <textarea
                      placeholder="Optional notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="mt-5">
                    <FieldLabel>Provenance / receipt notes</FieldLabel>
                    <textarea
                      placeholder="Boutique, year, receipt details, provenance, serial info, etc."
                      value={provenanceNotes}
                      onChange={(e) => setProvenanceNotes(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="mt-3 text-xs text-[#8B7E72]">
                    Estimates are directional and intended for collection
                    management rather than resale guarantees.
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={saveToCollection}
                      className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-white transition hover:opacity-90"
                    >
                      Save to collection
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        clearCurrentBagState();
                        setJustSaved(false);
                      }}
                      className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm transition hover:bg-[#F8F3EE]"
                    >
                      Reset upload
                    </motion.button>
                  </div>

                  {saveMessage && (
                    <div className="mt-3 text-sm text-[#6E645B]">
                      {saveMessage}
                    </div>
                  )}
                </motion.div>
              )}

              {justSaved && saveMessage && (
                <FirstSaveCelebration
                  message={saveMessage}
                  onUploadAnother={() => {
                    clearCurrentBagState();
                    setSaveMessage("");
                    setJustSaved(false);
                    scrollToUploadPanel();
                  }}
                  onGoWishlist={scrollToWishlist}
                />
              )}
            </AppShellCard>
          </motion.section>

          <motion.section
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1, duration: 0.45 }}
          >
            <div className="space-y-8">
              <AppShellCard className="overflow-hidden">
                {mostValuableBag ? (
                  <div className="grid grid-cols-1 md:grid-cols-[0.88fr_1.12fr]">
                    <div className="flex flex-col justify-between p-8 md:p-10">
                      <div>
                        <div className="text-[11px] tracking-[0.32em] uppercase text-[#8B7E72]">
                          Signature piece
                        </div>
                        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
                          {mostValuableBag.brand}
                        </h2>
                        <div className="mt-2 text-lg text-[#6E645B]">
                          {mostValuableBag.model}
                        </div>

                        <div className="mt-6 inline-block rounded-full bg-[#E8DED4] px-3 py-1 text-xs uppercase tracking-wide">
                          {getConditionLabel(mostValuableBag)}
                        </div>

                        <div className="mt-8">
                     <FieldLabel>Recorded value</FieldLabel>
<div className="mt-2 text-2xl font-semibold">
  {mostValuableBag.purchase_price !== null
    ? formatMoneyWithCurrency(
        mostValuableBag.purchase_price,
        mostValuableBag.purchase_price_currency
      )
    : "Not added"}
</div>
                        </div>

                        <div className="mt-8">
                        <FieldLabel>AI market estimate</FieldLabel>
<div className="mt-2 text-sm text-[#6E645B]">
  {formatCurrency(mostValuableBag.estimated_low)} –{" "}
  {formatCurrency(mostValuableBag.estimated_high)}
</div>
<div className="mt-2 text-xs text-[#8B7E72]">
  Directional only and may not reflect manually edited bag details.
</div>
                        </div>
                      </div>

                      <div className="mt-8 text-sm text-[#7A6F65]">
                        Added {formatDate(mostValuableBag.created_at)}
                      </div>
                    </div>

                    <div className="min-h-[360px] bg-[linear-gradient(180deg,#F7F1EA_0%,#EFE4D7_100%)]">
                      <img
                        src={mostValuableBag.image_url}
                        alt={`${mostValuableBag.brand} ${mostValuableBag.model}`}
                        className="h-full w-full object-contain p-6 md:p-10"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-10">
                    <div className="text-[11px] tracking-[0.32em] uppercase text-[#8B7E72]">
                      Signature piece
                    </div>
                    <div className="mt-4 text-2xl font-semibold">
                      Your most important piece appears here.
                    </div>
                    <div className="mt-3 max-w-lg text-sm leading-relaxed text-[#6E645B]">
                      As your archive grows, Luxelle highlights the strongest
                      object moment in your collection here.
                    </div>
                  </div>
                )}
              </AppShellCard>

<div className="rounded-[32px] border border-[#E7DDD3] bg-white/55 p-6 md:p-7">
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
    <div>
      <div className="text-[11px] uppercase tracking-[0.32em] text-[#8B7E72]">
        Archive intelligence
      </div>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
        A quieter read of your collection.
      </h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6E645B]">
        Essential archive signals in a calmer, more compact view.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
          Market context
        </div>
        <div className="mt-3 text-xl font-semibold leading-tight">
          Coming soon
        </div>
        <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
          Comparable market data will appear here once available.
        </div>
      </div>

      <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
          Acquisition cost
        </div>
        <div className="mt-3 text-xl font-semibold leading-tight">
          {formatCurrency(totalPurchasePrice)}
        </div>
        <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
          Across all saved pieces.
        </div>
      </div>

      <div className="rounded-[24px] border border-[#E7DDD3] bg-[#FCF8F4] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B7E72]">
          Archive status
        </div>
        <div className="mt-3 text-xl font-semibold leading-tight">
          {collection.length < 3
            ? "Beginning"
            : collection.length < 8
            ? "Developing"
            : "Established"}
        </div>
        <div className="mt-2 text-sm leading-relaxed text-[#6E645B]">
          A quiet read of collection maturity.
        </div>
      </div>
    </div>
  </div>

  <div className="mt-6">
    <PortfolioChart collection={collection} />
  </div>
</div>
            </div>
          </motion.section>
        </div>

        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.12, duration: 0.45 }}
          className="mt-8"
        >
          <AppShellCard className="p-8">
            <SectionHeader
              eyebrow="Collection archive"
              title="Search, sort, and review your pieces."
              description="A private view of what you own, organized with greater clarity and a calmer visual rhythm."
            />

            {collectionLoading ? (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
              </div>
            ) : collection.length === 0 ? (
              <EmptyArchiveState onStart={scrollToUploadPanel} />
            ) : (
              <>
                <div className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-[1.45fr_0.75fr_0.75fr_0.75fr_0.7fr]">
                  <input
                    type="text"
                    placeholder="Search brand or model"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none transition hover:bg-white"
                  />

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

                <div className="mt-3 rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm text-[#6E645B]">
                  {displayedCollection.length} visible piece
                  {displayedCollection.length === 1 ? "" : "s"} in this view
                </div>

                {displayedCollection.length === 0 ? (
                  <div className="mt-6 rounded-[26px] border border-[#E7DDD3] bg-[#FCF8F4] p-8">
                    <div className="text-lg font-semibold">
                      No pieces match this view
                    </div>
                    <div className="mt-2 text-sm text-[#6E645B]">
                      Try adjusting your search, filters, or sort settings.
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {displayedCollection.map((bag) => {
                      return (
                        <motion.div
                          key={bag.id}
                          whileHover={{ y: -4 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden rounded-[30px] border border-[#E7DDD3] bg-[#FCF8F4] shadow-sm"
                        >
                          {bag.image_url && (
                            <img
                              src={bag.image_url}
                              alt={`${bag.brand} ${bag.model}`}
                              className="h-72 w-full object-contain bg-[#F8F2EB] p-4"
                            />
                          )}

<div className="p-6">
  <div className="flex items-start justify-between gap-3">
    <div>
      <div className="text-xl font-semibold">{bag.brand}</div>
      <div className="text-base text-[#6E645B]">{bag.model}</div>
    </div>

    <div className="rounded-full bg-[#E8DED4] px-3 py-1 text-[11px] uppercase tracking-wide">
      {getConditionLabel(bag)}
    </div>
  </div>

  <div className="mt-4 h-px bg-[#E7DDD3]" />

<div className="mt-4">
<FieldLabel>Recorded value</FieldLabel>
<div className="mt-2 text-sm font-medium">
  {bag.purchase_price !== null
    ? formatMoneyWithCurrency(
        bag.purchase_price,
        bag.purchase_price_currency
      )
    : "Value not added"}
</div>
</div>

<div className="mt-4">
 <FieldLabel>AI market estimate</FieldLabel>
<div className="mt-2 text-sm text-[#6E645B]">
  {formatCurrency(bag.estimated_low)} – {formatCurrency(bag.estimated_high)}
</div>
</div>

<div className="mt-4 text-xs text-[#8B7E72]">
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
              </>
            )}
          </AppShellCard>
        </motion.section>

        <motion.section
          id="wishlist-section"
          ref={(el) => {
            wishlistSectionRef.current = el;
          }}
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.16, duration: 0.45 }}
          className="mt-8"
        >
          <AppShellCard className="p-8">
            <SectionHeader
              eyebrow="Wishlist / Watchlist"
              title="The pieces still on your radar."
              description="Track future additions with the same care as the pieces you already own."
            />

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div ref={addWishBrandWrapRef} className="relative">
                <input
                  type="text"
                  placeholder="Brand"
                  value={wishBrand}
                  onFocus={() => setShowWishBrandSuggestions(true)}
                  onChange={(e) => {
                    setWishBrand(e.target.value);
                    setShowWishBrandSuggestions(true);
                  }}
                  className="w-full rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
                />
                {showWishBrandSuggestions && (
                  <SuggestionDropdown
                    items={wishBrandSuggestions}
                    onSelect={(value) => {
                      setWishBrand(value);
                      setShowWishBrandSuggestions(false);
                      setWishModel("");
                      setShowWishModelSuggestions(true);
                    }}
                  />
                )}
              </div>

              <div ref={addWishModelWrapRef} className="relative">
                <input
                  type="text"
                  placeholder="Model"
                  value={wishModel}
                  onFocus={() => setShowWishModelSuggestions(true)}
                  onChange={(e) => {
                    setWishModel(e.target.value);
                    setShowWishModelSuggestions(true);
                  }}
                  className="w-full rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
                />
                {showWishModelSuggestions && (
                  <SuggestionDropdown
                    items={wishModelSuggestions}
                    onSelect={(value) => {
                      setWishModel(value);
                      setShowWishModelSuggestions(false);
                    }}
                  />
                )}
              </div>

              <input
                type="number"
                placeholder="Target price"
                value={wishTargetPrice}
                onChange={(e) => setWishTargetPrice(e.target.value)}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
              />

              <select
                value={wishCurrency}
                onChange={(e) => setWishCurrency(e.target.value)}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
                <option value="AED">AED</option>
              </select>

              <select
                value={wishCondition}
                onChange={(e) => setWishCondition(e.target.value)}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
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
                value={wishColor}
                onChange={(e) => setWishColor(e.target.value)}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
              />

              <input
                type="text"
                placeholder="Material"
                value={wishMaterial}
                onChange={(e) => setWishMaterial(e.target.value)}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
              />

              <input
                type="text"
                placeholder="Size"
                value={wishSize}
                onChange={(e) => setWishSize(e.target.value)}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none"
              />

              <textarea
                placeholder="Notes"
                value={wishNotes}
                onChange={(e) => setWishNotes(e.target.value)}
                rows={3}
                className="rounded-2xl border border-[#E7DDD3] bg-[#FCF8F4] px-4 py-3 text-sm outline-none md:col-span-2 xl:col-span-4"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={addWishlistItem}
                className="rounded-2xl bg-[#2C2A29] px-5 py-3 text-sm text-white transition hover:opacity-90"
              >
                Add to wishlist
              </motion.button>
            </div>

            {wishMessage && (
              <div className="mt-3 text-sm text-[#6E645B]">{wishMessage}</div>
            )}

            {wishlistLoading ? (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
              </div>
            ) : wishlist.length === 0 ? (
              <EmptyWishlistState
                onFocusWishlist={() =>
                  wishlistSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              />
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {wishlist.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[30px] border bg-[#FCF8F4] p-6 shadow-sm ${
                      activeWishForArchive === item.id
                        ? "border-[#BFA58B] ring-1 ring-[#D8C7B8]"
                        : "border-[#E7DDD3]"
                    }`}
                  >
                    {editingWishId === item.id ? (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div ref={editWishBrandWrapRef} className="relative">
                            <input
                              type="text"
                              placeholder="Brand"
                              value={editWishBrand}
                              onFocus={() =>
                                setShowEditWishBrandSuggestions(true)
                              }
                              onChange={(e) => {
                                setEditWishBrand(e.target.value);
                                setShowEditWishBrandSuggestions(true);
                              }}
                              className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                            />
                            {showEditWishBrandSuggestions && (
                              <SuggestionDropdown
                                items={editWishBrandSuggestions}
                                onSelect={(value) => {
                                  setEditWishBrand(value);
                                  setShowEditWishBrandSuggestions(false);
                                  setEditWishModel("");
                                  setShowEditWishModelSuggestions(true);
                                }}
                              />
                            )}
                          </div>

                          <div ref={editWishModelWrapRef} className="relative">
                            <input
                              type="text"
                              placeholder="Model"
                              value={editWishModel}
                              onFocus={() =>
                                setShowEditWishModelSuggestions(true)
                              }
                              onChange={(e) => {
                                setEditWishModel(e.target.value);
                                setShowEditWishModelSuggestions(true);
                              }}
                              className="w-full rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                            />
                            {showEditWishModelSuggestions && (
                              <SuggestionDropdown
                                items={editWishModelSuggestions}
                                onSelect={(value) => {
                                  setEditWishModel(value);
                                  setShowEditWishModelSuggestions(false);
                                }}
                              />
                            )}
                          </div>

                          <input
                            type="number"
                            placeholder="Target price"
                            value={editWishTargetPrice}
                            onChange={(e) =>
                              setEditWishTargetPrice(e.target.value)
                            }
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                          />

                          <select
                            value={editWishCurrency}
                            onChange={(e) =>
                              setEditWishCurrency(e.target.value)
                            }
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="CHF">CHF</option>
                            <option value="AED">AED</option>
                          </select>

                          <select
                            value={editWishCondition}
                            onChange={(e) =>
                              setEditWishCondition(e.target.value)
                            }
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
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
                            value={editWishColor}
                            onChange={(e) => setEditWishColor(e.target.value)}
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                          />

                          <input
                            type="text"
                            placeholder="Material"
                            value={editWishMaterial}
                            onChange={(e) => setEditWishMaterial(e.target.value)}
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                          />

                          <input
                            type="text"
                            placeholder="Size"
                            value={editWishSize}
                            onChange={(e) => setEditWishSize(e.target.value)}
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none"
                          />

                          <textarea
                            placeholder="Notes"
                            value={editWishNotes}
                            onChange={(e) => setEditWishNotes(e.target.value)}
                            rows={3}
                            className="rounded-2xl border border-[#E7DDD3] bg-white px-4 py-3 text-sm outline-none md:col-span-2"
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => saveWishlistEdits(item.id)}
                            className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-sm text-white"
                          >
                            Save changes
                          </button>
                          <button
                            onClick={cancelEditingWishlist}
                            className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm"
                          >
                            Cancel
                          </button>
                        </div>

                        {editWishMessage && (
                          <div className="mt-3 text-sm text-[#6E645B]">
                            {editWishMessage}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xl font-semibold">
                              {item.brand}
                            </div>
                            <div className="text-base text-[#6E645B]">
                              {item.model}
                            </div>
                          </div>

                          {item.desired_condition && (
                            <div className="rounded-full bg-[#E8DED4] px-3 py-1 text-[11px] uppercase tracking-wide">
                              {item.desired_condition}
                            </div>
                          )}
                        </div>

                        {activeWishForArchive === item.id && (
                          <div className="mt-4 rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm text-[#6E645B]">
                            Loaded into archive form above.
                          </div>
                        )}

                        {item.target_price !== null && (
                          <div className="mt-4">
                            <FieldLabel>Target price</FieldLabel>
                            <div className="mt-2 text-sm font-medium">
                              {formatMoneyWithCurrency(
                                item.target_price,
                                item.currency
                              )}
                            </div>
                          </div>
                        )}

                        {(item.color || item.material || item.size) && (
                          <div className="mt-4">
                            <FieldLabel>Desired details</FieldLabel>
                            <div className="mt-2 text-sm text-[#6E645B]">
                              {[item.color, item.material, item.size]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          </div>
                        )}

                        {item.notes && (
                          <div className="mt-4">
                            <FieldLabel>Notes</FieldLabel>
                            <div className="mt-2 text-sm text-[#6E645B]">
                              {item.notes}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 text-xs text-[#8B7E72]">
                          Added {formatDate(item.created_at)}
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <button
                            onClick={() => startArchiveFromWishlist(item)}
                            className="rounded-2xl bg-[#2C2A29] px-4 py-3 text-sm text-white transition hover:opacity-90"
                          >
                            Start archive
                          </button>

                          <button
                            onClick={() => startEditingWishlist(item)}
                            className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm transition hover:bg-[#F8F3EE]"
                          >
                            Edit wish
                          </button>

                          <button
                            onClick={() => deleteWishlistItem(item)}
                            className="rounded-2xl border border-[#D8C7B8] bg-white px-4 py-3 text-sm transition hover:bg-[#F8F3EE]"
                          >
                            Delete wish
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AppShellCard>
        </motion.section>

        <motion.section
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.18, duration: 0.45 }}
          className="mt-8"
        >
          <div className="rounded-[32px] border border-black/5 bg-[#2C2A29] p-6 text-white shadow-sm md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] tracking-[0.32em] uppercase text-white/60">
                  Private by design
                </div>
                <div className="mt-3 max-w-2xl text-sm leading-relaxed text-white/72">
                  Your archive is visible only to your account. Value ranges are
                  directional rather than guaranteed resale outcomes. Owned
                  pieces and future targets now live in one collector-grade flow.
                </div>
              </div>
              <div className="text-sm text-white/55">
                Luxelle archive environment
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </motion.main>
  );
}