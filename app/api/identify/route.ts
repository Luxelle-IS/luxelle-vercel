import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing in .env.local" },
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
              text: "Identify this handbag as specifically as possible. Return only the brand and model. If uncertain, say the most likely brand and model.",
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

    return Response.json({
      result: response.output_text || "No result found.",
    });
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