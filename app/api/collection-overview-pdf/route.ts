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

function truncate(text: string, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
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
      page: rgb(0.965, 0.945, 0.92),
      paper: rgb(0.992, 0.987, 0.98),
      panel: rgb(0.978, 0.968, 0.955),
      softPanel: rgb(0.986, 0.978, 0.968),
      line: rgb(0.88, 0.84, 0.79),
      ink: rgb(0.17, 0.16, 0.16),
      soft: rgb(0.45, 0.42, 0.39),
      faint: rgb(0.62, 0.58, 0.54),
      accent: rgb(0.90, 0.84, 0.78),
      white: rgb(1, 1, 1),
    };

    const outerMargin = 34;
    const x0 = 48;
    const contentW = width - x0 * 2;

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: colors.page,
    });

    page.drawRectangle({
      x: outerMargin,
      y: outerMargin,
      width: width - outerMargin * 2,
      height: height - outerMargin * 2,
      color: colors.paper,
      borderColor: colors.line,
      borderWidth: 1,
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
      .slice(0, 4)
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

    const generatedAt = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());

    // Header block
    page.drawText("LUXELLE", {
      x: x0,
      y: height - 58,
      size: 10,
      font: fontBold,
      color: colors.soft,
    });

    page.drawText("Collection Overview", {
      x: x0,
      y: height - 98,
      size: 30,
      font: fontBold,
      color: colors.ink,
    });

    page.drawText("Private archive dossier", {
      x: x0,
      y: height - 118,
      size: 11,
      font: fontRegular,
      color: colors.soft,
    });

    page.drawText(`Generated ${generatedAt}`, {
      x: width - 165,
      y: height - 58,
      size: 10,
      font: fontRegular,
      color: colors.soft,
    });

    // Soft divider
    page.drawLine({
      start: { x: x0, y: height - 136 },
      end: { x: width - x0, y: height - 136 },
      thickness: 1,
      color: colors.line,
    });

    // Stats strip
    const statsY = height - 208;
    const statGap = 12;
    const statW = (contentW - statGap * 2) / 3;
    const statH = 64;

    const stats = [
      { label: "Pieces Archived", value: String(totalPieces) },
      { label: "Wishlist Targets", value: String(wishlistCount) },
      {
        label: "Collection Value",
        value: `${formatCurrency(totalLow)} – ${formatCurrency(totalHigh)}`,
      },
    ];

    stats.forEach((stat, i) => {
      const x = x0 + i * (statW + statGap);

      page.drawRectangle({
        x,
        y: statsY,
        width: statW,
        height: statH,
        color: colors.softPanel,
        borderColor: colors.line,
        borderWidth: 1,
      });

      page.drawText(stat.label, {
        x: x + 14,
        y: statsY + 43,
        size: 10,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(stat.value, {
        x: x + 14,
        y: statsY + 18,
        size: i === 2 ? 13 : 22,
        font: fontBold,
        color: colors.ink,
      });
    });

    // Main editorial section
    const heroY = 220;
    const heroH = 150;
    const leftW = 250;
    const gap = 18;
    const rightX = x0 + leftW + gap;
    const rightW = contentW - leftW - gap;

    // Signature piece panel
    page.drawRectangle({
      x: x0,
      y: heroY,
      width: leftW,
      height: heroH,
      color: colors.panel,
      borderColor: colors.line,
      borderWidth: 1,
    });

    page.drawText("Signature Piece", {
      x: x0 + 16,
      y: heroY + heroH - 22,
      size: 10,
      font: fontRegular,
      color: colors.soft,
    });

    if (mostValuableBag) {
      const imageBoxX = x0 + 16;
      const imageBoxY = heroY + 22;
      const imageBoxW = 96;
      const imageBoxH = 96;

      page.drawRectangle({
        x: imageBoxX,
        y: imageBoxY,
        width: imageBoxW,
        height: imageBoxH,
        color: colors.white,
      });

      const embedded = await tryEmbedImage(pdfDoc, mostValuableBag.image_url);

      if (embedded) {
        const dims = embedded.scale(1);
        const scale = Math.min(imageBoxW / dims.width, imageBoxH / dims.height);
        const drawW = dims.width * scale;
        const drawH = dims.height * scale;

        page.drawImage(embedded, {
          x: imageBoxX + (imageBoxW - drawW) / 2,
          y: imageBoxY + (imageBoxH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      } else {
        page.drawRectangle({
          x: imageBoxX + 12,
          y: imageBoxY + 12,
          width: imageBoxW - 24,
          height: imageBoxH - 24,
          color: colors.accent,
        });
      }

      const tx = imageBoxX + imageBoxW + 16;

      page.drawText(truncate(mostValuableBag.brand || "Unknown", 16), {
        x: tx,
        y: heroY + 88,
        size: 18,
        font: fontBold,
        color: colors.ink,
      });

      page.drawText(truncate(mostValuableBag.model || "Unknown", 22), {
        x: tx,
        y: heroY + 66,
        size: 11,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(
        `${formatCurrency(mostValuableBag.estimated_low)} – ${formatCurrency(
          mostValuableBag.estimated_high
        )}`,
        {
          x: tx,
          y: heroY + 34,
          size: 11,
          font: fontBold,
          color: colors.ink,
        }
      );
    } else {
      page.drawText("No signature piece yet", {
        x: x0 + 16,
        y: heroY + 70,
        size: 14,
        font: fontBold,
        color: colors.ink,
      });
    }

    // Right editorial summary block
    page.drawText("Brand Profile", {
      x: rightX,
      y: heroY + heroH - 18,
      size: 10,
      font: fontRegular,
      color: colors.soft,
    });

    page.drawText(
      topBrands.length ? topBrands.join(" • ") : "No brand data yet",
      {
        x: rightX,
        y: heroY + heroH - 42,
        size: 13,
        font: fontBold,
        color: colors.ink,
      }
    );

    page.drawText("Archive Notes", {
      x: rightX,
      y: heroY + 78,
      size: 10,
      font: fontRegular,
      color: colors.soft,
    });

    const archiveSummary =
      totalPieces === 0
        ? "Your archive has not begun yet."
        : totalPieces === 1
        ? "A focused beginning with one recorded piece."
        : totalPieces < 5
        ? "A growing private archive with early collection depth."
        : "An increasingly established archive with clear collector identity.";

    page.drawText(archiveSummary, {
      x: rightX,
      y: heroY + 56,
      size: 12,
      font: fontRegular,
      color: colors.ink,
    });

    page.drawText("Market context is intentionally withheld until sufficient comparable data is available.", {
      x: rightX,
      y: heroY + 26,
      size: 10,
      font: fontRegular,
      color: colors.soft,
      maxWidth: rightW - 10,
      lineHeight: 14,
    });

    // Featured section
    page.drawLine({
      start: { x: x0, y: 198 },
      end: { x: width - x0, y: 198 },
      thickness: 1,
      color: colors.line,
    });

    page.drawText("Featured Archive Pieces", {
      x: x0,
      y: 178,
      size: 12,
      font: fontBold,
      color: colors.ink,
    });

    const cardY = 48;
    const cardGap = 12;
    const cardW = (contentW - cardGap * 2) / 3;
    const cardH = 116;

    for (let i = 0; i < 3; i++) {
      const item = featuredItems[i];
      const cardX = x0 + i * (cardW + cardGap);

      page.drawRectangle({
        x: cardX,
        y: cardY,
        width: cardW,
        height: cardH,
        color: colors.softPanel,
        borderColor: colors.line,
        borderWidth: 1,
      });

      if (!item) continue;

      const imageBoxX = cardX + 14;
      const imageBoxY = cardY + 16;
      const imageBoxW = 72;
      const imageBoxH = 84;

      page.drawRectangle({
        x: imageBoxX,
        y: imageBoxY,
        width: imageBoxW,
        height: imageBoxH,
        color: colors.white,
      });

      const embedded = await tryEmbedImage(pdfDoc, item.image_url);

      if (embedded) {
        const dims = embedded.scale(1);
        const scale = Math.min(imageBoxW / dims.width, imageBoxH / dims.height);
        const drawW = dims.width * scale;
        const drawH = dims.height * scale;

        page.drawImage(embedded, {
          x: imageBoxX + (imageBoxW - drawW) / 2,
          y: imageBoxY + (imageBoxH - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      } else {
        page.drawRectangle({
          x: imageBoxX + 10,
          y: imageBoxY + 10,
          width: imageBoxW - 20,
          height: imageBoxH - 20,
          color: colors.accent,
        });
      }

      const tx = cardX + 96;

      page.drawText(truncate(item.brand || "Unknown", 18), {
        x: tx,
        y: cardY + 78,
        size: 13,
        font: fontBold,
        color: colors.ink,
      });

      page.drawText(truncate(item.model || "Unknown", 20), {
        x: tx,
        y: cardY + 58,
        size: 10,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(
        `${formatCurrency(item.estimated_low)} – ${formatCurrency(
          item.estimated_high
        )}`,
        {
          x: tx,
          y: cardY + 34,
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
          x: tx,
          y: cardY + 16,
          size: 9,
          font: fontRegular,
          color: colors.soft,
        }
      );
    }

    page.drawText("Generated by Luxelle", {
      x: width - 128,
      y: 20,
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