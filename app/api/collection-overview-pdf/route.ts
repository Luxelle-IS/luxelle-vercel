import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type SavedBag = {
  id: number;
  brand: string;
  model: string;
  estimated_low: number;
  estimated_high: number;
  image_url: string;
  created_at: string;
};

type PdfPayload = {
  collection: SavedBag[];
  wishlistCount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getMidValue(low: number, high: number) {
  return ((low || 0) + (high || 0)) / 2;
}

async function tryEmbedImage(pdfDoc: PDFDocument, imageUrl: string) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;

    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("png")) {
      return await pdfDoc.embedPng(bytes);
    }

    return await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PdfPayload;
    const collection = Array.isArray(body.collection) ? body.collection : [];
    const wishlistCount = Number(body.wishlistCount || 0);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colors = {
      ink: rgb(0.17, 0.16, 0.16),
      soft: rgb(0.45, 0.42, 0.39),
      line: rgb(0.88, 0.84, 0.79),
      card: rgb(0.985, 0.972, 0.955),
      white: rgb(1, 1, 1),
      accent: rgb(0.9, 0.84, 0.78),
    };

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.965, 0.945, 0.92),
    });

    page.drawRectangle({
      x: 28,
      y: 28,
      width: width - 56,
      height: height - 56,
      color: colors.white,
      borderColor: colors.line,
      borderWidth: 1,
    });

    page.drawText("LUXELLE", {
      x: 48,
      y: height - 62,
      size: 10,
      font: fontBold,
      color: colors.soft,
    });

    page.drawText("Collection Overview", {
      x: 48,
      y: height - 95,
      size: 28,
      font: fontBold,
      color: colors.ink,
    });

    page.drawText("A private luxury archive summary", {
      x: 48,
      y: height - 118,
      size: 11,
      font: fontRegular,
      color: colors.soft,
    });

    const totalPieces = collection.length;
    const totalLow = collection.reduce(
      (sum, bag) => sum + (bag.estimated_low || 0),
      0
    );
    const totalHigh = collection.reduce(
      (sum, bag) => sum + (bag.estimated_high || 0),
      0
    );

    const topBrands = Array.from(
      collection.reduce((map, bag) => {
        const key = bag.brand || "Unknown";
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([brand]) => brand);

    const mostValuableBag =
      collection.length > 0
        ? [...collection].sort(
            (a, b) => (b.estimated_high || 0) - (a.estimated_high || 0)
          )[0]
        : null;

    const featuredItems = [...collection]
      .sort((a, b) => (b.estimated_high || 0) - (a.estimated_high || 0))
      .slice(0, 3);

    const metricY = height - 190;
    const metricW = 150;
    const metricH = 86;
    const metricGap = 16;
    const metricXs = [
      48,
      48 + metricW + metricGap,
      48 + (metricW + metricGap) * 2,
    ];

    const metrics = [
      {
        label: "Pieces Archived",
        value: String(totalPieces),
      },
      {
        label: "Wishlist Targets",
        value: String(wishlistCount),
      },
      {
        label: "Collection Value",
        value: `${formatCurrency(totalLow)} – ${formatCurrency(totalHigh)}`,
      },
    ];

    metrics.forEach((metric, i) => {
      const x = metricXs[i];
      page.drawRectangle({
        x,
        y: metricY,
        width: metricW,
        height: metricH,
        color: colors.card,
        borderColor: colors.line,
        borderWidth: 1,
      });

      page.drawText(metric.label, {
        x: x + 14,
        y: metricY + 58,
        size: 10,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(metric.value, {
        x: x + 14,
        y: metricY + 28,
        size: i === 2 ? 12 : 24,
        font: fontBold,
        color: colors.ink,
      });
    });

    const sigX = 540;
    const sigY = height - 290;
    const sigW = 254;
    const sigH = 200;

    page.drawRectangle({
      x: sigX,
      y: sigY,
      width: sigW,
      height: sigH,
      color: colors.card,
      borderColor: colors.line,
      borderWidth: 1,
    });

    page.drawText("Signature Piece", {
      x: sigX + 16,
      y: sigY + sigH - 22,
      size: 10,
      font: fontRegular,
      color: colors.soft,
    });

    if (mostValuableBag) {
      const embedded = await tryEmbedImage(pdfDoc, mostValuableBag.image_url);

      if (embedded) {
        const imgDims = embedded.scale(1);
        const boxW = sigW - 32;
        const boxH = 96;
        const scale = Math.min(boxW / imgDims.width, boxH / imgDims.height);
        const drawW = imgDims.width * scale;
        const drawH = imgDims.height * scale;

        page.drawImage(embedded, {
          x: sigX + 16 + (boxW - drawW) / 2,
          y: sigY + 78 + (boxH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      } else {
        page.drawRectangle({
          x: sigX + 16,
          y: sigY + 78,
          width: sigW - 32,
          height: 96,
          color: colors.accent,
        });
      }

      page.drawText(mostValuableBag.brand || "Unknown", {
        x: sigX + 16,
        y: sigY + 56,
        size: 18,
        font: fontBold,
        color: colors.ink,
      });

      page.drawText(mostValuableBag.model || "Unknown", {
        x: sigX + 16,
        y: sigY + 38,
        size: 11,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(
        `${formatCurrency(mostValuableBag.estimated_low)} – ${formatCurrency(
          mostValuableBag.estimated_high
        )}`,
        {
          x: sigX + 16,
          y: sigY + 18,
          size: 11,
          font: fontBold,
          color: colors.ink,
        }
      );
    } else {
      page.drawText("No signature piece yet", {
        x: sigX + 16,
        y: sigY + 96,
        size: 14,
        font: fontBold,
        color: colors.ink,
      });
    }

    const brandsY = 210;
    page.drawText("Top Brands", {
      x: 48,
      y: brandsY + 90,
      size: 12,
      font: fontBold,
      color: colors.ink,
    });

    const brandsText = topBrands.length
      ? topBrands.join(" • ")
      : "No brand data yet";

    page.drawText(brandsText, {
      x: 48,
      y: brandsY + 68,
      size: 11,
      font: fontRegular,
      color: colors.soft,
    });

    page.drawText("Featured Archive Pieces", {
      x: 48,
      y: 182,
      size: 12,
      font: fontBold,
      color: colors.ink,
    });

    const cardY = 42;
    const cardW = 230;
    const cardH = 126;
    const gap = 16;

    for (let i = 0; i < 3; i++) {
      const x = 48 + i * (cardW + gap);
      const item = featuredItems[i];

      page.drawRectangle({
        x,
        y: cardY,
        width: cardW,
        height: cardH,
        color: colors.card,
        borderColor: colors.line,
        borderWidth: 1,
      });

      if (!item) continue;

      const embedded = await tryEmbedImage(pdfDoc, item.image_url);

      if (embedded) {
        const imgDims = embedded.scale(1);
        const boxW = 70;
        const boxH = 86;
        const scale = Math.min(boxW / imgDims.width, boxH / imgDims.height);
        const drawW = imgDims.width * scale;
        const drawH = imgDims.height * scale;

        page.drawImage(embedded, {
          x: x + 14 + (boxW - drawW) / 2,
          y: cardY + 20 + (boxH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      } else {
        page.drawRectangle({
          x: x + 14,
          y: cardY + 20,
          width: 70,
          height: 86,
          color: colors.accent,
        });
      }

      page.drawText(item.brand || "Unknown", {
        x: x + 96,
        y: cardY + 88,
        size: 14,
        font: fontBold,
        color: colors.ink,
      });

      page.drawText(item.model || "Unknown", {
        x: x + 96,
        y: cardY + 68,
        size: 10,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(
        `${formatCurrency(item.estimated_low)} – ${formatCurrency(
          item.estimated_high
        )}`,
        {
          x: x + 96,
          y: cardY + 44,
          size: 10,
          font: fontBold,
          color: colors.ink,
        }
      );

      page.drawText(
        `Midpoint ${formatCurrency(
          getMidValue(item.estimated_low, item.estimated_high)
        )}`,
        {
          x: x + 96,
          y: cardY + 24,
          size: 9,
          font: fontRegular,
          color: colors.soft,
        }
      );
    }

    page.drawText("Generated by Luxelle", {
      x: width - 160,
      y: 18,
      size: 9,
      font: fontRegular,
      color: colors.soft,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="luxelle-collection-overview.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not generate collection overview PDF." },
      { status: 500 }
    );
  }
}