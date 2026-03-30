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
  purchase_price?: number | null;
  purchase_price_currency?: string | null;
  purchase_date?: string | null;
  condition?: string | null;
  color?: string | null;
  material?: string | null;
  size?: string | null;
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

function formatMoneyWithCurrency(value: number, currency?: string | null) {
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `${code} ${value}`;
  }
}

function truncate(text: string, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function drawWrappedText({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size,
  color,
  lineHeight,
}: {
  page: any;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: any;
  size: number;
  color: any;
  lineHeight: number;
}) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);

    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });

  return lines.length;
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
    const totalRecordedValue = collection.reduce(
      (sum, bag) => sum + (bag.purchase_price || 0),
      0
    );
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

    const signaturePiece =
      collection.length > 0
        ? [...collection].sort(
            (a, b) =>
              (b.purchase_price || 0) - (a.purchase_price || 0) ||
              (b.estimated_high || 0) - (a.estimated_high || 0)
          )[0]
        : null;

    const selectedItems = [...collection]
      .sort(
        (a, b) =>
          (b.purchase_price || 0) - (a.purchase_price || 0) ||
          (b.estimated_high || 0) - (a.estimated_high || 0)
      )
      .slice(0, 3);

    const generatedAt = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());

    // Header
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

    page.drawText("Private collection dossier", {
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
        label: "Recorded Collection Value",
        value: formatCurrency(totalRecordedValue),
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
        size: i === 2 ? 16 : 22,
        font: fontBold,
        color: colors.ink,
      });
    });

    // Main editorial section
    const heroY = 220;
    const heroH = 150;
    const leftW = 260;
    const gap = 22;
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

    if (signaturePiece) {
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

      const embedded = await tryEmbedImage(pdfDoc, signaturePiece.image_url);

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
      const valueWidth = leftW - (tx - x0) - 18;

      page.drawText(truncate(signaturePiece.brand || "Unknown", 16), {
        x: tx,
        y: heroY + 88,
        size: 18,
        font: fontBold,
        color: colors.ink,
      });

      page.drawText(truncate(signaturePiece.model || "Unknown", 22), {
        x: tx,
        y: heroY + 66,
        size: 11,
        font: fontRegular,
        color: colors.soft,
      });

      page.drawText(
        signaturePiece.purchase_price != null
          ? formatMoneyWithCurrency(
              signaturePiece.purchase_price,
              signaturePiece.purchase_price_currency
            )
          : "Recorded value not added",
        {
          x: tx,
          y: heroY + 34,
          size: 11,
          font: fontBold,
          color: colors.ink,
        }
      );

      drawWrappedText({
        page,
        text: `Market estimate ${formatCurrency(
          signaturePiece.estimated_low
        )} – ${formatCurrency(signaturePiece.estimated_high)}`,
        x: tx,
        y: heroY + 18,
        maxWidth: valueWidth,
        font: fontRegular,
        size: 9,
        color: colors.soft,
        lineHeight: 11,
      });
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

    drawWrappedText({
      page,
      text: topBrands.length ? topBrands.join(" • ") : "No brand data yet",
      x: rightX,
      y: heroY + heroH - 42,
      maxWidth: rightW - 8,
      font: fontBold,
      size: 13,
      color: colors.ink,
      lineHeight: 15,
    });

    page.drawText("Collection Notes", {
      x: rightX,
      y: heroY + 78,
      size: 10,
      font: fontRegular,
      color: colors.soft,
    });

    const collectionSummary =
      totalPieces === 0
        ? "Your collection has not begun yet."
        : totalPieces === 1
        ? "A focused beginning with one recorded piece."
        : totalPieces < 5
        ? "A growing private collection with early depth and character."
        : "A more established collection with clear identity and recorded value.";

    drawWrappedText({
      page,
      text: collectionSummary,
      x: rightX,
      y: heroY + 56,
      maxWidth: rightW - 8,
      font: fontRegular,
      size: 12,
      color: colors.ink,
      lineHeight: 15,
    });

    page.drawText(
      `Market estimate ${formatCurrency(totalLow)} – ${formatCurrency(
        totalHigh
      )}`,
      {
        x: rightX,
        y: heroY + 28,
        size: 10,
        font: fontBold,
        color: colors.ink,
      }
    );

    drawWrappedText({
      page,
      text: "Market-based pricing is shown directionally and will become more precise as comparable data is introduced.",
      x: rightX,
      y: heroY + 10,
      maxWidth: rightW - 8,
      font: fontRegular,
      size: 9,
      color: colors.soft,
      lineHeight: 11,
    });

    // Selected pieces divider
    page.drawLine({
      start: { x: x0, y: 198 },
      end: { x: width - x0, y: 198 },
      thickness: 1,
      color: colors.line,
    });

    page.drawText("Selected Pieces", {
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
      const item = selectedItems[i];
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
      const textWidth = cardW - 108;

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
        item.purchase_price != null
          ? formatMoneyWithCurrency(
              item.purchase_price,
              item.purchase_price_currency
            )
          : "Recorded value not added",
        {
          x: tx,
          y: cardY + 34,
          size: 10,
          font: fontBold,
          color: colors.ink,
        }
      );

      drawWrappedText({
        page,
        text: `Estimate ${formatCurrency(item.estimated_low)} – ${formatCurrency(
          item.estimated_high
        )}`,
        x: tx,
        y: cardY + 16,
        maxWidth: textWidth,
        font: fontRegular,
        size: 9,
        color: colors.soft,
        lineHeight: 10,
      });
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