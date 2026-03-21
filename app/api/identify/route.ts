import OpenAI from "openai";

function getEstimatedValue(brand: string, model: string) {
  const b = brand.toLowerCase();
  const m = model.toLowerCase();

  const rules = [
    {
      brand: "louis vuitton",
      match: ["pochette métis", "pochette metis"],
      low: 1800,
      high: 2600,
    },
    {
      brand: "louis vuitton",
      match: ["neverfull"],
      low: 900,
      high: 1800,
    },
    {
      brand: "louis vuitton",
      match: ["speedy"],
      low: 700,
      high: 1600,
    },
    {
      brand: "chanel",
      match: ["classic flap"],
      low: 6000,
      high: 11000,
    },
    {
      brand: "chanel",
      match: ["boy bag"],
      low: 2500,
      high: 5000,
    },
    {
      brand: "hermès",
      match: ["birkin", "birkin 25", "birkin 30"],
      low: 9000,
      high: 30000,
    },
    {
      brand: "hermes",
      match: ["birkin", "birkin 25", "birkin 30"],
      low: 9000,
      high: 30000,
    },
    {
      brand: "hermès",
      match: ["kelly", "kelly 25", "kelly 28"],
      low: 8000,
      high: 28000,
    },
    {
      brand: "hermes",
      match: ["kelly", "kelly 25", "kelly 28"],
      low: 8000,
      high: 28000,
    },
    {
      brand: "jacquemus",
      match: ["le chiquito"],
      low: 250,
      high: 650,
    },
    {
      brand: "jacquemus",
      match: ["le bambino"],
      low: 300,
      high: 700,
    },
  ];

  for (const rule of rules) {
    if (b.includes(rule.brand) && rule.match.some((term) => m.includes(term))) {
      return { low: rule.low, high: rule.high };
    }
  }

  if (b.includes("louis vuitton")) return { low: 700, high: 2000 };
  if (b.includes("chanel")) return { low: 2500, high: 7000 };
  if (b.includes("hermès") || b.includes("hermes")) return { low: 5000, high: 20000 };
  if (b.includes("jacquemus")) return { low: 200, high: 700 };

  return { low: 500, high: 1500 };
}

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

    const estimate = getEstimatedValue(parsed.brand, parsed.model);

    return Response.json({
      ...parsed,
      estimatedLow: estimate.low,
      estimatedHigh: estimate.high,
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