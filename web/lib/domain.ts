import type { Bridge, Customer, Line, Message, Order, OrderDraft, OrderStatus, Product, ShopState, Variation, VariationDraft, Wait } from "./types";
import { formatMoney } from "./format";

export const INACTIVE_DAYS = 60;
export const STORAGE_KEY = "assistente-de-loja-v3";
export const SESSION_KEY = "assistente-de-loja-sessao";
export const BRIDGE_KEY = "assistente-de-loja-ponte";
export const DEMO_ACCOUNT = { email: "silva@mercearia.pt", password: "loja", shop: "Mercearia Silva" };

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function shiftDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function earlierToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - 30);
  if (date < startOfToday()) date.setTime(startOfToday().getTime() + 60 * 1000);
  return date.toISOString();
}

function dayInMonth(offset: number, preferredDay: number) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12, 0, 0, 0);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(preferredDay, last));
  return date.toISOString();
}

function earlierThisMonth(preferredDay: number) {
  const now = new Date();
  if (now.getDate() === 1) return null;
  const day = Math.min(preferredDay, now.getDate() - 1);
  return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0).toISOString();
}

function monthKey(iso: string) {
  const date = new Date(iso);
  return date.getFullYear() * 12 + date.getMonth();
}

export function sameDay(iso: string, ref = new Date()) {
  const date = new Date(iso);
  return date.getFullYear() === ref.getFullYear()
    && date.getMonth() === ref.getMonth()
    && date.getDate() === ref.getDate();
}

export function daysSince(iso: string) {
  const date = new Date(iso);
  date.setHours(0, 0, 0, 0);
  return Math.round((startOfToday().getTime() - date.getTime()) / 86400000);
}

export function daysLabel(iso: string) {
  const days = daysSince(iso);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export function monthName(offset: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  const label = date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function person(
  id: number,
  name: string,
  phone: string,
  address: string,
  cobranca: boolean,
  origem: Customer["origem"],
  metaId: string,
): Customer {
  return { id, name, phone, address, cobranca, origem, metaId, photo: "" };
}

export function seedCustomers(): Customer[] {
  return [
    person(1, "Ana Costa", "912 345 678", "Rua da Graça 18, 1100-265 Lisboa", true, "facebook", "2458712345678901"),
    person(2, "João Mendes", "913 220 441", "Avenida da República 40, 2000-123 Santarém", false, "whatsapp", "351913220441"),
    person(3, "Carla Ribeiro", "961 008 332", "Rua do Sol 7, 2500-100 Caldas da Rainha", true, "instagram", "178800112233"),
    person(4, "Pedro Alves", "924 776 105", "Largo do Pelourinho 2, 2460-001 Alcobaça", false, "balcao", ""),
    person(5, "Marta Sousa", "933 651 870", "Rua das Flores 25, 2400-150 Leiria", true, "facebook", "2458712345678902"),
    person(6, "Rui Fernandes", "918 443 229", "Travessa da Fonte 4, 2300-500 Tomar", false, "whatsapp", "351918443229"),
    person(7, "Inês Carvalho", "910 112 334", "Rua de São Vicente 9, 1100-580 Lisboa", false, "instagram", "178800112244"),
    person(8, "Tiago Nunes", "927 551 008", "Avenida do Mar 16, 2520-210 Peniche", true, "balcao", ""),
    person(9, "Sofia Lopes", "965 440 217", "Rua Direita 33, 2040-335 Rio Maior", false, "facebook", "2458712345678903"),
    person(10, "Miguel Pinto", "919 300 145", "Beco das Oliveiras 1, 2350-001 Torres Novas", true, "whatsapp", "351919300145"),
    person(11, "Helena Dias", "932 778 016", "Rua da Estação 12, 2495-650 Fátima", false, "balcao", ""),
    person(12, "Bruno Teixeira", "964 221 909", "Largo da Misericórdia 5, 2430-209 Marinha Grande", true, "instagram", "178800112255"),
  ];
}

/** Identity of a variation: reference, pack size, and color. */
export function variationKey(referencia: string, size: string, color: string) {
  return `${referencia.trim()}::${size.trim()}::${color.trim()}`;
}

function variation(referencia: string, size: string, color: string, quantity: number, minStock: number): Variation {
  return { id: variationKey(referencia, size, color), size, color, quantity, minStock };
}

export function seed(): ShopState {
  const products: Product[] = [
    {
      id: 1,
      referencia: "CAF-250",
      name: "Café moído",
      price: 4.5,
      variations: [
        variation("CAF-250", "250g", "", 3, 8),
        variation("CAF-250", "500g", "", 6, 4),
      ],
    },
    { id: 2, referencia: "AZ-075", name: "Azeite virgem", price: 8.9, variations: [variation("AZ-075", "0,75 L", "", 12, 4)] },
    { id: 3, referencia: "PAO-450", name: "Pão de forma", price: 1.8, variations: [variation("PAO-450", "450g", "", 2, 6)] },
    { id: 4, referencia: "LEI-1", name: "Leite meio-gordo", price: 0.95, variations: [variation("LEI-1", "1 L", "", 24, 12)] },
    { id: 5, referencia: "ARR-1", name: "Arroz agulha", price: 1.4, variations: [variation("ARR-1", "1 kg", "", 5, 6)] },
    { id: 6, referencia: "DET-750", name: "Detergente loiça", price: 2.3, variations: [variation("DET-750", "750 ml", "", 9, 4)] },
    { id: 7, referencia: "AGU-15", name: "Água", price: 0.45, variations: [variation("AGU-15", "1,5 L", "", 40, 18)] },
    { id: 8, referencia: "MAN-250", name: "Manteiga", price: 2.7, variations: [variation("MAN-250", "250g", "", 1, 5)] },
  ];
  const priceOf = (variationId: string) => products.find((product) => product.variations.some((item) => item.id === variationId))!.price;
  const line = (variationId: string, qty: number): Line => ({ variationId, qty, price: priceOf(variationId) });
  let nextId = 1030;
  const orders: Order[] = [];

  function addDelivered(customerId: number, when: string | null, items: Line[]) {
    if (!when) return;
    orders.push({
      id: nextId++,
      customerId,
      status: "entregue",
      espera: null,
      createdAt: when,
      dueAt: when,
      deliveredAt: when,
      items,
    });
  }

  const cafe = variationKey("CAF-250", "250g", "");
  const cafeLarge = variationKey("CAF-250", "500g", "");
  const azeite = variationKey("AZ-075", "0,75 L", "");
  const pao = variationKey("PAO-450", "450g", "");
  const leite = variationKey("LEI-1", "1 L", "");
  const arroz = variationKey("ARR-1", "1 kg", "");
  const detergente = variationKey("DET-750", "750 ml", "");
  const agua = variationKey("AGU-15", "1,5 L", "");
  const manteiga = variationKey("MAN-250", "250g", "");

  addDelivered(1, earlierToday(), [line(cafe, 2), line(pao, 1)]);
  addDelivered(5, earlierThisMonth(2) || shiftDays(-2), [line(leite, 6), line(manteiga, 1)]);
  addDelivered(6, earlierThisMonth(5) || shiftDays(-4), [line(cafe, 4)]);
  addDelivered(3, earlierThisMonth(9) || shiftDays(-8), [line(azeite, 1), line(arroz, 2)]);
  addDelivered(1, earlierThisMonth(14) || shiftDays(-12), [line(agua, 12), line(detergente, 1)]);
  addDelivered(3, dayInMonth(-1, 6), [line(azeite, 2), line(cafe, 1)]);
  addDelivered(6, dayInMonth(-1, 14), [line(cafeLarge, 3)]);
  addDelivered(5, dayInMonth(-1, 22), [line(leite, 10), line(pao, 2)]);
  addDelivered(2, dayInMonth(-3, 8), [line(arroz, 3), line(azeite, 1)]);
  addDelivered(4, dayInMonth(-4, 6), [line(detergente, 2)]);
  orders.push({
    id: nextId++,
    customerId: 2,
    status: "devolvida",
    espera: null,
    createdAt: shiftDays(-6),
    dueAt: shiftDays(-5),
    deliveredAt: null,
    items: [line(cafeLarge, 1)],
  });

  orders.push({
    id: nextId++,
    customerId: 6,
    status: "em_preparacao",
    espera: "aguarda_pagamento",
    createdAt: earlierToday(),
    dueAt: shiftDays(2),
    deliveredAt: null,
    items: [line(cafe, 2)],
  });
  orders.push({
    id: nextId++,
    customerId: 3,
    status: "em_preparacao",
    espera: "aguarda_confirmacao",
    createdAt: shiftDays(-3),
    dueAt: shiftDays(-1),
    deliveredAt: null,
    items: [line(pao, 4), line(manteiga, 1)],
  });
  orders.push({
    id: nextId++,
    customerId: 5,
    status: "a_processar",
    espera: null,
    createdAt: shiftDays(-1),
    dueAt: shiftDays(0),
    deliveredAt: null,
    items: [line(azeite, 1)],
  });

  return {
    customers: seedCustomers(),
    products,
    orders,
    nextId,
    nextProductId: 9,
    nextMessageId: 2,
    log: [],
    thread: [{
      id: 1,
      role: "assistant",
      text: "Olá. Posso dizer o que repor, quem está inativo, as vendas entregues e em que estado estão as encomendas. Crio uma encomenda ou registo uma mensagem só depois da sua confirmação.",
    }],
  };
}

export function loadState(): ShopState {
  const fresh = seed();
  if (typeof window === "undefined") return fresh;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as ShopState;
    const productsOk = Array.isArray(saved?.products) && saved.products.every((product) => Array.isArray(product.variations));
    if (!saved || !Array.isArray(saved.customers) || !productsOk || !Array.isArray(saved.orders) || !Array.isArray(saved.thread)) {
      return fresh;
    }
    if (!saved.nextProductId) saved.nextProductId = saved.products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
    if (!saved.nextMessageId) {
      saved.nextMessageId = saved.thread.reduce((max, message) => Math.max(max, message.id || 0), 0) + 1;
    }
    return saved;
  } catch {
    return fresh;
  }
}

export function customerById(state: ShopState, id: number) {
  return state.customers.find((customer) => customer.id === id);
}

export function productById(state: ShopState, id: number) {
  return state.products.find((product) => product.id === id);
}

export function orderTotal(order: Order) {
  return order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

export function isLate(order: Order) {
  return order.status !== "entregue" && order.status !== "devolvida" && new Date(order.dueAt) < startOfToday();
}

export function findVariation(state: ShopState, variationId: string) {
  for (const product of state.products) {
    const found = product.variations.find((item) => item.id === variationId);
    if (found) return { product, variation: found };
  }
  return null;
}

export function variationLabel(state: ShopState, variationId: string) {
  const found = findVariation(state, variationId);
  if (!found) return "Variação";
  const color = found.variation.color ? `, ${found.variation.color}` : "";
  return `${found.product.name} ${found.variation.size}${color}`;
}

export function lowStock(state: ShopState) {
  return state.products.flatMap((product) => product.variations
    .filter((item) => item.quantity < item.minStock)
    .map((item) => ({ product, variation: item })));
}

/** Stock is off the shelf only while the order is being processed or has been delivered. */
export function stockHasLeft(status: OrderStatus) {
  return status === "a_processar" || status === "entregue";
}

export function lastDelivered(state: ShopState, customerId: number) {
  return state.orders
    .filter((order) => order.customerId === customerId && order.status === "entregue" && order.deliveredAt)
    .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime())[0] || null;
}

export function isInactive(state: ShopState, customerId: number) {
  const last = lastDelivered(state, customerId);
  return !last || !last.deliveredAt || daysSince(last.deliveredAt) >= INACTIVE_DAYS;
}

export function itemSummary(state: ShopState, order: Order) {
  return order.items.map((item) => `${variationLabel(state, item.variationId)} × ${item.qty}`).join(", ");
}

export function monthSales(state: ShopState, offset: number) {
  const now = new Date();
  const key = now.getFullYear() * 12 + now.getMonth() + offset;
  const orders = state.orders.filter((order) => (
    order.status === "entregue" && order.deliveredAt && monthKey(order.deliveredAt) === key
  ));
  const total = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  return { orders, total };
}

export function salesText(state: ShopState) {
  const current = monthSales(state, 0);
  const previous = monthSales(state, -1);
  const diff = current.total - previous.total;
  let extra = "Ainda não há vendas entregues nestes dois meses.";
  if (previous.total > 0) {
    const percent = Math.round((diff / previous.total) * 100);
    const sign = diff > 0 ? "+" : "";
    extra = `Diferença: ${sign}${formatMoney(diff)} (${sign}${percent}%).`;
  } else if (current.total > 0) {
    extra = "Não houve vendas entregues no mês anterior, por isso não há percentagem.";
  }
  const noun = (count: number) => (count === 1 ? "encomenda entregue" : "encomendas entregues");
  return [
    `${monthName(0)}: ${formatMoney(current.total)} em ${current.orders.length} ${noun(current.orders.length)}.`,
    `${monthName(-1)}: ${formatMoney(previous.total)} em ${previous.orders.length} ${noun(previous.orders.length)}.`,
    extra,
  ].join("\n");
}

function stockIssue(state: ShopState, taking: Line[], returning: Line[] = []) {
  const need = new Map<string, number>();
  taking.forEach((item) => need.set(item.variationId, (need.get(item.variationId) || 0) + item.qty));
  returning.forEach((item) => need.set(item.variationId, (need.get(item.variationId) || 0) - item.qty));
  for (const [variationId, qty] of need) {
    if (qty <= 0) continue;
    const found = findVariation(state, variationId);
    const available = found ? found.variation.quantity : 0;
    if (!found || available < qty) {
      return `Stock insuficiente de ${variationLabel(state, variationId)}. Na prateleira: ${available}.`;
    }
  }
  return "";
}

function applyStock(state: ShopState, items: Line[], sign: number) {
  items.forEach((item) => {
    const found = findVariation(state, item.variationId);
    if (found) found.variation.quantity += sign * item.qty;
  });
}

function stampStatus(order: Order, nextStatus: OrderStatus, espera: Wait | null) {
  if (nextStatus === "entregue" && order.status !== "entregue") order.deliveredAt = new Date().toISOString();
  if (nextStatus !== "entregue") order.deliveredAt = null;
  order.status = nextStatus;
  order.espera = nextStatus === "em_preparacao" ? (espera || "aguarda_confirmacao") : null;
}

export function dueTomorrow() {
  const date = new Date(shiftDays(1));
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dueIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export type OrderResult = { state: ShopState; order: Order; error?: undefined } | { state: ShopState; order?: undefined; error: string };

/**
 * Creates an order. Stock leaves only when the new status is a processar or entregue.
 */
export function createOrder(source: ShopState, payload: OrderDraft): OrderResult {
  const state = structuredClone(source);
  const leaves = stockHasLeft(payload.status);
  if (leaves) {
    const issue = stockIssue(state, payload.items);
    if (issue) return { state: source, error: issue };
    applyStock(state, payload.items, -1);
  }
  const order: Order = {
    id: state.nextId++,
    customerId: payload.customerId,
    status: "em_preparacao",
    espera: "aguarda_confirmacao",
    createdAt: new Date().toISOString(),
    dueAt: payload.dueAt,
    deliveredAt: null,
    items: payload.items.map((item) => ({ ...item })),
  };
  stampStatus(order, payload.status, payload.espera);
  state.orders.push(order);
  return { state, order };
}

/**
 * Updates an order. Line edits change stock only when stock has already left the shelf.
 */
export function updateOrder(source: ShopState, id: number, payload: OrderDraft): OrderResult {
  const state = structuredClone(source);
  const order = state.orders.find((item) => item.id === id);
  if (!order) return { state: source, error: "Encomenda não encontrada." };
  const wasOut = stockHasLeft(order.status);
  const willOut = stockHasLeft(payload.status);
  if (willOut) {
    const issue = stockIssue(state, payload.items, wasOut ? order.items : []);
    if (issue) return { state: source, error: issue };
  }
  if (wasOut) applyStock(state, order.items, 1);
  if (willOut) applyStock(state, payload.items, -1);
  order.customerId = payload.customerId;
  order.dueAt = payload.dueAt;
  order.items = payload.items.map((item) => ({ ...item }));
  stampStatus(order, payload.status, payload.espera);
  return { state, order };
}

/**
 * Removes an order. Preparation returns nothing to the shelf because stock never left.
 */
export function cancelOrder(source: ShopState, id: number): ShopState {
  const state = structuredClone(source);
  const index = state.orders.findIndex((item) => item.id === id);
  if (index < 0) return source;
  const order = state.orders[index];
  if (stockHasLeft(order.status)) applyStock(state, order.items, 1);
  state.orders.splice(index, 1);
  return state;
}

export function saveCustomer(source: ShopState, id: number, patch: Pick<Customer, "name" | "address" | "phone" | "cobranca">): ShopState {
  const state = structuredClone(source);
  const customer = customerById(state, id);
  if (!customer) return source;
  Object.assign(customer, patch);
  return state;
}

export function createProduct(source: ShopState, referencia: string, name: string, price: number, draft: VariationDraft): { state: ShopState; error?: string } {
  const state = structuredClone(source);
  const ref = referencia.trim();
  if (!ref || !name.trim() || price <= 0) return { state: source, error: "Referência, nome e preço são obrigatórios." };
  if (state.products.some((product) => product.referencia.toLowerCase() === ref.toLowerCase())) {
    return { state: source, error: "Já existe um produto com essa referência." };
  }
  const first = variation(ref, draft.size.trim() || "unidade", draft.color.trim(), draft.quantity, draft.minStock);
  state.products.push({
    id: state.nextProductId++,
    referencia: ref,
    name: name.trim(),
    price,
    variations: [first],
  });
  return { state };
}

export function addVariation(source: ShopState, productId: number, draft: VariationDraft): { state: ShopState; error?: string } {
  const state = structuredClone(source);
  const product = productById(state, productId);
  if (!product) return { state: source, error: "Produto não encontrado." };
  const next = variation(product.referencia, draft.size.trim() || "unidade", draft.color.trim(), draft.quantity, draft.minStock);
  if (product.variations.some((item) => item.id === next.id)) {
    return { state: source, error: "Essa variação já existe." };
  }
  product.variations.push(next);
  return { state };
}

export function saveVariation(source: ShopState, variationId: string, quantity: number, minStock: number): ShopState {
  const state = structuredClone(source);
  const found = findVariation(state, variationId);
  if (!found) return source;
  found.variation.quantity = quantity;
  found.variation.minStock = minStock;
  return state;
}

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function matchCustomer(state: ShopState, text: string) {
  const value = normalize(text);
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 9) {
    const byPhone = state.customers.find((customer) => {
      const phone = customer.phone.replace(/\D/g, "");
      return phone && (digits === phone || digits.endsWith(phone) || phone.endsWith(digits));
    });
    if (byPhone) return byPhone;
  }
  return state.customers
    .filter((customer) => value.includes(normalize(customer.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

function detectIntent(state: ShopState, text: string) {
  const value = normalize(text);
  if (/(mensagem|avisar|chegou|levant)/.test(value)) return { intent: "message" };
  if (/(criar encomenda|nova encomenda|fazer uma encomenda|quero criar)/.test(value)) return { intent: "order" };
  if (/(repor|reposicao|stock baixo|abaixo do minimo)/.test(value)) return { intent: "restock" };
  if (/(inativ|nao compr|dois meses|2 meses|sem comprar)/.test(value)) return { intent: "inactive" };
  if (/(vendi|vendas|compar)/.test(value)) return { intent: "sales" };
  if (/(pagamento)/.test(value)) return { intent: "payment" };
  if (/(confirmacao)/.test(value)) return { intent: "confirmation" };
  if (/(processar)/.test(value)) return { intent: "processing" };
  if (/(devolvid)/.test(value)) return { intent: "returned" };
  const customer = matchCustomer(state, text);
  if (customer) return { intent: "customer", customerId: customer.id };
  return { intent: "unknown" };
}

function readyOrders(state: ShopState) {
  return state.orders.filter((order) => order.status === "a_processar");
}

function listOrders(state: ShopState, orders: Order[]) {
  if (!orders.length) return "Nenhuma.";
  return orders.map((order) => {
    const customer = customerById(state, order.customerId);
    return `#${order.id} · ${customer?.name || "cliente"} · ${itemSummary(state, order)}`;
  }).join("\n");
}

export function messageBody(state: ShopState, order: Order) {
  const customer = customerById(state, order.customerId);
  const first = customer ? customer.name.split(" ")[0] : "cliente";
  return `Olá ${first}, a sua encomenda #${order.id} já está na Mercearia Silva e pode ser levantada. Obrigado.`;
}

function answerFor(state: ShopState, intent: string, customerId?: number) {
  if (intent === "restock") {
    const low = lowStock(state);
    if (!low.length) return "Nenhuma variação está abaixo do stock mínimo.";
    const lines = low.map(({ product, variation: item }) => {
      const color = item.color ? `, ${item.color}` : "";
      const missing = item.minStock - item.quantity;
      return `${product.name}, ${item.size}${color}: ${item.quantity} em stock, mínimo ${item.minStock}, faltam ${missing}.`;
    });
    const noun = low.length === 1 ? "variação" : "variações";
    return `Há ${low.length} ${noun} abaixo do mínimo.\n${lines.join("\n")}`;
  }
  if (intent === "inactive") {
    const people = state.customers.filter((customer) => isInactive(state, customer.id));
    if (!people.length) return "Nenhum cliente está inativo. Todos compraram nos últimos 60 dias.";
    const lines = people.map((customer) => {
      const last = lastDelivered(state, customer.id);
      const when = last?.deliveredAt ? daysLabel(last.deliveredAt) : "sem compras entregues";
      return `${customer.name} (${customer.phone}), última compra ${when}.`;
    });
    const noun = people.length === 1 ? "cliente inativo" : "clientes inativos";
    return `Há ${people.length} ${noun}, sem compra entregue há 60 dias ou mais.\n${lines.join("\n")}`;
  }
  if (intent === "sales") return salesText(state);
  if (intent === "payment") {
    const waiting = state.orders.filter((order) => order.status === "em_preparacao" && order.espera === "aguarda_pagamento");
    return waiting.length ? `A aguardar pagamento:\n${listOrders(state, waiting)}` : "Nenhuma encomenda aguarda pagamento.";
  }
  if (intent === "confirmation") {
    const waiting = state.orders.filter((order) => order.status === "em_preparacao" && order.espera === "aguarda_confirmacao");
    return waiting.length ? `A aguardar confirmação:\n${listOrders(state, waiting)}` : "Nenhuma encomenda aguarda confirmação.";
  }
  if (intent === "processing") {
    const processing = state.orders.filter((order) => order.status === "a_processar");
    return processing.length ? `A processar:\n${listOrders(state, processing)}` : "Nenhuma encomenda está a processar.";
  }
  if (intent === "returned") {
    const returned = state.orders.filter((order) => order.status === "devolvida");
    return returned.length ? `Devolvidas:\n${listOrders(state, returned)}` : "Não há encomendas devolvidas.";
  }
  if (intent === "customer" && customerId) {
    const customer = customerById(state, customerId);
    if (!customer) return "Não encontrei esse cliente.";
    const history = state.orders.filter((order) => order.customerId === customer.id);
    const last = lastDelivered(state, customer.id);
    const when = last?.deliveredAt ? formatDateLabel(last.deliveredAt) : "sem entregas";
    return `${customer.name}\n${customer.address}\n${customer.phone}\nÀ cobrança: ${customer.cobranca ? "sim" : "não"}\n${history.length} encomendas. Última entrega: ${when}.`;
  }
  if (intent === "message") {
    if (!readyOrders(state).length) {
      return "Não há encomendas a processar. A mensagem de levantamento só se prepara nesse estado.";
    }
    return "Estas encomendas estão a processar. Escolha uma, leia a mensagem e confirme para a registar. Não é enviada: fica no registo.";
  }
  if (intent === "order") {
    return "Escolha o cliente, a variação e a quantidade. A encomenda fica em preparação, a aguardar confirmação. O stock não baixa.";
  }
  return "Posso dizer o que repor, quem está inativo, as vendas entregues, quem aguarda pagamento ou confirmação, o que está a processar e o que foi devolvido. Também abro a ficha de um cliente pelo nome ou telefone, preparo uma mensagem de levantamento e crio uma encomenda se confirmar.";
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

function pushMessage(state: ShopState, message: Omit<Message, "id">) {
  state.thread.push({ ...message, id: state.nextMessageId++ });
}

export function ask(source: ShopState, text: string): ShopState {
  const question = text.trim();
  if (!question) return source;
  const state = structuredClone(source);
  const found = detectIntent(state, question);
  state.thread.forEach((message) => {
    if (message.proposal && !message.proposal.resolved) message.proposal.resolved = "replaced";
  });
  pushMessage(state, { role: "user", text: question });
  const reply: Omit<Message, "id"> = { role: "assistant", text: answerFor(state, found.intent, found.customerId), proposal: null };
  const intent = found.intent;
  if (intent === "message" && readyOrders(state).length) reply.proposal = { type: "message" };
  if (intent === "order") reply.proposal = { type: "order" };
  pushMessage(state, reply);
  return state;
}

function findMessage(state: ShopState, messageId: number) {
  return state.thread.find((message) => message.id === messageId);
}

export function confirmProposedOrder(source: ShopState, messageId: number, customerId: number, variationId: string, qty: number): OrderResult {
  const found = findVariation(source, variationId);
  const drafted = createOrder(source, {
    customerId,
    status: "em_preparacao",
    espera: "aguarda_confirmacao",
    dueAt: shiftDays(1),
    items: [{ variationId, qty, price: found?.product.price || 0 }],
  });
  const created = drafted.order;
  if (drafted.error || !created) return drafted.error ? drafted : { state: source, error: "Não foi possível criar a encomenda." };
  const state = drafted.state;
  const message = findMessage(state, messageId);
  if (message?.proposal) message.proposal.resolved = "confirmed";
  const customer = customerById(state, customerId);
  const note = `Criei a encomenda #${created.id} para ${customer?.name}: ${variationLabel(state, variationId)} × ${qty}. Fica em preparação, a aguardar confirmação.`;
  state.log.unshift({ at: new Date().toISOString(), text: `${note} O stock não foi alterado.` });
  pushMessage(state, { role: "assistant", text: `${note} O stock não foi alterado.` });
  return { state, order: created };
}

export function confirmProposedMessage(source: ShopState, messageId: number, orderId: number): { state: ShopState; error?: string } {
  const state = structuredClone(source);
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status !== "a_processar") {
    return { state: source, error: "Essa encomenda já não está a processar." };
  }
  const message = findMessage(state, messageId);
  if (message?.proposal) message.proposal.resolved = "confirmed";
  const customer = customerById(state, order.customerId);
  const note = `Mensagem registada para ${customer?.name} sobre a encomenda #${order.id}.`;
  state.log.unshift({ at: new Date().toISOString(), text: `${note} «${messageBody(state, order)}»` });
  pushMessage(state, { role: "assistant", text: `${note} Não foi enviada.` });
  return { state };
}

export function cancelProposal(source: ShopState, messageId: number): ShopState {
  const state = structuredClone(source);
  const message = findMessage(state, messageId);
  if (message?.proposal) message.proposal.resolved = "cancelled";
  pushMessage(state, { role: "assistant", text: "Está bem, não fiz essa ação." });
  return state;
}

export function bridgeReady(bridge: Bridge) {
  return Object.values(bridge).some((value) => String(value || "").trim());
}

export function emptyBridge() {
  return { appId: "", portfolioId: "", pageId: "", instagramId: "", whatsappId: "", phoneId: "" };
}
