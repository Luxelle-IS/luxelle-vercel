import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing Supabase URL.");
}

if (!supabaseAnonKey) {
  throw new Error("Missing Supabase anon key.");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing Supabase service role key.");
}

// Use anon client to verify incoming user token
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// Use service-role client only for server-side DB work
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const DAILY_IDENTIFY_LIMIT = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 25000;

function estimateBase64Bytes(base64String: string) {
  const cleaned = base64String.split(",").pop() || "";
  return Math.ceil((cleaned.length * 3) / 4);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Identification timed out. Please try again."));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function normalizeInteger(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Please sign in before identifying a piece." },
        { status: 401 }
      );
    }

    // Verify token with anon client
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error("Identify auth error:", authError);
      return NextResponse.json(
        { error: "Your session could not be verified. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const image = body?.image;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Missing image." }, { status: 400 });
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Please upload a valid image file." },
        { status: 400 }
      );
    }

    const imageBytes = estimateBase64Bytes(image);

    if (imageBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Please upload an image smaller than 8MB." },
        { status: 413 }
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabaseAdmin
      .from("identify_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);

    if (countError) {
      console.error("Identify count error:", countError);
      return NextResponse.json(
        { error: "Could not verify usage limits. Please try again." },
        { status: 500 }
      );
    }

    if ((count || 0) >= DAILY_IDENTIFY_LIMIT) {
      return NextResponse.json(
        {
          error: `You’ve reached today’s identification limit of ${DAILY_IDENTIFY_LIMIT} pieces. Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("identify_requests")
      .insert([{ user_id: user.id }]);

    if (insertError) {
      console.error("Identify usage insert error:", insertError);
      return NextResponse.json(
        { error: "Could not register this request. Please try again." },
        { status: 500 }
      );
    }

    const response = await withTimeout(
      client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `
You are a luxury handbag identification assistant for a premium archive app called Luxelle.

Your job:
- Identify the most likely handbag brand and model from the image
- Estimate a realistic directional resale value range in USD
- Return a refined editorial-style description
- Explain confidence clearly and briefly
- Keep the tone premium, concise, and elegant
- If uncertain, still provide the best likely answer, but be honest in the confidence explanation

Rules:
- Return ONLY valid JSON
- Do not include markdown fences
- Estimated values must be integers in USD
- Keep descriptions short and premium
- Never say "I can't tell" unless the image is truly unusable
- Prefer likely mainstream luxury handbag identification over obscure speculation

Return this exact JSON shape:
{
  "brand": "string",
  "model": "string",
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "string",
  "description": "string",
  "reasoning": "string",
  "estimatedLow": number,
  "estimatedHigh": number
}
                `.trim(),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Identify this luxury handbag from the image.

Please provide:
- brand
- model
- confidence
- confidenceReason
- description
- reasoning
- estimatedLow
- estimatedHigh

The description should sound premium and concise, like a luxury archive note.
The reasoning should briefly mention visible cues such as silhouette, hardware, quilting, leather texture, handle shape, flap structure, logo placement, or color/material cues.
Return JSON only.
                `.trim(),
              },
              {
                type: "input_image",
                image_url: image,
                detail: "high",
              },
            ],
          },
        ],
      }),
      OPENAI_TIMEOUT_MS
    );

    const rawText =
      response.output_text ||
      response.output
        ?.flatMap((item: any) => item.content || [])
        ?.map((c: any) => c.text || "")
        ?.join("") ||
      "";

    if (!rawText) {
      return NextResponse.json(
        { error: "No response text returned from the model." },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Invalid JSON from model:", rawText);
      return NextResponse.json(
        { error: "The model returned an unreadable response. Please try again." },
        { status: 500 }
      );
    }

    const estimatedLow = normalizeInteger(parsed.estimatedLow);
    const estimatedHigh = normalizeInteger(parsed.estimatedHigh);
    const low = Math.min(estimatedLow, estimatedHigh);
    const high = Math.max(estimatedLow, estimatedHigh);

    return NextResponse.json({
      brand: parsed.brand || "Unknown",
      model: parsed.model || "Unspecified model",
      confidence: normalizeConfidence(parsed.confidence),
      confidenceReason:
        parsed.confidenceReason ||
        "The visual cues were limited, so this result should be treated as directional.",
      description:
        parsed.description ||
        "A refined luxury handbag with identifiable archival value.",
      reasoning:
        parsed.reasoning ||
        "The identification is based on the overall silhouette and visible exterior details.",
      estimatedLow: low,
      estimatedHigh: high,
    });
  } catch (error: any) {
    console.error("Identify route error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "We couldn’t review this piece right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}