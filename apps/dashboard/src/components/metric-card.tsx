interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
}

export function MetricCard({ title, value, change, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {change !== undefined && (
          <span
            className={`inline-flex items-center text-sm font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? (
              <svg className="mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            ) : (
              <svg className="mr-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
              </svg>
            )}
            {Math.abs(change)}%
          </span>
        )}
        {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
      </div>
    </div>
  );
}
