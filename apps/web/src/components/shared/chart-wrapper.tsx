"use client";

import dynamic from "next/dynamic";

const ChartSkeleton = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="animate-pulse text-muted text-sm">جاري التحميل...</div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AreaChart = dynamic<any>(
  () => import("recharts").then((m) => m.AreaChart),
  { ssr: false, loading: ChartSkeleton },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PieChart = dynamic<any>(
  () => import("recharts").then((m) => m.PieChart),
  { ssr: false, loading: ChartSkeleton },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BarChart = dynamic<any>(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false, loading: ChartSkeleton },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ResponsiveContainer = dynamic<any>(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const XAxis = dynamic<any>(
  () => import("recharts").then((m) => m.XAxis),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const YAxis = dynamic<any>(
  () => import("recharts").then((m) => m.YAxis),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Tooltip = dynamic<any>(
  () => import("recharts").then((m) => m.Tooltip),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Cell = dynamic<any>(
  () => import("recharts").then((m) => m.Cell),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Area = dynamic<any>(
  () => import("recharts").then((m) => m.Area),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Pie = dynamic<any>(
  () => import("recharts").then((m) => m.Pie),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Bar = dynamic<any>(
  () => import("recharts").then((m) => m.Bar),
  { ssr: false },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CartesianGrid = dynamic<any>(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
