"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  IconCurrencyDollar,
  IconUsers,
  IconBriefcase,
  IconCalendar,
  IconTrendingUp,
  IconClock,
  IconCircleCheck,
  IconLoader2,
  IconSearch,
  IconFilter,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconColumns,
  IconExternalLink,
  IconLayoutDashboard,
  IconDatabase,
  IconServer,
  IconActivity,
  IconRefresh,
  IconShieldCheck,
  IconPlug,
  IconListCheck,
} from "@tabler/icons-react";
import {
  fetchWorksFromSupabase,
  fetchBlogsFromSupabase,
  fetchClientsFromSupabase,
  fetchAppointmentsFromSupabase,
  fetchReviewsFromSupabase,
  fetchProfilesFromSupabase,
} from "@/lib/supabase-client";
import { createClient } from "@/utils/supabase/client";
import { useCurrency } from "@/lib/currency-context";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

// Mock Data for Top Customers Radial Chart
const topCustomersData = [
  { name: "E-commerce", value: 300, fill: "var(--color-ecommerce)" },
  { name: "Web", value: 450, fill: "var(--color-web)" },
  { name: "Social app", value: 630, fill: "var(--color-social)" },
];

const topCustomersConfig = {
  social: {
    label: "Social app",
    color: "#0F4C5C", // Dark teal
  },
  web: {
    label: "Web",
    color: "#00A896", // Teal
  },
  ecommerce: {
    label: "E-commerce",
    color: "#F05D23", // Orange
  },
} satisfies ChartConfig;

// Mock Data for Revenue Bar Chart
const revenueData = [
  { month: "", revenue: 150, highlight: false },
  { month: "01.23", revenue: 250, highlight: false },
  { month: "", revenue: 200, highlight: false },
  { month: "", revenue: 350, highlight: false },
  { month: "02.23", revenue: 220, highlight: false },
  { month: "", revenue: 150, highlight: false },
  { month: "", revenue: 280, highlight: false },
  { month: "", revenue: 180, highlight: false },
  { month: "03.23", revenue: 560, highlight: true },
];

const revenueConfig = {
  revenue: {
    label: "Revenue",
    color: "#F05D23", // Orange highlight
  },
} satisfies ChartConfig;

// shadcn UI components
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface StudioRecord {
  id: string;
  header: string;
  sectionType: string;
  status: "Done" | "In Process" | "Pending";
  target: number;
  limit: number;
  reviewer: string | null;
  category: "works" | "blogs" | "clients" | "appointments";
  createdAt?: string;
  rawDate?: Date;
}

interface ActivityItem {
  id: string;
  title: string;
  category: string;
  timestamp: string;
  type: "work" | "client" | "appointment" | "blog" | "review";
  rawDate?: Date;
}

interface TableCountMetrics {
  profiles: number;
  clients: number;
  works: number;
  blogs: number;
  appointments: number;
  reviews: number;
}

export default function StudioDashboardHome() {
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<
    "works" | "blogs" | "clients" | "appointments"
  >("works");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshingDb, setRefreshingDb] = useState(false);

  // Calendar Date & Period Filter State (Daily, Monthly, Yearly)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [dateFilterMode, setDateFilterMode] = useState<
    "daily" | "monthly" | "yearly"
  >("monthly");

  // Database MVP Configs State
  const [autoSyncMode, setAutoSyncMode] = useState("realtime");
  const [dbStatus, setDbStatus] = useState({
    connected: true,
    latency: "Calculating...",
    projectRef: "jamyqssytdzbiiahtmsq",
    rlsPolicies: "Enforced (14 Rules Active)",
  });

  // Database Table Row Counts
  const [dbCounts, setDbCounts] = useState<TableCountMetrics>({
    profiles: 0,
    clients: 0,
    works: 0,
    blogs: 0,
    appointments: 0,
    reviews: 0,
  });

  // Supabase Raw Records & History State
  const [allRawRecords, setAllRawRecords] = useState<StudioRecord[]>([]);
  const [allHistoryLogs, setAllHistoryLogs] = useState<ActivityItem[]>([]);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    header: true,
    sectionType: true,
    status: true,
    target: true,
    reviewer: true,
  });

  // Load Dashboard Data from Supabase
  const loadDashboardData = async () => {
    setLoading(true);
    const startTime = performance.now();
    try {
      const [
        worksData,
        blogsData,
        clientsData,
        apptsData,
        reviewsData,
        profilesData,
      ] = await Promise.all([
        fetchWorksFromSupabase(),
        fetchBlogsFromSupabase(),
        fetchClientsFromSupabase(),
        fetchAppointmentsFromSupabase(),
        fetchReviewsFromSupabase(),
        fetchProfilesFromSupabase(),
      ]);
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      setDbStatus({
        connected: true,
        latency: `${latencyMs}ms`,
        projectRef: "jamyqssytdzbiiahtmsq",
        rlsPolicies: "Enforced (14 Rules Active)",
      });

      const records: StudioRecord[] = [];
      const historyLog: ActivityItem[] = [];

      // Process Works
      if (worksData && worksData.length > 0) {
        worksData.forEach((w: any) => {
          const d = w.created_at ? new Date(w.created_at) : new Date();
          records.push({
            id: w.id,
            header: w.title || "Project Item",
            sectionType: w.category || "Web Application",
            status: w.featured ? "Done" : "In Process",
            target: 100,
            limit: 100,
            reviewer: w.client_name || "Zerocraft Lead",
            category: "works",
            createdAt: w.created_at,
            rawDate: d,
          });

          historyLog.push({
            id: `act-work-${w.id}`,
            title: `Portfolio Work: ${w.title}`,
            category: w.category || "Design Work",
            timestamp: d.toLocaleDateString(),
            type: "work",
            rawDate: d,
          });
        });
      }

      // Process Blogs
      if (blogsData && blogsData.length > 0) {
        blogsData.forEach((b: any) => {
          const d = b.created_at ? new Date(b.created_at) : new Date();
          records.push({
            id: b.id,
            header: b.title || "Blog Article",
            sectionType: b.category || "Insights",
            status: b.status === "published" ? "Done" : "Pending",
            target: b.views_count || 45,
            limit: 200,
            reviewer: b.author_name || "Studio Team",
            category: "blogs",
            createdAt: b.created_at,
            rawDate: d,
          });

          historyLog.push({
            id: `act-blog-${b.id}`,
            title: `Blog Published: ${b.title}`,
            category: b.category || "Article",
            timestamp: d.toLocaleDateString(),
            type: "blog",
            rawDate: d,
          });
        });
      }

      // Process Clients
      if (clientsData && clientsData.length > 0) {
        clientsData.forEach((c: any) => {
          const d = c.created_at ? new Date(c.created_at) : new Date();
          records.push({
            id: c.id,
            header: c.name || "Client Account",
            sectionType: c.company || "Enterprise Client",
            status: c.status === "active" ? "Done" : "In Process",
            target: Math.round(Number(c.total_spent || 0) / 1000),
            limit: 100,
            reviewer: c.email,
            category: "clients",
            createdAt: c.created_at,
            rawDate: d,
          });

          historyLog.push({
            id: `act-cli-${c.id}`,
            title: `Client Account: ${c.name} (${c.company})`,
            category: `$${Number(c.total_spent || 0).toLocaleString()}`,
            timestamp: d.toLocaleDateString(),
            type: "client",
            rawDate: d,
          });
        });
      }

      // Process Appointments
      if (apptsData && apptsData.length > 0) {
        apptsData.forEach((a: any) => {
          const d = a.scheduled_at
            ? new Date(a.scheduled_at)
            : a.created_at
              ? new Date(a.created_at)
              : new Date();
          records.push({
            id: a.id,
            header: a.client_name || "Consultation Booking",
            sectionType: a.service || "Design Audit",
            status: a.status === "confirmed" ? "Done" : "Pending",
            target: 1,
            limit: 1,
            reviewer: a.client_email,
            category: "appointments",
            createdAt: a.scheduled_at || a.created_at,
            rawDate: d,
          });

          historyLog.push({
            id: `act-appt-${a.id}`,
            title: `Consultation: ${a.service} with ${a.client_name}`,
            category: a.status || "Scheduled",
            timestamp: d.toLocaleDateString(),
            type: "appointment",
            rawDate: d,
          });
        });
      }

      setAllRawRecords(records);
      setAllHistoryLogs(historyLog);

      setDbCounts({
        profiles: (profilesData || []).length,
        clients: (clientsData || []).length,
        works: (worksData || []).length,
        blogs: (blogsData || []).length,
        appointments: (apptsData || []).length,
        reviews: (reviewsData || []).length,
      });
    } catch (err) {
      setDbStatus((prev) => ({ ...prev, connected: false }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Supabase Realtime Postgres Changes Subscription
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-studio-dashboard")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualDbRefresh = async () => {
    setRefreshingDb(true);
    await loadDashboardData();
    setTimeout(() => setRefreshingDb(false), 600);
  };

  // Check if a given date matches selected date under active mode (daily, monthly, yearly)
  const isDateInFilterPeriod = (itemDate?: Date) => {
    if (!itemDate || !selectedDate) return true;
    const target = new Date(selectedDate);
    const item = new Date(itemDate);

    if (dateFilterMode === "daily") {
      return (
        item.getDate() === target.getDate() &&
        item.getMonth() === target.getMonth() &&
        item.getFullYear() === target.getFullYear()
      );
    } else if (dateFilterMode === "monthly") {
      return (
        item.getMonth() === target.getMonth() &&
        item.getFullYear() === target.getFullYear()
      );
    } else if (dateFilterMode === "yearly") {
      return item.getFullYear() === target.getFullYear();
    }
    return true;
  };

  // Period-Filtered Records & Overviews
  const periodFilteredRecords = useMemo(() => {
    return allRawRecords.filter((rec) => isDateInFilterPeriod(rec.rawDate));
  }, [allRawRecords, selectedDate, dateFilterMode]);

  const periodFilteredActivities = useMemo(() => {
    return allHistoryLogs.filter((act) => isDateInFilterPeriod(act.rawDate));
  }, [allHistoryLogs, selectedDate, dateFilterMode]);

  // Recalculated Period Metrics strictly from live database records
  const periodMetrics = useMemo(() => {
    let rev = 0;
    let clientsCount = 0;
    let worksCount = 0;
    let apptsCount = 0;

    periodFilteredRecords.forEach((r) => {
      if (r.category === "clients") {
        clientsCount++;
        rev += r.target * 1000;
      } else if (r.category === "works") {
        worksCount++;
      } else if (r.category === "appointments") {
        apptsCount++;
      }
    });

    return {
      totalRevenue: rev,
      clientsCount: clientsCount,
      worksCount: worksCount,
      apptsCount: apptsCount,
    };
  }, [periodFilteredRecords]);

  // Table Data Filtered by Tab, Search & Calendar Date Period
  const filteredTableRecords = useMemo(() => {
    return periodFilteredRecords.filter((rec) => {
      const matchesTab = rec.category === activeTab;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        rec.header.toLowerCase().includes(q) ||
        rec.sectionType.toLowerCase().includes(q) ||
        (rec.reviewer && rec.reviewer.toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [periodFilteredRecords, activeTab, searchQuery]);

  // Pagination logic
  const pageSize = parseInt(rowsPerPage, 10);
  const totalPages = Math.ceil(filteredTableRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTableRecords.slice(start, start + pageSize);
  }, [filteredTableRecords, currentPage, pageSize]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedRecords.map((r) => r.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const isAllSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedRows.includes(r.id));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <IconLayoutDashboard className="w-6 h-6 text-primary" /> Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Studio Overview & Analytics
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="h-9 px-3.5 gap-2 rounded-xl text-xs font-semibold"
              >
                <IconFilter className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="capitalize">{dateFilterMode} Horizon</span>
                <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuLabel className="text-xs">
                Time Horizon
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={dateFilterMode === "daily"}
                onCheckedChange={() => setDateFilterMode("daily")}
                className="text-xs"
              >
                Daily
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={dateFilterMode === "monthly"}
                onCheckedChange={() => setDateFilterMode("monthly")}
                className="text-xs"
              >
                Monthly
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={dateFilterMode === "yearly"}
                onCheckedChange={() => setDateFilterMode("yearly")}
                className="text-xs"
              >
                Yearly
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="lg"
            onClick={handleManualDbRefresh}
            disabled={refreshingDb}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold"
          >
            <IconRefresh
              className={`w-3.5 h-3.5 text-[#22C55E] ${refreshingDb ? "animate-spin" : ""}`}
            />
            <span>Sync</span>
          </Button>

          <Link
            href="/studio/clients"
            className={buttonVariants({
              size: "lg",
              variant: "default",
              className: "h-9 px-3.5 rounded-xl text-xs font-bold",
            })}
          >
            <IconUsers className="w-3.5 h-3.5" />
            <span>Manage Clients</span>
          </Link>
        </div>
      </div>

      {/* MINIMAL BENTO GRID SECTION - PERIOD FILTERED OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento Card 1: Revenue KPI */}
        <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-3 relative overflow-hidden group hover:border-[#22C55E]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <IconCurrencyDollar className="w-4 h-4 text-[#22C55E]" />
              <span className="capitalize">{dateFilterMode}</span> Revenue
            </span>
            <Badge
              variant="outline"
              className="bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] text-[10px] font-bold"
            >
              <IconTrendingUp className="w-3 h-3 mr-1" /> +14.2%
            </Badge>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {formatAmount(periodMetrics.totalRevenue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
              Filtered for {dateFilterMode} timeline window
            </p>
          </div>
          <div className="absolute right-3 bottom-3 w-16 h-16 rounded-full bg-[#22C55E]/5 filter blur-xl group-hover:bg-[#22C55E]/15 transition-all" />
        </div>

        {/* Bento Card 2: Active Clients */}
        <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <IconUsers className="w-4 h-4 text-purple-400" /> Account
              Touchpoints
            </span>
            <Badge
              variant="outline"
              className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-[10px] font-bold"
            >
              {periodMetrics.clientsCount} Accounts
            </Badge>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {periodMetrics.clientsCount} Accounts
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active client retainers in timeframe
            </p>
          </div>
          <div className="absolute right-3 bottom-3 w-16 h-16 rounded-full bg-purple-500/5 filter blur-xl group-hover:bg-purple-500/15 transition-all" />
        </div>

        {/* Bento Card 3: Works Deliverables */}
        <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <IconBriefcase className="w-4 h-4 text-blue-400" /> Projects
              Completed
            </span>
            <Badge
              variant="outline"
              className="bg-blue-500/10 border-blue-500/30 text-blue-300 text-[10px] font-bold"
            >
              {periodMetrics.worksCount} Works
            </Badge>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {periodMetrics.worksCount} Works
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              3D CGI & SaaS deliverables
            </p>
          </div>
          <div className="absolute right-3 bottom-3 w-16 h-16 rounded-full bg-blue-500/5 filter blur-xl group-hover:bg-blue-500/15 transition-all" />
        </div>

        {/* Bento Card 4: Consultations */}
        <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <IconCalendar className="w-4 h-4 text-amber-400" /> Booked
              Consultations
            </span>
            <Badge
              variant="outline"
              className="bg-amber-500/10 border-amber-500/30 text-amber-300 text-[10px] font-bold"
            >
              {periodMetrics.apptsCount} Scheduled
            </Badge>
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {periodMetrics.apptsCount} Consultations
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Strategy meetings in period
            </p>
          </div>
          <div className="absolute right-3 bottom-3 w-16 h-16 rounded-full bg-amber-500/5 filter blur-xl group-hover:bg-amber-500/15 transition-all" />
        </div>
      </div>

      {/* SECOND ROW: ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers Radial Chart */}
        <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Top customers</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1 rounded-md bg-background border-transparent hover:bg-background/80"
                >
                  Weekly
                  <IconChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Weekly</DropdownMenuItem>
                <DropdownMenuItem>Monthly</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="w-full max-w-[220px] aspect-square relative">
            <ChartContainer
              config={topCustomersConfig}
              className="w-full h-full min-h-[220px]"
            >
              <RadialBarChart
                innerRadius="40%"
                outerRadius="100%"
                barSize={12}
                data={topCustomersData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 800]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: "rgba(0,0,0,0.05)" }}
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ChartContainer>

            {/* Center Label manually positioned */}
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none pb-1">
              <span className="text-3xl font-black text-foreground tracking-tight">
                630k
              </span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="w-full flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: topCustomersConfig.social.color }}
              />
              <span className="text-[11px] font-medium text-foreground">
                Social app
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: topCustomersConfig.web.color }}
              />
              <span className="text-[11px] font-medium text-foreground">
                Web
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: topCustomersConfig.ecommerce.color }}
              />
              <span className="text-[11px] font-medium text-foreground">
                E-commerce
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Last Quarter Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-muted/70 border border-border flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full bg-background border-border text-xs px-3 gap-2"
            >
              <IconTrendingUp className="w-3.5 h-3.5" />
              <span className="font-semibold">Revenue last quarter</span>
            </Button>
            <Avatar className="w-8 h-8 border-2 border-background shadow-sm">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>

          <div>
            <div className="text-4xl font-black tracking-tight text-foreground">
              +350%
            </div>
          </div>

          <div className="w-full h-[180px] mt-4 relative">
            <ChartContainer
              config={revenueConfig}
              className="w-full h-full min-h-[180px]"
            >
              <BarChart
                data={revenueData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                barGap={6}
              >
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  dy={10}
                />
                {/* Remove YAxis, only show labels if needed, or completely hide */}
                <YAxis hide domain={[0, 600]} />
                <Bar dataKey="revenue" radius={[8, 8, 8, 8]} barSize={40}>
                  {revenueData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.highlight
                          ? revenueConfig.revenue.color
                          : "hsl(var(--muted-foreground) / 0.2)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            {/* Optional floating value label for the highlighted bar (just styling trick) */}
            <div className="absolute right-0 top-0 text-[10px] font-bold text-muted-foreground mr-1">
              $5.6 m
            </div>
          </div>
        </div>
      </div>

      {/* THIRD ROW: DATABASE ENGINE OVERVIEW */}
      <div className="w-full">
        <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <IconDatabase className="w-4.5 h-4.5 text-[#22C55E]" /> Supabase
                Database Engine & Configs
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time PostgreSQL engine status, RLS policies, table counts,
                and synchronization settings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]"></span>
              </span>
              <Badge className="bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold px-2.5 py-0.5">
                {dbStatus.connected ? "PostgreSQL Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>

          {/* Database Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-background/70 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium uppercase flex items-center gap-1">
                <IconServer className="w-3 h-3 text-purple-400" /> Project Ref
              </div>
              <div className="text-xs font-mono font-bold text-foreground truncate">
                {dbStatus.projectRef}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/70 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium uppercase flex items-center gap-1">
                <IconActivity className="w-3 h-3 text-[#22C55E]" /> DB Latency
              </div>
              <div className="text-xs font-bold text-foreground">
                {dbStatus.latency}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/70 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium uppercase flex items-center gap-1">
                <IconShieldCheck className="w-3 h-3 text-blue-400" /> RLS
                Security
              </div>
              <div className="text-xs font-bold text-emerald-400">
                14 Active Rules
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background/70 border border-border space-y-1">
              <div className="text-[10px] text-muted-foreground font-medium uppercase flex items-center gap-1">
                <IconPlug className="w-3 h-3 text-amber-400" /> Engine Sync
              </div>
              <div className="text-xs font-bold text-foreground capitalize">
                {autoSyncMode}
              </div>
            </div>
          </div>

          {/* Database Tables Overview Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <IconListCheck className="w-3.5 h-3.5 text-[#22C55E]" />{" "}
                Registered Supabase Database Tables
              </span>
              <span className="text-[10px] text-muted-foreground">
                6 Active Tables
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">
                    public.profiles
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Users & RBAC
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-bold text-xs">
                  {dbCounts.profiles}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">
                    public.clients
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Accounts & CRM
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#22C55E]/10 text-[#22C55E] font-bold text-xs">
                  {dbCounts.clients}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">
                    public.works
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Portfolio Projects
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 font-bold text-xs">
                  {dbCounts.works}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">
                    public.blogs
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Articles & Posts
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold text-xs">
                  {dbCounts.blogs}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">
                    public.appointments
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Booked Meetings
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-bold text-xs">
                  {dbCounts.appointments}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground">
                    public.reviews
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Ratings & Feedback
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-bold text-xs">
                  {dbCounts.reviews}
                </span>
              </div>
            </div>
          </div>

          {/* Engine Configs Selector */}
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Database Sync Protocol:</span>
              <Select
                value={autoSyncMode}
                onValueChange={(val) => val && setAutoSyncMode(val)}
              >
                <SelectTrigger className="h-8 w-44 bg-background border-border text-xs rounded-xl">
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="realtime">Realtime WebSockets</SelectItem>
                  <SelectItem value="5s">5s Polling Interval</SelectItem>
                  <SelectItem value="15s">15s Polling Interval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualDbRefresh}
              className="h-8 text-xs rounded-xl border-border bg-background hover:bg-accent"
            >
              <IconRefresh className="w-3.5 h-3.5 mr-1 text-[#22C55E]" />
              Refresh Table Schemas
            </Button>
          </div>
        </div>
      </div>

      {/* STUDIO RECORDS DATA TABLE SECTION (FILTERED BY HORIZON & SEARCH) */}
      <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-background border border-border w-fit">
            <button
              onClick={() => {
                setActiveTab("works");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "works"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
            >
              <span>Works</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                {
                  periodFilteredRecords.filter((r) => r.category === "works")
                    .length
                }
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("blogs");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "blogs"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
            >
              <span>Blogs</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                {
                  periodFilteredRecords.filter((r) => r.category === "blogs")
                    .length
                }
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("clients");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "clients"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
            >
              <span>Clients</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                {
                  periodFilteredRecords.filter((r) => r.category === "clients")
                    .length
                }
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("appointments");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "appointments"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
            >
              <span>Consultations</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {
                  periodFilteredRecords.filter(
                    (r) => r.category === "appointments",
                  ).length
                }
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-52">
              <IconSearch className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search studio records..."
                className="h-9 pl-9 pr-3 rounded-full bg-background border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#22C55E]"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 px-3.5 rounded-full bg-background border border-border text-xs font-semibold text-foreground hover:bg-accent flex items-center gap-2 transition-all">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize Columns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-muted border-border text-foreground text-xs rounded-xl w-44"
              >
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.header}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, header: !!v }))
                  }
                >
                  Header / Title
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.sectionType}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, sectionType: !!v }))
                  }
                >
                  Category / Company
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, status: !!v }))
                  }
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.reviewer}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, reviewer: !!v }))
                  }
                >
                  Client / Lead
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-muted/80 border-b border-border">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 p-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                </TableHead>

                {visibleColumns.header && (
                  <TableHead className="text-foreground font-extrabold text-xs">
                    Record Header
                  </TableHead>
                )}
                {visibleColumns.sectionType && (
                  <TableHead className="text-foreground font-extrabold text-xs">
                    Category / Company
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-foreground font-extrabold text-xs">
                    Status
                  </TableHead>
                )}
                {visibleColumns.reviewer && (
                  <TableHead className="text-foreground font-extrabold text-xs">
                    Lead / Reviewer
                  </TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    <IconLoader2 className="w-5 h-5 animate-spin mx-auto text-[#22C55E] mb-2" />
                    Loading Supabase records...
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    No records found matching current period ({dateFilterMode})
                    and search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((rec) => {
                  const isSelected = selectedRows.includes(rec.id);
                  return (
                    <TableRow
                      key={rec.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${
                        isSelected ? "bg-muted/70" : ""
                      }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(rec.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {visibleColumns.header && (
                        <TableCell className="p-3 text-xs font-bold text-foreground">
                          {rec.header}
                        </TableCell>
                      )}

                      {visibleColumns.sectionType && (
                        <TableCell className="p-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
                            {rec.sectionType}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {rec.status === "Done" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                              <span>Done</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300">
                              <IconClock className="w-3.5 h-3.5 text-purple-400" />
                              <span>{rec.status}</span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.reviewer && (
                        <TableCell className="p-3 text-xs text-muted-foreground font-mono">
                          {rec.reviewer || "Studio Team"}
                        </TableCell>
                      )}

                      <TableCell className="w-12 text-right p-3">
                        <Link
                          href={
                            rec.category === "clients"
                              ? `/studio/clients/${rec.id}`
                              : `/studio/${rec.category}`
                          }
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted inline-block transition-colors"
                        >
                          <IconExternalLink className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
          <div>
            {selectedRows.length} of {filteredTableRecords.length} row(s)
            selected.
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={rowsPerPage}
                onValueChange={(val) => val && setRowsPerPage(val)}
              >
                <SelectTrigger className="h-8 w-16 bg-background border-border text-xs rounded-xl">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <IconChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
