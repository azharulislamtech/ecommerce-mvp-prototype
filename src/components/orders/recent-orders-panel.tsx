"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { forgetRecentOrder, readRecentOrders, type RecentOrder } from "@/lib/recent-orders";

function formatSavedAt(value: string) {
  const savedAt = new Date(value);

  if (Number.isNaN(savedAt.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(savedAt);
}

export function RecentOrdersPanel({ activeToken }: { activeToken?: string }) {
  // Rendering starts empty and fills in after mount, because localStorage does
  // not exist while this page is server rendered.
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOrders(readRecentOrders());
    setHydrated(true);
  }, []);

  if (!hydrated || orders.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-950">Your Recent Orders</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Saved on this device only. Tap an order to see its status without typing anything.
      </p>
      <ul className="mt-4 space-y-2">
        {orders.map((order) => {
          const savedAt = formatSavedAt(order.savedAt);
          const isActive = activeToken === order.trackingToken;

          return (
            <li className="flex items-center gap-2" key={order.orderNumber}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`focus-ring flex min-h-12 flex-1 items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold ${
                  isActive
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-200 text-slate-950 hover:border-blue-300 hover:bg-slate-50"
                }`}
                href={`/track-order?t=${encodeURIComponent(order.trackingToken)}`}
              >
                <span className="truncate">{order.orderNumber}</span>
                {savedAt ? <span className="shrink-0 text-xs font-normal text-slate-500">{savedAt}</span> : null}
              </Link>
              <button
                aria-label={`Remove ${order.orderNumber} from this device`}
                className="focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-rose-700"
                onClick={() => setOrders(forgetRecentOrder(order.orderNumber))}
                type="button"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
