import "server-only";

import PDFDocument from "pdfkit";

export type NotificationReportRow = {
  created_at: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
};

export async function renderNotificationReportPdf(rows: NotificationReportRow[], filtersLabel = "All notifications") {
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "ZeroCraft notification report", Author: "ZeroCraft CMS" } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => { document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });

  document.fontSize(10).fillColor("#666666").text("ZEROCRAFT CMS", { characterSpacing: 1.5 });
  document.moveDown(0.7).fontSize(24).fillColor("#151515").text("Notification report");
  document.moveDown(0.3).fontSize(10).fillColor("#666666").text(`${filtersLabel}  |  Generated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date())}`);
  document.moveDown(1).strokeColor("#dddddd").moveTo(48, document.y).lineTo(547, document.y).stroke();
  document.moveDown(0.8).fontSize(11).fillColor("#151515").text(`Total notifications: ${rows.length}    Read: ${rows.filter((row) => row.read).length}    Unread: ${rows.filter((row) => !row.read).length}`);
  document.moveDown(1);

  for (const row of rows) {
    if (document.y > 730) { document.addPage(); }
    const startY = document.y;
    document.roundedRect(48, startY, 499, 1, 0).fillColor("#e5e5e5").fill();
    document.y = startY + 12;
    document.fontSize(11).fillColor("#151515").text(row.title, 48, document.y, { width: 395 });
    document.fontSize(8).fillColor(row.read ? "#228b5b" : "#b26a00").text(row.read ? "READ" : "UNREAD", 470, startY + 12, { width: 77, align: "right" });
    const messageY = document.y + 4;
    document.fontSize(9).fillColor("#444444").text(row.message, 48, messageY, { width: 499 });
    const metaY = document.y + 4;
    document.fontSize(8).fillColor("#777777").text(`${row.type.toUpperCase()}  |  ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(row.created_at))}`, 48, metaY, { width: 499 });
    document.y = document.y + 8;
    document.moveDown(0.75);
  }
  if (!rows.length) document.fontSize(11).fillColor("#666666").text("No notifications matched the selected filters.");
  document.fontSize(8).fillColor("#888888").text("ZeroCraft CMS · Internal operational report", 48, 790, { align: "center", width: 499 });
  document.end();
  return finished;
}
