"use client";

import type { OutcomesTimeSeries } from "@qarta/shared";

interface AlertChartProps {
  data: OutcomesTimeSeries[];
}

export function AlertChart({ data }: AlertChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">Alert Activity</h3>
        <p className="mt-8 text-center text-sm text-gray-500">
          No data available yet
        </p>
      </div>
    );
  }

  const maxAlerts = Math.max(...data.map((d) => d.alerts));
  const chartHeight = 200;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Alert Activity</h3>
          <p className="text-xs text-gray-500">Last 30 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-gray-500">Auto-resolved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-orange-400" />
            <span className="text-gray-500">Escalated</span>
          </div>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div
        className="flex items-end gap-[3px]"
        style={{ height: chartHeight }}
      >
        {data.map((day) => {
          const totalHeight =
            maxAlerts > 0 ? (day.alerts / maxAlerts) * chartHeight : 0;
          const resolvedHeight =
            day.alerts > 0
              ? (day.autoResolved / day.alerts) * totalHeight
              : 0;
          const escalatedHeight = totalHeight - resolvedHeight;

          return (
            <div
              key={day.date}
              className="group relative flex-1"
              style={{ height: chartHeight }}
            >
              {/* Escalated (top portion) */}
              <div
                className="absolute bottom-0 w-full rounded-t"
                style={{ height: `${totalHeight}px` }}
              >
                <div
                  className="w-full rounded-t bg-orange-400"
                  style={{ height: `${escalatedHeight}px` }}
                />
                <div
                  className="w-full bg-green-500"
                  style={{
                    height: `${resolvedHeight}px`,
                    borderRadius:
                      escalatedHeight === 0 ? "4px 4px 0 0" : "0",
                  }}
                />
              </div>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <p className="font-medium">{day.alerts} alerts</p>
                <p className="text-green-300">
                  {day.autoResolved} auto-resolved
                </p>
                <p className="text-orange-300">{day.escalated} escalated</p>
                <p className="text-gray-400">{day.date}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
