import type { Order, OrderStatus, Origin, Wait } from "./types";

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export const STATUS_LABEL: Record<OrderStatus, string> = {
  em_preparacao: "Em preparação",
  a_processar: "A processar",
  entregue: "Entregue",
  devolvida: "Devolvida",
};

export const WAIT_LABEL: Record<Wait, string> = {
  aguarda_pagamento: "Aguarda pagamento",
  aguarda_confirmacao: "Aguarda confirmação",
};

/** Label shown on an order, including the wait while it is still in preparation. */
export function statusText(order: Pick<Order, "status" | "espera">) {
  if (order.status === "em_preparacao") {
    return `${STATUS_LABEL.em_preparacao} · ${WAIT_LABEL[order.espera || "aguarda_confirmacao"]}`;
  }
  return STATUS_LABEL[order.status];
}

export const ORIGIN_LABEL: Record<Origin, string> = {
  balcao: "Balcão",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

export function formatMoney(value: number) {
  return money.format(value);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateInputValue(iso: string) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayLabel() {
  const label = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function readCount(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  const count = Number(value);
  return count > 0 ? count : null;
}

export function readStock(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value);
}
