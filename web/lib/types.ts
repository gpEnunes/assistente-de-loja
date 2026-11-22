export type Origin = "balcao" | "facebook" | "whatsapp" | "instagram";
export type OrderStatus = "em_preparacao" | "a_processar" | "entregue" | "devolvida";
export type Wait = "aguarda_pagamento" | "aguarda_confirmacao";
export type Role = "assistant" | "user";

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  cobranca: boolean;
  origem: Origin;
  metaId: string;
  photo: string;
}

export interface Variation {
  id: string;
  size: string;
  color: string;
  quantity: number;
  minStock: number;
}

export interface Product {
  id: number;
  referencia: string;
  name: string;
  price: number;
  variations: Variation[];
}

export interface Line {
  variationId: string;
  qty: number;
  price: number;
}

export interface Order {
  id: number;
  customerId: number;
  status: OrderStatus;
  espera: Wait | null;
  createdAt: string;
  dueAt: string;
  deliveredAt: string | null;
  items: Line[];
}

export interface LogEntry {
  at: string;
  text: string;
}

export interface Proposal {
  type: "message" | "order";
  resolved?: "confirmed" | "cancelled" | "replaced";
}

export interface Message {
  id: number;
  role: Role;
  text: string;
  proposal?: Proposal | null;
}

export interface ShopState {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  nextId: number;
  nextProductId: number;
  nextMessageId: number;
  log: LogEntry[];
  thread: Message[];
}

export interface Bridge {
  appId: string;
  portfolioId: string;
  pageId: string;
  instagramId: string;
  whatsappId: string;
  phoneId: string;
}

export interface OrderDraft {
  customerId: number;
  status: OrderStatus;
  espera: Wait | null;
  dueAt: string;
  items: Line[];
}

export interface VariationDraft {
  size: string;
  color: string;
  quantity: number;
  minStock: number;
}
