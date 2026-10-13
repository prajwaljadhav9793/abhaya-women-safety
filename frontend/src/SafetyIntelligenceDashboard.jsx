import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Filter,
  RotateCcw,
  Calendar,
  Flame,
  Eye,
  Navigation,
  Layers,
  Compass,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  PhoneCall,
  Activity,
  Check,
  X,
  FileText,
  Building2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Shield,
  Radio,
  FileCheck2,
  Download
} from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Circle } from "react-leaflet";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { api, useLoad } from "./api.js";
import { useAuth } from "./context/AuthContext.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

// Map bounds auto-fit helper
const FitMapBounds = ({ pins }) => {
  const map = useMap();
  useEffect(() => {
    if (pins && pins.length > 0) {
      const validPoints = pins.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
      if (validPoints.length > 0) {
        map.fitBounds(validPoints, { padding: [35, 35], maxZoom: 15 });
      }
    }
  }, [pins, map]);
  return null;
};

// Default Kolhapur Center
const KOLHAPUR_CENTER = [16.705, 74.243];

// Category color palette
const CATEGORY_COLORS = {
  "Harassment": "#FB7185",               // Coral red
  "Stalking": "#F43F5E",                 // Rose
  "Unsafe street or area": "#FBBF24",    // Amber
  "Poor lighting": "#A78BFA",            // Violet
  "Suspicious activity": "#60A5FA",      // Electric blue
  "Transport-related concern": "#2DD4BF",// Teal
  "Other safety concern": "#94A3B8"      // Slate
};

export default function SafetyIntelligenceDashboard() {
  const { user } = useAuth();

  // Primary View Mode: "simple" (Simple Reports Analytics) vs "detailed" (Advanced Map & Deep Dive)
  const [viewMode, setViewMode] = useState("simple");

  // Active filter states (Default to "all" to retrieve full real-time abhaya.db records)
  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("all");

  // Simple reports feed search & status filter
  const [reportSearch, setReportSearch] = useState("");
  const [feedStatusFilter, setFeedStatusFilter] = useState("all");

  // Map view mode: "markers" or "heatmap"
  const [mapMode, setMapMode] = useState("markers");

  // Construct query string based on filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange === "custom") {
      params.set("range", "custom");
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    } else {
      params.set("range", dateRange);
    }
    if (selectedArea !== "all") params.set("area", selectedArea);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedStatus !== "all") params.set("status", selectedStatus);
    if (selectedTimeOfDay !== "all") params.set("time_of_day", selectedTimeOfDay);
    return params.toString();
  }, [dateRange, customFrom, customTo, selectedArea, selectedCategory, selectedStatus, selectedTimeOfDay]);

  // Load analytics payload from backend
  const { data, err, loading, reload } = useLoad("/analytics?" + queryString, [queryString]);
  const [lastFetchedAt, setLastFetchedAt] = useState(() => new Date().toLocaleTimeString());

  // Automatic periodic refresh every 15 seconds (real database telemetry)
  useEffect(() => {
    const timer = setInterval(() => {
      reload();
    }, 15000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (data) {
      setLastFetchedAt(new Date().toLocaleTimeString());
    }
  }, [data]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
    setSelectedArea("all");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedTimeOfDay("all");
    setReportSearch("");
    setFeedStatusFilter("all");
  };

  const hasActiveFilters = dateRange !== "all" || selectedArea !== "all" || selectedCategory !== "all" || selectedStatus !== "all" || selectedTimeOfDay !== "all";

  // Filter chips list
  const activeChips = useMemo(() => {
    const chips = [];
    if (dateRange !== "all") {
      chips.push({ key: "range", label: `Date: ${dateRange.toUpperCase()}`, onRemove: () => setDateRange("all") });
    }
    if (selectedArea !== "all") {
      chips.push({ key: "area", label: `Area: ${selectedArea}`, onRemove: () => setSelectedArea("all") });
    }
    if (selectedCategory !== "all") {
      chips.push({ key: "category", label: `Category: ${selectedCategory}`, onRemove: () => setSelectedCategory("all") });
    }
    if (selectedStatus !== "all") {
      chips.push({ key: "status", label: `Status: ${selectedStatus}`, onRemove: () => setSelectedStatus("all") });
    }
    if (selectedTimeOfDay !== "all") {
      chips.push({ key: "tod", label: `Time: ${selectedTimeOfDay}`, onRemove: () => setSelectedTimeOfDay("all") });
    }
    return chips;
  }, [dateRange, selectedArea, selectedCategory, selectedStatus, selectedTimeOfDay]);

  // -------------------------------------------------------------------------
  // CHART DATA BUILDERS
  // -------------------------------------------------------------------------

  // 1. Time Series Chart Data (Incident Reports Over Time)
  const lineChartData = useMemo(() => {
    if (!data?.trends || data.trends.length === 0) return null;
    const labels = data.trends.map(t => t.label || t.period);
    const totalData = data.trends.map(t => t.total);
    const verifiedData = data.trends.map(t => t.verified);
    const pendingData = data.trends.map(t => t.pending);

    return {
      labels,
      datasets: [
        {
          label: "Total Reports",
          data: totalData,
          borderColor: "#60A5FA",
          backgroundColor: "rgba(96, 165, 250, 0.15)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#60A5FA"
        },
        {
          label: "Verified Hazards",
          data: verifiedData,
          borderColor: "#34D399",
          backgroundColor: "transparent",
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          pointBackgroundColor: "#34D399"
        },
        {
          label: "Pending Review",
          data: pendingData,
          borderColor: "#FBBF24",
          backgroundColor: "transparent",
          borderDash: [4, 4],
          tension: 0.35,
          borderWidth: 1.8,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#FBBF24"
        }
      ]
    };
  }, [data?.trends]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#A5B4CC", font: { size: 11, family: "inherit" }, usePointStyle: true, boxWidth: 6 }
      },
      tooltip: {
        backgroundColor: "#131C30",
        titleColor: "#F8FAFC",
        bodyColor: "#A5B4CC",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#64748B", font: { size: 10 }, maxRotation: 45 }
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#64748B", font: { size: 10 }, stepSize: 1 },
        beginAtZero: true
      }
    }
  };

  // 2. Category Doughnut Chart Data
  const doughnutData = useMemo(() => {
    if (!data?.categories || data.categories.length === 0) return null;
    return {
      labels: data.categories.map(c => c.category),
      datasets: [
        {
          data: data.categories.map(c => c.count),
          backgroundColor: data.categories.map(c => c.color || CATEGORY_COLORS[c.category] || "#60A5FA"),
          borderColor: "#131C30",
          borderWidth: 3,
          hoverOffset: 6
        }
      ]
    };
  }, [data?.categories]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#131C30",
        titleColor: "#F8FAFC",
        bodyColor: "#A5B4CC",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        callbacks: {
          label: context => {
            const item = data?.categories?.[context.dataIndex];
            return ` ${item?.count || 0} reports (${item?.percentage || 0}%)`;
          }
        }
      }
    },
    onClick: (_, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const clickedCat = data?.categories?.[index]?.category;
        if (clickedCat) {
          setSelectedCategory(prev => (prev === clickedCat ? "all" : clickedCat));
        }
      }
    }
  };

  // 3. Reports by Area (Horizontal Bar Chart)
  const areaBarData = useMemo(() => {
    if (!data?.areas || data.areas.length === 0) return null;
    return {
      labels: data.areas.map(a => a.area),
      datasets: [
        {
          label: "Verified",
          data: data.areas.map(a => a.verified),
          backgroundColor: "#34D399",
          borderRadius: 4
        },
        {
          label: "Pending",
          data: data.areas.map(a => a.pending),
          backgroundColor: "#FBBF24",
          borderRadius: 4
        }
      ]
    };
  }, [data?.areas]);

  const areaBarOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#A5B4CC", font: { size: 10, family: "inherit" }, usePointStyle: true, boxWidth: 6 }
      },
      tooltip: {
        backgroundColor: "#131C30",
        titleColor: "#F8FAFC",
        bodyColor: "#A5B4CC",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#64748B", font: { size: 10 }, stepSize: 1 },
        beginAtZero: true
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { color: "#E2E8F0", font: { size: 11 } }
      }
    },
    onClick: (_, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const clickedArea = data?.areas?.[index]?.area;
        if (clickedArea) {
          setSelectedArea(prev => (prev === clickedArea ? "all" : clickedArea));
        }
      }
    }
  };

  // 4. Time of Day Hourly Bar Chart
  const timeBarData = useMemo(() => {
    if (!data?.time_of_day?.hourly) return null;
    return {
      labels: data.time_of_day.hourly.map(h => h.label),
      datasets: [
        {
          label: "Reports",
          data: data.time_of_day.hourly.map(h => h.count),
          backgroundColor: data.time_of_day.hourly.map(h => (h.count > 0 ? "#60A5FA" : "rgba(255,255,255,0.06)")),
          hoverBackgroundColor: "#38BDF8",
          borderRadius: 4
        }
      ]
    };
  }, [data?.time_of_day?.hourly]);

  const timeBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#131C30",
        titleColor: "#F8FAFC",
        bodyColor: "#A5B4CC",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748B", font: { size: 9 }, maxRotation: 45 }
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#64748B", font: { size: 10 }, stepSize: 1 },
        beginAtZero: true
      }
    }
  };

  // Filtered recent reports for the simple live feed
  const filteredRecentReports = useMemo(() => {
    if (!data?.recent_reports) return [];
    return data.recent_reports.filter(r => {
      const q = reportSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.location_label && r.location_label.toLowerCase().includes(q)) ||
        (r.police_station && r.police_station.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q));
      const matchStatus = feedStatusFilter === "all" || r.status === feedStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [data?.recent_reports, reportSearch, feedStatusFilter]);

  const summary = data?.summary || {
    total_reports: 0,
    verified_reports: 0,
    verification_rate: 0,
    pending_reviews: 0,
    prev_period_change_pct: null,
    total_journeys: 0,
    journey_completion_rate: 0
  };

  return (
    <div style={{ padding: "18px 24px", minHeight: "100vh", background: "#0B1020", color: "#F8FAFC" }}>
      {/* ------------------------------------------------------------------- */}
      {/* TOP HEADER & BREADCRUMB                                             */}
      {/* ------------------------------------------------------------------- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#60A5FA", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 4 }}>
            <span>Dashboard</span>
            <ChevronRight size={13} />
            <span style={{ color: "#F8FAFC" }}>Safety Intelligence</span>
            <span className="badge" style={{ background: "rgba(96, 165, 250, 0.15)", color: "#60A5FA", border: "1px solid rgba(96, 165, 250, 0.3)", fontSize: "0.68rem", marginLeft: 4 }}>
              MODULE 07
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart3 size={28} className="text-cyan" style={{ color: "#60A5FA" }} />
            Safety Intelligence Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", color: "#A5B4CC", fontSize: "0.88rem" }}>
            Real-time hazard patterns, Kolhapur jurisdiction mapping & incident reports analytics &bull; <i style={{ color: "#94A3B8" }}>ABHAYA: Protect. Prevent. Empower.</i>
          </p>
        </div>

        {/* Refresh & Live Updated Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.72rem", color: "#34D399", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", boxShadow: "0 0 8px #10B981" }}></span>
              Live Sync (15s)
            </div>
            <div style={{ fontSize: "0.82rem", color: "#A5B4CC", display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", fontWeight: 500 }}>
              Updated: {lastFetchedAt}
            </div>
          </div>
          <button
            onClick={() => reload()}
            disabled={loading}
            className="btn ghost sm"
            title="Fetch latest analytics from database"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#F8FAFC", borderRadius: 8, padding: "7px 14px", fontWeight: 600 }}
          >
            <RotateCcw size={14} className={loading ? "spin" : ""} />
            {loading ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODE SWITCHER & QUICK DATE CONTROLS                                 */}
      {/* ------------------------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          background: "#131C30",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          padding: "10px 16px"
        }}
      >
        {/* View Switcher: Simple Reports Analytics vs Advanced Deep Dive */}
        <div style={{ display: "inline-flex", background: "#0B1020", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 3 }}>
          <button
            onClick={() => setViewMode("simple")}
            className="btn sm"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: "0.84rem",
              fontWeight: 700,
              background: viewMode === "simple" ? "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" : "transparent",
              color: viewMode === "simple" ? "#FFFFFF" : "#A5B4CC",
              border: "none",
              boxShadow: viewMode === "simple" ? "0 2px 10px rgba(59, 130, 246, 0.4)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            <BarChart3 size={15} />
            Simple Reports Analytics
          </button>
          <button
            onClick={() => setViewMode("detailed")}
            className="btn sm"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: "0.84rem",
              fontWeight: 700,
              background: viewMode === "detailed" ? "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)" : "transparent",
              color: viewMode === "detailed" ? "#FFFFFF" : "#A5B4CC",
              border: "none",
              boxShadow: viewMode === "detailed" ? "0 2px 10px rgba(139, 92, 246, 0.4)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            <MapPin size={15} />
            Detailed Map & Telemetry
          </button>
        </div>

        {/* Live sync pill & Date range quick pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.28)",
              color: "#34D399",
              borderRadius: 20,
              padding: "5px 12px",
              fontSize: "0.78rem",
              fontWeight: 700
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" }}></span>
            <span>Live ABHAYA Data Sync &bull; {summary.total_reports} Records Synced</span>
          </div>

          {/* Quick Date Pills */}
          <div style={{ display: "flex", background: "#0B1020", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 2, gap: 2 }}>
            {[
              ["all", "All Time"],
              ["90d", "90D"],
              ["30d", "30D"],
              ["7d", "7D"],
              ["today", "Today"]
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDateRange(val)}
                className="btn sm"
                style={{
                  fontSize: "0.74rem",
                  padding: "4px 9px",
                  borderRadius: 6,
                  background: dateRange === val ? "#60A5FA" : "transparent",
                  color: dateRange === val ? "#0B1020" : "#A5B4CC",
                  border: "none",
                  fontWeight: dateRange === val ? 700 : 500
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4 SUMMARY KPI CARDS                                                 */}
      {/* ------------------------------------------------------------------- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        {/* KPI 1: Total Reports */}
        <div
          style={{
            background: "#131C30",
            border: "1px solid rgba(96, 165, 250, 0.25)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#A5B4CC", fontSize: "0.82rem", fontWeight: 600 }}>Total Incident Reports</span>
            <div style={{ background: "rgba(96, 165, 250, 0.15)", color: "#60A5FA", padding: 6, borderRadius: 8 }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "#F8FAFC", lineHeight: 1.1 }}>
            {summary.total_reports}
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
            {summary.prev_period_change_pct !== null && summary.prev_period_change_pct !== undefined ? (
              <>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    color: summary.trend_direction === "down" ? "#34D399" : summary.trend_direction === "up" ? "#FB7185" : "#A5B4CC",
                    fontWeight: 700
                  }}
                >
                  {summary.trend_direction === "down" ? <TrendingDown size={14} /> : summary.trend_direction === "up" ? <TrendingUp size={14} /> : null}
                  {summary.prev_period_change_pct > 0 ? `+${summary.prev_period_change_pct}%` : `${summary.prev_period_change_pct}%`}
                </span>
                <span style={{ color: "#64748B" }}>vs previous period</span>
              </>
            ) : (
              <span style={{ color: "#34D399", fontWeight: 600 }}>● 100% database records</span>
            )}
          </div>
        </div>

        {/* KPI 2: Verified Reports */}
        <div
          style={{
            background: "#131C30",
            border: "1px solid rgba(52, 211, 153, 0.25)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#A5B4CC", fontSize: "0.82rem", fontWeight: 600 }}>Verified Hazards</span>
            <div style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34D399", padding: 6, borderRadius: 8 }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "#34D399", lineHeight: 1.1 }}>
            {summary.verified_reports}
          </div>
          <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#A5B4CC" }}>
            <b style={{ color: "#34D399" }}>{summary.verification_rate}%</b> of reports verified by moderators
          </div>
        </div>

        {/* KPI 3: Pending Reviews */}
        <div
          style={{
            background: "#131C30",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#A5B4CC", fontSize: "0.82rem", fontWeight: 600 }}>Under Review</span>
            <div style={{ background: "rgba(251, 191, 36, 0.15)", color: "#FBBF24", padding: 6, borderRadius: 8 }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "#FBBF24", lineHeight: 1.1 }}>
            {summary.pending_reviews}
          </div>
          <div style={{ marginTop: 8, fontSize: "0.78rem" }}>
            <Link to="/reports" style={{ color: "#FBBF24", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Open Moderation Queue &rarr;
            </Link>
          </div>
        </div>

        {/* KPI 4: Police Jurisdictions & Coverage */}
        <div
          style={{
            background: "#131C30",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#A5B4CC", fontSize: "0.82rem", fontWeight: 600 }}>Police Jurisdictions</span>
            <div style={{ background: "rgba(139, 92, 246, 0.15)", color: "#A78BFA", padding: 6, borderRadius: 8 }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "#A78BFA", lineHeight: 1.1 }}>
            8 Stations
          </div>
          <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#A5B4CC" }}>
            Kolhapur Police Control Room &amp; 112 Active
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW MODE 1: SIMPLE REPORTS ANALYTICS (CLEAN, DIRECT & UNCLUTTERED) */}
      {/* =================================================================== */}
      {viewMode === "simple" && (
        <>
          {/* ROW 1: Real-Time Incident Reporting Trend + Categories Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20, marginBottom: 20 }}>
            {/* Chart 1: Time Series Growth Curve (Line Chart) */}
            <div
              style={{
                gridColumn: "span 7",
                background: "#131C30",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={18} style={{ color: "#60A5FA" }} />
                    Incident Reporting Trends Over Time
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#A5B4CC" }}>
                    Live reporting volume from database &bull; Monthly growth progression
                  </p>
                </div>
                <span className="badge" style={{ background: "rgba(52, 211, 153, 0.15)", color: "#34D399", fontSize: "0.72rem" }}>
                  Real-Time Database Feed
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 280 }}>
                {summary.total_reports > 0 && lineChartData ? (
                  <Line data={lineChartData} options={lineChartOptions} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 280, color: "#64748B", gap: 12 }}>
                    <TrendingUp size={28} />
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#94A3B8" }}>No incident reports found for this range.</div>
                    <button onClick={handleResetFilters} className="btn primary sm" style={{ fontSize: "0.8rem" }}>
                      Reset to All Time
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Hazard Categories Breakdown (Doughnut + Bars) */}
            <div
              style={{
                gridColumn: "span 5",
                background: "#131C30",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                    <Layers size={18} style={{ color: "#A78BFA" }} />
                    Hazard Category Breakdown
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#A5B4CC" }}>
                    Distribution of reported safety hazards ({summary.total_reports} total)
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
                <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
                  {summary.total_reports > 0 && doughnutData ? (
                    <>
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          textAlign: "center",
                          pointerEvents: "none"
                        }}
                      >
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#F8FAFC" }}>
                          {summary.total_reports}
                        </div>
                        <div style={{ fontSize: "0.62rem", color: "#64748B", textTransform: "uppercase" }}>
                          Total
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>
                      <Layers size={24} />
                    </div>
                  )}
                </div>

                {/* Top 3 categories quick summary pills */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {(data?.categories || []).slice(0, 3).map(cat => (
                    <div
                      key={cat.category}
                      style={{
                        background: "#19253D",
                        borderRadius: 8,
                        padding: "6px 10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }}></span>
                        <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{cat.category}</span>
                      </div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#60A5FA" }}>
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress bars for all categories */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {(data?.categories || []).map(cat => (
                  <div key={cat.category}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 3 }}>
                      <span style={{ color: "#CBD5E1", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat.color }}></span>
                        {cat.category}
                      </span>
                      <span style={{ color: "#A5B4CC", fontWeight: 600 }}>
                        <b>{cat.count}</b> ({cat.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${cat.percentage}%`,
                          height: "100%",
                          background: cat.color,
                          borderRadius: 3,
                          transition: "width 0.4s ease"
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 2: Top Kolhapur Hotspots + Risk Time Window */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20, marginBottom: 20 }}>
            {/* Top Kolhapur Hotspots Horizontal Bar */}
            <div
              style={{
                gridColumn: "span 6",
                background: "#131C30",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPin size={18} style={{ color: "#38BDF8" }} />
                    Top Hotspot Localities in Kolhapur
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#A5B4CC" }}>
                    Ranked by report concentration &bull; Verified vs Pending status
                  </p>
                </div>
                <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", fontSize: "0.72rem" }}>
                  Top Localities
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 250 }}>
                {summary.total_reports > 0 && areaBarData ? (
                  <Bar data={areaBarData} options={areaBarOptions} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748B", gap: 10 }}>
                    <MapPin size={22} />
                    <div style={{ fontSize: "0.9rem" }}>No hotspot data available.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Time of Day Risk Breakdown */}
            <div
              style={{
                gridColumn: "span 6",
                background: "#131C30",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={18} style={{ color: "#FBBF24" }} />
                    Risk Window &amp; Time of Day Analysis
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#A5B4CC" }}>
                    Understand when safety incidents are reported most frequently
                  </p>
                </div>
              </div>

              {/* Peak Window Highlight Banner */}
              <div
                style={{
                  background: "rgba(251, 191, 36, 0.1)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: "rgba(251, 191, 36, 0.2)", color: "#FBBF24", padding: 8, borderRadius: 8 }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.74rem", color: "#A5B4CC", textTransform: "uppercase", fontWeight: 600 }}>
                      Peak Reporting Window
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FBBF24" }}>
                      {data?.time_of_day?.peak_interval || "Night (21:00 - 06:00)"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Peak Hour</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#F8FAFC" }}>
                    {data?.time_of_day?.peak_hour_label || "10 PM"}
                  </div>
                </div>
              </div>

              {/* 4 Time of Day Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, flex: 1 }}>
                {(data?.time_of_day?.intervals || []).map(inv => {
                  const isNight = inv.interval.includes("Night");
                  const isEvening = inv.interval.includes("Evening");
                  const cardColor = isNight ? "#FB7185" : isEvening ? "#FBBF24" : "#60A5FA";

                  return (
                    <div
                      key={inv.interval}
                      style={{
                        background: "#19253D",
                        borderRadius: 10,
                        padding: "12px 14px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ fontSize: "0.76rem", color: "#A5B4CC", fontWeight: 500 }}>
                        {inv.interval}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: cardColor }}>
                          {inv.count}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "#CBD5E1", fontWeight: 700 }}>
                          {inv.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ROW 3: Simple Live Reports Feed & Assigned Police Stations */}
          <div
            style={{
              background: "#131C30",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={20} style={{ color: "#60A5FA" }} />
                  Live Incident Reports Feed &amp; Assigned Police Stations
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#A5B4CC" }}>
                  Real-time database feed of reported hazards with assigned Kolhapur jurisdictional police stations
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  ["all", "All Reports"],
                  ["verified", "Verified Only"],
                  ["pending", "Pending Review"]
                ].map(([stVal, stLabel]) => (
                  <button
                    key={stVal}
                    onClick={() => setFeedStatusFilter(stVal)}
                    className="btn sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: feedStatusFilter === stVal ? "#60A5FA" : "#19253D",
                      color: feedStatusFilter === stVal ? "#0B1020" : "#A5B4CC",
                      border: `1px solid ${feedStatusFilter === stVal ? "#60A5FA" : "rgba(255,255,255,0.08)"}`,
                      fontWeight: feedStatusFilter === stVal ? 700 : 500
                    }}
                  >
                    {stLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick search input */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
              <input
                type="text"
                placeholder="Filter reports by area, category, or police station name..."
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "#19253D",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "9px 12px 9px 36px",
                  color: "#F8FAFC",
                  fontSize: "0.84rem"
                }}
              />
            </div>

            {/* Reports List Table / Responsive Cards */}
            {filteredRecentReports.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredRecentReports.map(rep => {
                  const catColor = CATEGORY_COLORS[rep.category] || "#60A5FA";
                  const isVerified = rep.status === "verified";
                  const isPending = rep.status === "pending" || rep.status === "under_review";
                  const sevLabel = rep.severity === 3 ? "High" : rep.severity === 2 ? "Medium" : "Low";
                  const sevColor = rep.severity === 3 ? "#FB7185" : rep.severity === 2 ? "#FBBF24" : "#34D399";

                  return (
                    <div
                      key={rep.id}
                      style={{
                        background: "#19253D",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        transition: "border-color 0.2s ease"
                      }}
                    >
                      {/* Left: ID & Category & Location */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 260, flex: 2 }}>
                        <div
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            padding: "6px 9px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#A5B4CC"
                          }}
                        >
                          #{rep.id}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: `${catColor}20`,
                                color: catColor,
                                border: `1px solid ${catColor}40`,
                                padding: "2px 8px",
                                borderRadius: 6
                              }}
                            >
                              {rep.category}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: sevColor, fontWeight: 700 }}>
                              ● {sevLabel} Severity
                            </span>
                          </div>
                          <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 5 }}>
                            <MapPin size={13} style={{ color: "#38BDF8", flexShrink: 0 }} />
                            {rep.location_label}
                          </div>
                          {rep.description && (
                            <div style={{ fontSize: "0.76rem", color: "#94A3B8", marginTop: 2, maxWidth: 450 }}>
                              {rep.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Assigned Police Station */}
                      <div
                        style={{
                          background: "rgba(96, 165, 250, 0.08)",
                          border: "1px solid rgba(96, 165, 250, 0.22)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          minWidth: 220,
                          flex: 1
                        }}
                      >
                        <div style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                          <Building2 size={12} style={{ color: "#60A5FA" }} />
                          Jurisdictional Police Station:
                        </div>
                        <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#60A5FA", marginTop: 2 }}>
                          {rep.police_station || "Kolhapur Central Police Desk"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <a
                            href={`tel:${rep.police_station_phone || "112"}`}
                            style={{
                              fontSize: "0.72rem",
                              color: "#34D399",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontWeight: 600,
                              textDecoration: "none"
                            }}
                          >
                            <PhoneCall size={11} /> {rep.police_station_phone || "112 Emergency"}
                          </a>
                        </div>
                      </div>

                      {/* Right: Status badge & Date */}
                      <div style={{ textAlign: "right", minWidth: 140 }}>
                        <div style={{ marginBottom: 4 }}>
                          {isVerified ? (
                            <span
                              style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#34D399",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "rgba(251, 191, 36, 0.15)",
                                color: "#FBBF24",
                                border: "1px solid rgba(251, 191, 36, 0.3)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}
                            >
                              <Clock size={12} /> Under Review
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
                          {rep.incident_time ? new Date(rep.incident_time).toLocaleDateString() : "Recent"}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Link
                            to="/reports"
                            style={{
                              fontSize: "0.72rem",
                              color: "#60A5FA",
                              textDecoration: "underline"
                            }}
                          >
                            View in queue &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748B" }}>
                <Search size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#94A3B8" }}>No matching reports found.</div>
                <div style={{ fontSize: "0.8rem" }}>Try clearing search keywords or adjusting the filter.</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* VIEW MODE 2: DETAILED MAP & ADVANCED TELEMETRY                      */}
      {/* =================================================================== */}
      {viewMode === "detailed" && (
        <>
          {/* Detailed Filters Bar */}
          <div
            style={{
              background: "#131C30",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 20,
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: activeChips.length > 0 ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#60A5FA", fontWeight: 700, fontSize: "0.85rem" }}>
                <Filter size={16} /> Advanced Telemetry Filters:
              </div>

              {/* Quick Date Range Pills */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  ["today", "Today"],
                  ["7d", "7 Days"],
                  ["30d", "30 Days"],
                  ["90d", "90 Days"],
                  ["all", "All Time"]
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDateRange(val)}
                    className="btn sm"
                    style={{
                      fontSize: "0.78rem",
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: dateRange === val ? "#60A5FA" : "rgba(255,255,255,0.04)",
                      color: dateRange === val ? "#0B1020" : "#A5B4CC",
                      border: `1px solid ${dateRange === val ? "#60A5FA" : "rgba(255,255,255,0.08)"}`,
                      fontWeight: dateRange === val ? 700 : 500
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 10 }}>
              {/* Area Filter */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "#64748B", display: "block", marginBottom: 4 }}>
                  📍 Geographic Area:
                </label>
                <select
                  value={selectedArea}
                  onChange={e => setSelectedArea(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#19253D",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#F8FAFC",
                    fontSize: "0.82rem"
                  }}
                >
                  <option value="all">All Kolhapur Areas</option>
                  {(data?.metadata?.available_areas || []).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "#64748B", display: "block", marginBottom: 4 }}>
                  🎯 Incident Category:
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#19253D",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#F8FAFC",
                    fontSize: "0.82rem"
                  }}
                >
                  <option value="all">All Categories</option>
                  {(data?.metadata?.available_categories || []).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "#64748B", display: "block", marginBottom: 4 }}>
                  🛡️ Verification Status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#19253D",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#F8FAFC",
                    fontSize: "0.82rem"
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified Only</option>
                  <option value="pending">Under Review / Pending</option>
                  <option value="rejected">Rejected Only</option>
                </select>
              </div>

              {/* Time of Day Filter */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "#64748B", display: "block", marginBottom: 4 }}>
                  🕒 Time of Day:
                </label>
                <select
                  value={selectedTimeOfDay}
                  onChange={e => setSelectedTimeOfDay(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#19253D",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#F8FAFC",
                    fontSize: "0.82rem"
                  }}
                >
                  <option value="all">All Hours</option>
                  <option value="morning">Morning (06:00 - 12:00)</option>
                  <option value="afternoon">Afternoon (12:00 - 17:00)</option>
                  <option value="evening">Evening (17:00 - 21:00)</option>
                  <option value="night">Night (21:00 - 06:00)</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "0.74rem", color: "#64748B", fontWeight: 600 }}>Active Filters:</span>
                {activeChips.map(chip => (
                  <span
                    key={chip.key}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(96, 165, 250, 0.15)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                      color: "#60A5FA",
                      fontSize: "0.75rem",
                      padding: "3px 8px",
                      borderRadius: 6
                    }}
                  >
                    {chip.label}
                    <X size={12} style={{ cursor: "pointer" }} onClick={chip.onRemove} />
                  </span>
                ))}
                <button
                  onClick={handleResetFilters}
                  className="btn ghost sm"
                  style={{ fontSize: "0.72rem", color: "#FB7185", padding: "2px 8px" }}
                >
                  Reset All
                </button>
              </div>
            )}
          </div>

          {/* Interactive Geographic Map */}
          <div
            style={{
              background: "#131C30",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={20} style={{ color: "#38BDF8" }} />
                  Geographic Safety Intelligence Map
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#A5B4CC" }}>
                  Aggregated incident report locations in Kolhapur &bull; Coordinates rounded for privacy preservation
                </p>
              </div>

              {/* Map Mode Controls & Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", background: "#19253D", padding: 3, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={() => setMapMode("markers")}
                    className="btn sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: mapMode === "markers" ? "#60A5FA" : "transparent",
                      color: mapMode === "markers" ? "#0B1020" : "#A5B4CC",
                      fontWeight: 700
                    }}
                  >
                    📍 Markers ({data?.map_pins?.length || 0})
                  </button>
                  <button
                    onClick={() => setMapMode("heatmap")}
                    className="btn sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: mapMode === "heatmap" ? "#F59E0B" : "transparent",
                      color: mapMode === "heatmap" ? "#0B1020" : "#A5B4CC",
                      fontWeight: 700
                    }}
                  >
                    🔥 Density Hotspots ({data?.hotspots?.length || 0})
                  </button>
                </div>

                {/* Pin color legend */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: "#94A3B8" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399" }}></span> Verified
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FBBF24" }}></span> Pending
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FB7185" }}></span> High Severity
                  </span>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div style={{ height: 420, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
              <MapContainer
                center={KOLHAPUR_CENTER}
                zoom={13}
                style={{ height: "100%", width: "100%", background: "#0B1020" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitMapBounds pins={data?.map_pins} />

                {/* Markers Mode */}
                {mapMode === "markers" && (data?.map_pins || []).map(pin => {
                  const isHighSev = pin.severity === 3;
                  const isVerified = pin.status === "verified";
                  const pinColor = isHighSev ? "#FB7185" : isVerified ? "#34D399" : "#FBBF24";

                  return (
                    <CircleMarker
                      key={pin.id}
                      center={[pin.lat, pin.lng]}
                      radius={isHighSev ? 8 : 6}
                      pathOptions={{
                        color: pinColor,
                        fillColor: pinColor,
                        fillOpacity: 0.75,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div style={{ color: "#0B1020", minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2 }}>
                            {pin.category}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#475569", marginBottom: 4 }}>
                            📍 {pin.location_label}
                          </div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                background: isVerified ? "#10B981" : "#F59E0B",
                                color: "#fff",
                                padding: "1px 6px",
                                borderRadius: 4
                              }}
                            >
                              {pin.status?.toUpperCase()}
                            </span>
                            <span style={{ fontSize: "0.7rem", color: "#64748B" }}>
                              Severity: {pin.severity}/3
                            </span>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                            📅 {new Date(pin.incident_time).toLocaleDateString()}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {/* Density Hotspot Mode */}
                {mapMode === "heatmap" && (data?.hotspots || []).map((h, idx) => (
                  <Circle
                    key={idx}
                    center={[h.lat, h.lng]}
                    radius={h.radius * 20}
                    pathOptions={{
                      color: "#EF4444",
                      fillColor: "#F59E0B",
                      fillOpacity: 0.35,
                      weight: 1.5
                    }}
                  >
                    <Popup>
                      <div style={{ color: "#0B1020", fontSize: "0.85rem", fontWeight: 700 }}>
                        🔥 Incident Cluster
                        <div style={{ fontSize: "0.75rem", fontWeight: "normal", color: "#475569" }}>
                          {h.count} reports clustered in this ~400m corridor.
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* 24-Hour Timeline Bar Chart & Moderation Outcomes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20, marginBottom: 20 }}>
            {/* 24-Hour Timeline */}
            <div style={{ gridColumn: "span 7", background: "#131C30", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} style={{ color: "#60A5FA" }} />
                24-Hour Hourly Incident Distribution
              </h3>
              <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#A5B4CC" }}>
                Concentration of incident reports across 24 hourly buckets
              </p>
              <div style={{ height: 180 }}>
                {summary.total_reports > 0 && timeBarData ? (
                  <Bar data={timeBarData} options={timeBarOptions} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748B" }}>
                    No reports in this period.
                  </div>
                )}
              </div>
            </div>

            {/* Moderation Review Outcomes */}
            <div style={{ gridColumn: "span 5", background: "#131C30", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={18} style={{ color: "#34D399" }} />
                Moderation Review Pipeline
              </h3>
              <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "#A5B4CC" }}>
                Status verification outcomes &amp; platform integrity
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(data?.verification_status || []).map(st => (
                  <div key={st.status_key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }}></span>
                        {st.status}
                      </span>
                      <span style={{ color: "#A5B4CC" }}>
                        <b>{st.count}</b> ({st.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 7, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${st.percentage}%`,
                          height: "100%",
                          background: st.color,
                          borderRadius: 4,
                          transition: "width 0.4s ease"
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SOS & Journey Telemetry Section */}
          <div style={{ background: "#131C30", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F8FAFC", display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={18} style={{ color: "#FBBF24" }} />
                Live Platform Safety Telemetry &amp; Operations
              </h3>
              <span className="badge" style={{ background: "rgba(251, 191, 36, 0.15)", color: "#FBBF24", fontSize: "0.72rem" }}>
                Real-Time Database Records
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* SOS Metrics */}
              <div style={{ background: "#19253D", borderRadius: 12, padding: 16, border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                <div style={{ fontWeight: 700, color: "#FB7185", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                  <PhoneCall size={16} /> Smart SOS System Telemetry
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Total Activations</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F8FAFC" }}>
                      {data?.advanced?.sos?.total ?? summary.sos_events_total}
                    </div>
                  </div>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Active Emergencies</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#FB7185" }}>
                      {data?.advanced?.sos?.active ?? summary.active_sos}
                    </div>
                  </div>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Live Mode Triggers</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#34D399" }}>
                      {data?.advanced?.sos?.live_mode ?? 0}
                    </div>
                  </div>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Demo Simulations</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#A5B4CC" }}>
                      {data?.advanced?.sos?.demo_mode ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Guardian Metrics */}
              <div style={{ background: "#19253D", borderRadius: 12, padding: 16, border: "1px solid rgba(45, 212, 191, 0.25)" }}>
                <div style={{ fontWeight: 700, color: "#2DD4BF", marginBottom: 8, display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                  <Navigation size={16} /> Live Journey Guardian Telemetry
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Completed Journeys</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34D399" }}>
                      {data?.advanced?.journeys?.completed ?? summary.completed_journeys}
                    </div>
                  </div>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Active Sessions</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#2DD4BF" }}>
                      {data?.advanced?.journeys?.active ?? 0}
                    </div>
                  </div>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Safest Route Selected</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#60A5FA" }}>
                      {data?.advanced?.journeys?.route_types?.safest ?? 0}
                    </div>
                  </div>
                  <div>
                    <span className="mut" style={{ fontSize: "0.72rem" }}>Fastest / Shortest</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#A5B4CC" }}>
                      {(data?.advanced?.journeys?.route_types?.fastest ?? 0) + (data?.advanced?.journeys?.route_types?.shortest ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* ETHICAL REPORTING & JURISDICTION NOTICE                             */}
      {/* ------------------------------------------------------------------- */}
      <div
        style={{
          background: "rgba(96, 165, 250, 0.05)",
          border: "1px solid rgba(96, 165, 250, 0.15)",
          borderRadius: 12,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: "0.78rem",
          color: "#94A3B8"
        }}
      >
        <ShieldCheck size={20} style={{ color: "#60A5FA", flexShrink: 0 }} />
        <div>
          <b>Ethical Safety Intelligence Notice:</b> Reported hazards reflect community submissions to ABHAYA and are mapped to the 8 Kolhapur City Police Stations. Reporting frequency illustrates community vigilance and safety infrastructure needs. Coordinates are aggregated for privacy protection.
        </div>
      </div>
    </div>
  );
}
