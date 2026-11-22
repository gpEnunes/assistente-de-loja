"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  STORAGE_KEY,
  ask,
  cancelOrder,
  cancelProposal,
  confirmProposedMessage,
  confirmProposedOrder,
  addVariation,
  createOrder,
  createProduct,
  loadState,
  saveCustomer,
  saveVariation,
  seed,
  updateOrder,
} from "./domain";
import type { Customer, OrderDraft, ShopState, VariationDraft } from "./types";

interface ShopApi {
  state: ShopState;
  reset: () => void;
  saveCustomer: (id: number, patch: Pick<Customer, "name" | "address" | "phone" | "cobranca">) => void;
  createProduct: (referencia: string, name: string, price: number, draft: VariationDraft) => string | null;
  addVariation: (productId: number, draft: VariationDraft) => string | null;
  saveVariation: (variationId: string, quantity: number, minStock: number) => void;
  createOrder: (draft: OrderDraft) => string | null;
  updateOrder: (id: number, draft: OrderDraft) => string | null;
  cancelOrder: (id: number) => void;
  ask: (text: string) => void;
  confirmOrder: (messageId: number, customerId: number, variationId: string, qty: number) => string | null;
  confirmMessage: (messageId: number, orderId: number) => string | null;
  cancelProposal: (messageId: number) => void;
}

const ShopContext = createContext<ShopApi | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ShopState>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const api = useMemo<ShopApi>(() => ({
    state,
    reset: () => setState(seed()),
    saveCustomer: (id, patch) => setState((current) => saveCustomer(current, id, patch)),
    createProduct: (referencia, name, price, draft) => {
      let error: string | null = null;
      setState((current) => {
        const result = createProduct(current, referencia, name, price, draft);
        if (result.error) {
          error = result.error;
          return current;
        }
        return result.state;
      });
      return error;
    },
    addVariation: (productId, draft) => {
      let error: string | null = null;
      setState((current) => {
        const result = addVariation(current, productId, draft);
        if (result.error) {
          error = result.error;
          return current;
        }
        return result.state;
      });
      return error;
    },
    saveVariation: (variationId, quantity, minStock) => setState((current) => saveVariation(current, variationId, quantity, minStock)),
    createOrder: (draft) => {
      let error: string | null = null;
      setState((current) => {
        const result = createOrder(current, draft);
        if (result.error) {
          error = result.error;
          return current;
        }
        return result.state;
      });
      return error;
    },
    updateOrder: (id, draft) => {
      let error: string | null = null;
      setState((current) => {
        const result = updateOrder(current, id, draft);
        if (result.error) {
          error = result.error;
          return current;
        }
        return result.state;
      });
      return error;
    },
    cancelOrder: (id) => setState((current) => cancelOrder(current, id)),
    ask: (text) => setState((current) => ask(current, text)),
    confirmOrder: (messageId, customerId, variationId, qty) => {
      let error: string | null = null;
      setState((current) => {
        const result = confirmProposedOrder(current, messageId, customerId, variationId, qty);
        if (result.error) {
          error = result.error;
          return current;
        }
        return result.state;
      });
      return error;
    },
    confirmMessage: (messageId, orderId) => {
      let error: string | null = null;
      setState((current) => {
        const result = confirmProposedMessage(current, messageId, orderId);
        if (result.error) {
          error = result.error;
          return current;
        }
        return result.state;
      });
      return error;
    },
    cancelProposal: (messageId) => setState((current) => cancelProposal(current, messageId)),
  }), [state]);

  return <ShopContext.Provider value={api}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("A loja ainda não está disponível neste ecrã.");
  return shop;
}
