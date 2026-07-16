"use client";

import { useEffect } from "react";
import { saveRecentOrder } from "@/lib/recent-orders";

export function SaveRecentOrder({ orderNumber, trackingToken }: { orderNumber: string; trackingToken: string }) {
  useEffect(() => {
    saveRecentOrder({ orderNumber, trackingToken });
  }, [orderNumber, trackingToken]);

  return null;
}
