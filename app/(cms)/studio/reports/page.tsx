"use client";

import React from "react";
import { IconChartBar, IconDownload, IconTrendingUp, IconCurrencyDollar, IconUsers, IconCalendar, IconArrowUpRight } from "@tabler/icons-react";

export default function StudioReportsPage() {
  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Month,Revenue,Appointments,New Clients,Conversion Rate\nMay 2026,$58000,32,12,21.5%\nJune 2026,$64200,38,15,23.0%\nJuly 2026,$73500,42,18,24.8%";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "zerocraft_studio_report_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <IconChartBar className="w-6 h-6 text-[#22C55E]" /> Reports
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Comprehensive studio performance, revenue trajectory, and client conversion analytics.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-muted border border-border hover:bg-accent text-foreground font-semibold text-xs transition-all shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <IconDownload className="w-4 h-4 text-purple-400" /> Export CSV Report
        </button>
      </div>

      {/* Financial Summary Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-3">
          <div className="text-xs text-muted-foreground font-medium">Q3 YTD Gross Revenue</div>
          <div className="text-3xl font-extrabold text-foreground">$195,700.00</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <IconTrendingUp className="w-3.5 h-3.5" /> +18.4% compared to Q2
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-3">
          <div className="text-xs text-muted-foreground font-medium">Average Deal Size</div>
          <div className="text-3xl font-extrabold text-foreground">$24,462.00</div>
          <div className="text-xs text-purple-400 font-medium">
            Based on enterprise retainers
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-3">
          <div className="text-xs text-muted-foreground font-medium">Client Retention Rate</div>
          <div className="text-3xl font-extrabold text-foreground">94.2%</div>
          <div className="text-xs text-blue-400 font-medium">
            Top tier studio benchmark
          </div>
        </div>
      </div>

      {/* Monthly Trajectory Table */}
      <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-4">
        <h2 className="text-base font-bold text-foreground">Monthly Performance Breakdown (2026)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-background/80 uppercase text-[10px] text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">Month</th>
                <th className="p-3">Gross Revenue</th>
                <th className="p-3">Completed Projects</th>
                <th className="p-3">Appointments</th>
                <th className="p-3">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              <tr className="hover:bg-accent transition-colors">
                <td className="p-3 font-semibold text-foreground">July 2026</td>
                <td className="p-3 text-emerald-400 font-bold">$73,500.00</td>
                <td className="p-3">4 Projects</td>
                <td className="p-3">42 Sessions</td>
                <td className="p-3 text-purple-400 font-medium">24.8%</td>
              </tr>
              <tr className="hover:bg-accent transition-colors">
                <td className="p-3 font-semibold text-foreground">June 2026</td>
                <td className="p-3 text-emerald-400 font-bold">$64,200.00</td>
                <td className="p-3">3 Projects</td>
                <td className="p-3">38 Sessions</td>
                <td className="p-3 text-purple-400 font-medium">23.0%</td>
              </tr>
              <tr className="hover:bg-accent transition-colors">
                <td className="p-3 font-semibold text-foreground">May 2026</td>
                <td className="p-3 text-emerald-400 font-bold">$58,000.00</td>
                <td className="p-3">3 Projects</td>
                <td className="p-3">32 Sessions</td>
                <td className="p-3 text-purple-400 font-medium">21.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
