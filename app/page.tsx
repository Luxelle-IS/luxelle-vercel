"use client";

import { useState } from "react";

type IdentifyResult = {
  brand: string;
  model: string;
  confidence: string;
};

export default function Home() {
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError("");

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

  return (
    <main className="min-h-screen bg-[#F6F1EB] text-[#2C2A29] px-6 py-10">
      <div className="mx-auto w-full max-w-md">
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

              <div className="mt-4 text-[11px] uppercase tracking-[0.22em] opacity-60">
                Confidence
              </div>

              <div className="mt-1 text-sm capitalize">
                {result.confidence}
              </div>
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