import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const image = body?.image;

    if (!image) {
      return NextResponse.json({ error: "Missing image." }, { status: 400 });
    }

    const response = await client.responses.create({
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
- Estimate a realistic resale value range in USD
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
    });

    const rawText =
      response.output_text ||
      response.output
        ?.flatMap((item: any) => item.content || [])
        ?.map((c: any) => c.text || "")
        ?.join("") ||
      "";

    if (!rawText) {
      return NextResponse.json(
        { error: "No response text returned from model." },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Model returned invalid JSON.",
          raw: rawText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      brand: parsed.brand || "Unknown",
      model: parsed.model || "Unspecified model",
      confidence: parsed.confidence || "low",
      confidenceReason:
        parsed.confidenceReason ||
        "The visual cues were limited, so this result should be treated as directional.",
      description:
        parsed.description ||
        "A refined luxury handbag with identifiable archival value.",
      reasoning:
        parsed.reasoning ||
        "The identification is based on the overall silhouette and visible exterior details.",
      estimatedLow: Number(parsed.estimatedLow) || 0,
      estimatedHigh: Number(parsed.estimatedHigh) || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Something went wrong.",
      },
      { status: 500 }
    );
  }
}