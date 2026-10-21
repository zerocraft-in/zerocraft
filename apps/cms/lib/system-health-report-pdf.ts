import "server-only";

import PDFDocument from "pdfkit";

export async function renderSystemHealthPdf(runs: any[], incidents: any[], label: string) {
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "ZeroCraft system health report", Author: "ZeroCraft CMS" } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const finished = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  document.fontSize(10).fillColor("#666").text("ZEROCRAFT CMS · SYSTEM HEALTH");
  document.moveDown().fontSize(24).fillColor("#171717").text("Reliability report");
  document.moveDown(.4).fontSize(11).fillColor("#444").text(label);
  document.moveDown().fontSize(11).fillColor("#171717").text(`Health runs: ${runs.length}    Incidents: ${incidents.length}`);
  document.moveDown();
  document.fontSize(14).text("Recent runs");
  for (const run of runs.slice(0, 30)) document.moveDown(.3).fontSize(9).fillColor("#333").text(`${new Date(run.created_at).toLocaleString("en-IN")} · ${run.overall.toUpperCase()} · ${run.trigger}`);
  document.moveDown().fontSize(14).fillColor("#171717").text("Incident timeline");
  for (const incident of incidents.slice(0, 30)) document.moveDown(.3).fontSize(9).fillColor("#333").text(`${incident.status.toUpperCase()} · ${incident.severity.toUpperCase()} · ${incident.component} · ${new Date(incident.last_seen_at).toLocaleString("en-IN")}\n${incident.latest_message}`);
  if (!runs.length && !incidents.length) document.moveDown().fontSize(10).text("No health history is available for the selected period.");
  document.end();
  return finished;
}
