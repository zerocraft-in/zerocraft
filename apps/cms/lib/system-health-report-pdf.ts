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

export async function renderWeeklyReliabilityReportPdf(input: { notifications: any[]; runs: any[]; incidents: any[]; sla: any }) {
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "ZeroCraft weekly reliability report", Author: "ZeroCraft CMS" } });
  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const finished = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
  const metrics = input.sla?.metrics || {};
  document.fontSize(10).fillColor("#666").text("ZEROCRAFT CMS · WEEKLY RELIABILITY");
  document.moveDown(.7).fontSize(24).fillColor("#171717").text("Weekly reliability report");
  document.moveDown(.3).fontSize(10).fillColor("#666").text(`Generated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date())}`);
  document.moveDown().fontSize(12).fillColor("#171717").text(`Reliability score: ${metrics.reliabilityScore ?? "—"}%    Uptime: ${Number(metrics.uptime || 0).toFixed(2)}%    Failure rate: ${Number(metrics.failureRate || 0).toFixed(2)}%    MTTR: ${Number(metrics.mttrMinutes || 0).toFixed(1)} min`);
  document.moveDown().fontSize(15).text("SLA status");
  const breaches = input.sla?.breaches || [];
  document.moveDown(.3).fontSize(10).fillColor(breaches.length ? "#b45309" : "#15803d").text(breaches.length ? `${breaches.length} active SLA breach${breaches.length === 1 ? "" : "es"}` : "No active SLA breaches");
  for (const breach of breaches) document.moveDown(.2).fontSize(9).fillColor("#444").text(`• ${breach.label}: ${breach.detail}`);
  document.moveDown().fontSize(15).fillColor("#171717").text("Operational summary");
  document.moveDown(.3).fontSize(10).fillColor("#444").text(`Health runs: ${input.runs.length}    Incidents: ${input.incidents.length}    Notifications: ${input.notifications.length}`);
  document.moveDown().fontSize(15).fillColor("#171717").text("Recent incidents");
  for (const incident of input.incidents.slice(0, 20)) document.moveDown(.25).fontSize(9).fillColor("#444").text(`${String(incident.status).toUpperCase()} · ${incident.component} · ${new Date(incident.last_seen_at).toLocaleString("en-IN")}\n${incident.latest_message || ""}`);
  if (!input.incidents.length) document.moveDown(.3).fontSize(10).fillColor("#666").text("No incidents recorded during this report period.");
  document.fontSize(8).fillColor("#888").text("ZeroCraft CMS · Internal operational report", 48, 790, { align: "center", width: 499 });
  document.end();
  return finished;
}
