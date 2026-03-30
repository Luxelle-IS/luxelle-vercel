import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_TIMEOUT_MS = 25000;

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