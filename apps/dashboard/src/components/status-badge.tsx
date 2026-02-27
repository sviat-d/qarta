import type { AlertStatus } from "@qarta/shared";

const statusConfig: Record<
  AlertStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "bg-blue-50 text-blue-700",
  },
  evaluating: {
    label: "Evaluating",
    className: "bg-yellow-50 text-yellow-700",
  },
  auto_refunded: {
    label: "Auto-Refunded",
    className: "bg-green-50 text-green-700",
  },
  escalated: {
    label: "Escalated",
    className: "bg-orange-50 text-orange-700",
  },
  manually_resolved: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-700",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-gray-100 text-gray-600",
  },
  expired: {
    label: "Expired",
    className: "bg-red-50 text-red-700",
  },
};

export function StatusBadge({ status }: { status: AlertStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
