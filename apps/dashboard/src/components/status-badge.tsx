import type { PaymentStatus } from "@qarta/shared";

const statusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  succeeded: {
    label: "Succeeded",
    className: "bg-green-50 text-green-700",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-50 text-yellow-700",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-50 text-blue-700",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700",
  },
  refunded: {
    label: "Refunded",
    className: "bg-gray-100 text-gray-700",
  },
  partially_refunded: {
    label: "Partial Refund",
    className: "bg-gray-100 text-gray-600",
  },
  disputed: {
    label: "Disputed",
    className: "bg-orange-50 text-orange-700",
  },
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
