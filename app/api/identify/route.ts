import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing in Vercel or .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const image = body.image;

    if (!image) {
      return Response.json({ error: "No image received." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: 'Identify this handbag. Respond ONLY in valid JSON with this exact shape: {"brand":"...","model":"...","confidence":"low|medium|high"}. No markdown. No extra text.',
            },
            {
              type: "input_image",
              image_url: image,
              detail: "low",
            },
          ],
        },
      ],
    });

    const text = response.output_text || "";

    let parsed: {
      brand: string;
      model: string;
      confidence: string;
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        brand: "Unknown",
        model: text || "No result found.",
        confidence: "medium",
      };
    }

    return Response.json(parsed);
  } catch (error: any) {
    console.error("IDENTIFY API ERROR:", error);

    return Response.json(
      {
        error: error?.message || "Unknown server error.",
      },
      { status: 500 }
    );
  }
}