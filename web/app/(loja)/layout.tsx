"use client";

import { ShopFrame } from "@/components/shell";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return <ShopFrame>{children}</ShopFrame>;
}
