"use client";

import { mockChartData } from "@/lib/mock-data";

export function RevenueChart() {
  const maxRevenue = Math.max(...mockChartData.map((d) => d.revenue));
  const chartHeight = 200;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Revenue</h3>
          <p className="text-xs text-gray-500">Last 30 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
            <span className="text-gray-500">Revenue</span>
          </div>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-[3px]" style={{ height: chartHeight }}>
        {mockChartData.map((day) => {
          const height = (day.revenue / maxRevenue) * chartHeight;
          return (
            <div
              key={day.date}
              className="group relative flex-1"
              style={{ height: chartHeight }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t bg-brand-500 transition-colors hover:bg-brand-600"
                style={{ height: `${height}px` }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <p className="font-medium">${(day.revenue / 100).toLocaleString()}</p>
                <p className="text-gray-400">{day.date}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{mockChartData[0]?.date}</span>
        <span>{mockChartData[Math.floor(mockChartData.length / 2)]?.date}</span>
        <span>{mockChartData[mockChartData.length - 1]?.date}</span>
      </div>
    </div>
  );
}
