"use strict";

const INACTIVE_DAYS = 60;
const STORAGE_KEY = "assistente-de-loja-v1";
const VIEWS = ["inicio", "painel", "clientes", "produtos", "encomendas", "assistente"];
const STATUS_LABEL = {
  pendente: "Pendente",
  em_preparacao: "Em preparação",
  entregue: "Entregue",
};

const CUSTOMERS = [
  { id: 1, name: "Ana Costa", phone: "912 345 678", email: "ana.costa@email.pt", notes: "Prefere aviso quando a encomenda chega." },
  { id: 2, name: "João Mendes", phone: "913 220 441", email: "joao.mendes@email.pt", notes: "Compra arroz e azeite no início do mês." },
  { id: 3, name: "Carla Ribeiro", phone: "961 008 332", email: "carla.ribeiro@email.pt", notes: "Levanta ao fim do dia." },
  { id: 4, name: "Pedro Alves", phone: "924 776 105", email: "pedro.alves@email.pt", notes: "Pediu para não telefonar de manhã." },
  { id: 5, name: "Marta Sousa", phone: "933 651 870", email: "marta.sousa@email.pt", notes: "" },
  { id: 6, name: "Rui Fernandes", phone: "918 443 229", email: "rui.fernandes@email.pt", notes: "Encomenda habitual de café." },
];

const ui = {
  customerQuery: "",
  customerFilter: "todos",
  productQuery: "",
  productFilter: "todos",
  orderFilter: "todas",
  selectedCustomerId: 1,
  highlightOrderId: null,
  editingId: null,
  draftItems: [],
};

let state = loadState();
let messageSeq = maxMessageId(state.thread);
let booted = false;

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = String(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  (children || []).forEach((child) => {
    if (child == null || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function normalize(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function readCount(value) {
  if (!/^\d+$/.test(String(value).trim())) return null;
  return Number(value);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function shiftDays(days) {
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

function dayInMonth(offset, preferredDay) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12, 0, 0, 0);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(preferredDay, last));
  return date.toISOString();
}

function earlierThisMonth(preferredDay) {
  const now = new Date();
  if (now.getDate() === 1) return null;
  const day = Math.min(preferredDay, now.getDate() - 1);
  return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0).toISOString();
}

function sameDay(iso, ref) {
  const date = new Date(iso);
  return date.getFullYear() === ref.getFullYear()
    && date.getMonth() === ref.getMonth()
    && date.getDate() === ref.getDate();
}

function monthKey(iso) {
  const date = new Date(iso);
  return date.getFullYear() * 12 + date.getMonth();
}

function daysSince(iso) {
  const date = new Date(iso);
  date.setHours(0, 0, 0, 0);
  return Math.round((startOfToday() - date) / 86400000);
}

function daysLabel(iso) {
  const days = daysSince(iso);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function formatMoney(value) {
  return money.format(value);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateInputValue(iso) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function monthName(offset) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  const label = date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function seed() {
  const products = [
    { id: 1, name: "Café moído 250g", price: 4.5, quantity: 3, minStock: 8 },
    { id: 2, name: "Azeite virgem 0,75 L", price: 8.9, quantity: 12, minStock: 4 },
    { id: 3, name: "Pão de forma", price: 1.8, quantity: 2, minStock: 6 },
    { id: 4, name: "Leite meio-gordo 1 L", price: 0.95, quantity: 24, minStock: 12 },
    { id: 5, name: "Arroz agulha 1 kg", price: 1.4, quantity: 5, minStock: 6 },
    { id: 6, name: "Detergente loiça", price: 2.3, quantity: 9, minStock: 4 },
    { id: 7, name: "Água 1,5 L", price: 0.45, quantity: 40, minStock: 18 },
    { id: 8, name: "Manteiga 250g", price: 2.7, quantity: 1, minStock: 5 },
  ];
  const priceOf = (productId) => products.find((product) => product.id === productId).price;
  const line = (productId, qty) => ({ productId, qty, price: priceOf(productId) });
  let nextId = 1030;
  const orders = [];

  function addDelivered(customerId, when, items) {
    if (!when) return;
    const id = nextId++;
    orders.push({
      id,
      customerId,
      status: "entregue",
      createdAt: when,
      dueAt: when,
      deliveredAt: when,
      items,
    });
  }

  addDelivered(1, earlierToday(), [line(1, 2), line(3, 1)]);
  addDelivered(5, earlierThisMonth(2) || shiftDays(-2), [line(4, 6), line(8, 1)]);
  addDelivered(6, earlierThisMonth(5) || shiftDays(-4), [line(1, 4)]);
  addDelivered(3, earlierThisMonth(9) || shiftDays(-8), [line(2, 1), line(5, 2)]);
  addDelivered(1, earlierThisMonth(14) || shiftDays(-12), [line(7, 12), line(6, 1)]);
  addDelivered(3, dayInMonth(-1, 6), [line(2, 2), line(1, 1)]);
  addDelivered(6, dayInMonth(-1, 14), [line(1, 3)]);
  addDelivered(5, dayInMonth(-1, 22), [line(4, 10), line(3, 2)]);
  addDelivered(2, dayInMonth(-3, 8), [line(5, 3), line(2, 1)]);
  addDelivered(4, dayInMonth(-4, 6), [line(6, 2)]);

  orders.push({
    id: nextId++,
    customerId: 6,
    status: "pendente",
    createdAt: earlierToday(),
    dueAt: shiftDays(2),
    deliveredAt: null,
    items: [line(1, 2)],
  });
  orders.push({
    id: nextId++,
    customerId: 3,
    status: "pendente",
    createdAt: shiftDays(-3),
    dueAt: shiftDays(-1),
    deliveredAt: null,
    items: [line(3, 4), line(8, 1)],
  });
  orders.push({
    id: nextId++,
    customerId: 5,
    status: "em_preparacao",
    createdAt: shiftDays(-1),
    dueAt: shiftDays(0),
    deliveredAt: null,
    items: [line(2, 1)],
  });

  return {
    products,
    orders,
    nextId,
    log: [],
    thread: [{
      id: 1,
      role: "assistant",
      text: "Olá. Posso dizer o que repor, quem está inativo e como correm as vendas. Também preparo uma mensagem ou uma encomenda, mas só depois da sua confirmação.",
    }],
  };
}

function loadState() {
  const fresh = seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.products) || !Array.isArray(saved.orders) || !Array.isArray(saved.thread)) {
      return fresh;
    }
    return saved;
  } catch (error) {
    return fresh;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function maxMessageId(thread) {
  return thread.reduce((max, message) => Math.max(max, message.id || 0), 0);
}

function customerById(id) {
  return CUSTOMERS.find((customer) => customer.id === id);
}

function productById(id) {
  return state.products.find((product) => product.id === id);
}

function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

function isLate(order) {
  return order.status !== "entregue" && new Date(order.dueAt) < startOfToday();
}

function lastDelivered(customerId) {
  return state.orders
    .filter((order) => order.customerId === customerId && order.status === "entregue" && order.deliveredAt)
    .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt))[0] || null;
}

function isInactive(customerId) {
  const last = lastDelivered(customerId);
  return !last || daysSince(last.deliveredAt) >= INACTIVE_DAYS;
}

function itemSummary(order) {
  return order.items.map((item) => {
    const product = productById(item.productId);
    return `${product ? product.name : "Produto"} × ${item.qty}`;
  }).join(", ");
}

function monthSales(offset) {
  const now = new Date();
  const key = now.getFullYear() * 12 + now.getMonth() + offset;
  const orders = state.orders.filter((order) => (
    order.status === "entregue" && order.deliveredAt && monthKey(order.deliveredAt) === key
  ));
  const total = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  return { orders, total };
}

function salesText() {
  const current = monthSales(0);
  const previous = monthSales(-1);
  const diff = current.total - previous.total;
  let extra = "Ainda não há vendas entregues nestes dois meses.";
  if (previous.total > 0) {
    const percent = Math.round((diff / previous.total) * 100);
    const sign = diff > 0 ? "+" : "";
    extra = `Diferença: ${sign}${formatMoney(diff)} (${sign}${percent}%).`;
  } else if (current.total > 0) {
    extra = "Não houve vendas entregues no mês anterior, por isso não há percentagem.";
  }
  const noun = (count) => (count === 1 ? "encomenda entregue" : "encomendas entregues");
  return [
    `${monthName(0)}: ${formatMoney(current.total)} em ${current.orders.length} ${noun(current.orders.length)}.`,
    `${monthName(-1)}: ${formatMoney(previous.total)} em ${previous.orders.length} ${noun(previous.orders.length)}.`,
    extra,
  ].join("\n");
}

function stockIssue(items, ignoreOrderId) {
  const need = new Map();
  items.forEach((item) => need.set(item.productId, (need.get(item.productId) || 0) + item.qty));
  if (ignoreOrderId) {
    const previous = state.orders.find((order) => order.id === ignoreOrderId);
    previous.items.forEach((item) => need.set(item.productId, (need.get(item.productId) || 0) - item.qty));
  }
  for (const [productId, qty] of need) {
    if (qty <= 0) continue;
    const product = productById(productId);
    if (!product || product.quantity < qty) {
      const name = product ? product.name : "produto";
      const available = product ? product.quantity : 0;
      return `Stock insuficiente de ${name}. Na prateleira: ${available}.`;
    }
  }
  return "";
}

function applyStock(items, sign) {
  items.forEach((item) => {
    const product = productById(item.productId);
    if (product) product.quantity += sign * item.qty;
  });
}

function stampDelivery(order, nextStatus) {
  if (nextStatus === "entregue" && order.status !== "entregue") order.deliveredAt = new Date().toISOString();
  if (nextStatus !== "entregue") order.deliveredAt = null;
  order.status = nextStatus;
}

function createOrder(payload) {
  const issue = stockIssue(payload.items, null);
  if (issue) return issue;
  applyStock(payload.items, -1);
  const order = {
    id: state.nextId++,
    customerId: payload.customerId,
    status: "pendente",
    createdAt: new Date().toISOString(),
    dueAt: payload.dueAt,
    deliveredAt: null,
    items: payload.items.map((item) => ({ ...item })),
  };
  stampDelivery(order, payload.status);
  state.orders.push(order);
  persist();
  return order;
}

function updateOrder(id, payload) {
  const order = state.orders.find((item) => item.id === id);
  const issue = stockIssue(payload.items, id);
  if (issue) return issue;
  applyStock(order.items, 1);
  applyStock(payload.items, -1);
  order.customerId = payload.customerId;
  order.dueAt = payload.dueAt;
  order.items = payload.items.map((item) => ({ ...item }));
  stampDelivery(order, payload.status);
  persist();
  return order;
}

function cancelOrder(id) {
  const index = state.orders.findIndex((item) => item.id === id);
  const order = state.orders[index];
  applyStock(order.items, 1);
  state.orders.splice(index, 1);
  persist();
  return order;
}

function readyOrders() {
  return state.orders.filter((order) => order.status === "em_preparacao");
}

function messageBody(order) {
  const customer = customerById(order.customerId);
  const first = customer.name.split(" ")[0];
  return `Olá ${first}, a sua encomenda #${order.id} já está na Mercearia Silva e pode ser levantada. Obrigado.`;
}

function detectIntent(text) {
  const value = normalize(text);
  if (/(mensagem|avisar|chegou)/.test(value)) return "message";
  if (/(criar encomenda|nova encomenda|fazer uma encomenda|quero criar)/.test(value)) return "order";
  if (/(repor|reposicao|stock baixo|abaixo do minimo)/.test(value)) return "restock";
  if (/(inativ|nao compr|dois meses|2 meses|sem comprar)/.test(value)) return "inactive";
  if (/(vendi|vendas|compar)/.test(value)) return "sales";
  return "unknown";
}

function answerFor(intent) {
  if (intent === "restock") {
    const low = state.products.filter((product) => product.quantity < product.minStock);
    if (!low.length) return "Nenhum produto está abaixo do stock mínimo.";
    const lines = low.map((product) => {
      const missing = product.minStock - product.quantity;
      return `${product.name}: ${product.quantity} em stock, mínimo ${product.minStock}, faltam ${missing}.`;
    });
    const noun = low.length === 1 ? "produto" : "produtos";
    return `Há ${low.length} ${noun} abaixo do mínimo.\n${lines.join("\n")}`;
  }
  if (intent === "inactive") {
    const people = CUSTOMERS.filter((customer) => isInactive(customer.id));
    if (!people.length) return "Nenhum cliente está inativo. Todos compraram nos últimos 60 dias.";
    const lines = people.map((customer) => {
      const last = lastDelivered(customer.id);
      const when = last ? daysLabel(last.deliveredAt) : "sem compras entregues";
      return `${customer.name} (${customer.phone}), última compra ${when}.`;
    });
    const noun = people.length === 1 ? "cliente inativo" : "clientes inativos";
    return `Há ${people.length} ${noun}, sem compra entregue há 60 dias ou mais.\n${lines.join("\n")}`;
  }
  if (intent === "sales") return salesText();
  if (intent === "message") {
    if (!readyOrders().length) {
      return "Não há encomendas em preparação. Quando uma encomenda chegar, mude o estado para «Em preparação» e peça a mensagem outra vez.";
    }
    return "Estas encomendas estão em preparação. Escolha uma, leia a mensagem e confirme para a registar. Não é enviada: fica no registo.";
  }
  if (intent === "order") {
    return "Escolha o cliente, o produto e a quantidade. A encomenda fica pendente, com levantamento amanhã. O stock só baixa depois de confirmar.";
  }
  return "Consigo responder a quatro coisas: o que repor, clientes inativos, vendas deste mês e uma mensagem de encomenda. Também crio uma encomenda se confirmar.";
}

function closeOpenProposals(except) {
  state.thread.forEach((message) => {
    if (message !== except && message.proposal && !message.proposal.resolved) {
      message.proposal.resolved = "replaced";
    }
  });
}

function ask(text) {
  const question = text.trim();
  if (!question) return;
  const intent = detectIntent(question);
  const reply = {
    id: ++messageSeq,
    role: "assistant",
    text: answerFor(intent),
    proposal: null,
  };
  if (intent === "message" && readyOrders().length) reply.proposal = { type: "message" };
  if (intent === "order") reply.proposal = { type: "order" };
  closeOpenProposals(reply);
  state.thread.push({ id: ++messageSeq, role: "user", text: question });
  reply.id = ++messageSeq;
  state.thread.push(reply);
  persist();
  renderThread();
  renderLog();
  const input = document.getElementById("assistant-input");
  input.value = "";
  const active = document.activeElement;
  if (active && active.closest && active.closest("#assistant-form")) input.focus();
  requestAnimationFrame(() => {
    const thread = document.getElementById("thread");
    thread.scrollTop = thread.scrollHeight;
  });
}

function recordAction(message, note, followUp) {
  message.proposal.resolved = "confirmed";
  state.log.unshift({ at: new Date().toISOString(), text: note });
  state.thread.push({ id: ++messageSeq, role: "assistant", text: followUp });
  persist();
  renderData();
  announce(followUp);
}

function confirmProposedOrder(message, form) {
  const productId = Number(form.querySelector("[data-field=product]").value);
  const qty = readCount(form.querySelector("[data-field=qty]").value);
  const error = form.querySelector("[data-error]");
  if (!qty) {
    error.textContent = "A quantidade tem de ser um número inteiro maior que zero.";
    return;
  }
  const result = createOrder({
    customerId: Number(form.querySelector("[data-field=customer]").value),
    status: "pendente",
    dueAt: shiftDays(1),
    items: [{ productId, qty, price: productById(productId).price }],
  });
  if (typeof result === "string") {
    error.textContent = result;
    return;
  }
  const customer = customerById(result.customerId);
  const product = productById(productId);
  const note = `Criei a encomenda #${result.id} para ${customer.name}: ${product.name} × ${qty}.`;
  recordAction(message, `${note} Stock atualizado.`, `${note} O stock foi atualizado.`);
}

function confirmProposedMessage(message, form) {
  const orderId = Number(form.querySelector("[data-field=order]").value);
  const order = state.orders.find((item) => item.id === orderId);
  const error = form.querySelector("[data-error]");
  if (!order || order.status !== "em_preparacao") {
    error.textContent = "Essa encomenda já não está em preparação.";
    return;
  }
  const customer = customerById(order.customerId);
  const note = `Mensagem registada para ${customer.name} sobre a encomenda #${order.id}.`;
  recordAction(message, `${note} «${messageBody(order)}»`, `${note} Não foi enviada.`);
}

function cancelProposal(message) {
  message.proposal.resolved = "cancelled";
  state.thread.push({ id: ++messageSeq, role: "assistant", text: "Está bem, não fiz essa ação." });
  persist();
  renderThread();
}

function announce(text) {
  const node = document.getElementById("status");
  node.textContent = "";
  window.setTimeout(() => {
    node.textContent = text;
  }, 20);
}

function renderToday() {
  const label = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("today-label").textContent = label.charAt(0).toUpperCase() + label.slice(1);
}

function renderPainel() {
  const now = new Date();
  const deliveredToday = state.orders.filter((order) => order.status === "entregue" && order.deliveredAt && sameDay(order.deliveredAt, now));
  const createdToday = state.orders.filter((order) => sameDay(order.createdAt, now));
  const low = state.products.filter((product) => product.quantity < product.minStock);
  const open = state.orders.filter((order) => order.status !== "entregue");
  const late = open.filter(isLate);
  const sales = deliveredToday.reduce((sum, order) => sum + orderTotal(order), 0);

  const metrics = document.getElementById("metrics");
  metrics.replaceChildren(
    metric("Vendas de hoje", formatMoney(sales), `${deliveredToday.length} ${deliveredToday.length === 1 ? "entregue" : "entregues"}`),
    metric("Encomendas de hoje", String(createdToday.length), createdToday.length === 1 ? "criada hoje" : "criadas hoje"),
    metric("Stock baixo", String(low.length), low.length === 1 ? "produto abaixo do mínimo" : "produtos abaixo do mínimo"),
    metric("Por tratar", String(open.length), late.length ? `${late.length} ${late.length === 1 ? "atrasada" : "atrasadas"}` : "nenhuma atrasada"),
  );
  document.getElementById("compare-text").textContent = salesText();

  const lowList = document.getElementById("low-stock");
  lowList.replaceChildren();
  if (!low.length) lowList.append(el("li", { class: "empty", text: "Nenhum produto abaixo do mínimo." }));
  low.forEach((product) => {
    const link = el("a", { href: "#produtos", text: product.name });
    link.addEventListener("click", () => {
      ui.productFilter = "baixo";
      ui.productQuery = "";
      document.getElementById("product-search").value = "";
      updatePressed("[data-product-filter]", "productFilter", ui.productFilter);
      renderProducts();
    });
    lowList.append(el("li", {}, [
      link,
      el("p", { class: "meta", text: `${product.quantity} em stock · mínimo ${product.minStock} · faltam ${product.minStock - product.quantity}` }),
    ]));
  });

  const openList = document.getElementById("open-orders");
  openList.replaceChildren();
  if (!open.length) openList.append(el("li", { class: "empty", text: "Nada pendente. A loja está em dia." }));
  open
    .slice()
    .sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || new Date(a.dueAt) - new Date(b.dueAt))
    .forEach((order) => {
      const customer = customerById(order.customerId);
      const link = el("a", { href: "#encomendas", text: `#${order.id} · ${customer ? customer.name : "Cliente"}` });
      link.addEventListener("click", () => {
        ui.highlightOrderId = order.id;
        ui.orderFilter = "todas";
        updatePressed("[data-order-filter]", "orderFilter", ui.orderFilter);
        renderOrders();
      });
      openList.append(el("li", {}, [
        el("div", { class: "person-top" }, [
          link,
          isLate(order) ? el("span", { class: "badge badge-late", text: "Atrasada" }) : el("span", { class: `badge badge-${order.status}`, text: STATUS_LABEL[order.status] }),
        ]),
        el("p", { class: "meta", text: `${itemSummary(order)} · prevista ${formatDate(order.dueAt)}` }),
      ]));
    });
}

function metric(label, value, hint) {
  return el("li", {}, [
    el("p", { class: "metric-label", text: label }),
    el("p", { class: "metric-value", text: value }),
    el("p", { class: "metric-hint", text: hint }),
  ]);
}

function visibleCustomers() {
  const query = normalize(ui.customerQuery.trim());
  return CUSTOMERS.filter((customer) => {
    const inactive = isInactive(customer.id);
    if (ui.customerFilter === "ativos" && inactive) return false;
    if (ui.customerFilter === "inativos" && !inactive) return false;
    if (!query) return true;
    return [customer.name, customer.phone, customer.email, customer.notes].some((field) => normalize(field).includes(query));
  });
}

function renderCustomers() {
  const list = document.getElementById("customer-list");
  const customers = visibleCustomers();
  list.replaceChildren();
  if (!customers.length) {
    list.append(el("li", { class: "empty", text: "Nenhum cliente corresponde à pesquisa." }));
  }
  customers.forEach((customer) => {
    const last = lastDelivered(customer.id);
    const inactive = isInactive(customer.id);
    const selected = customer.id === ui.selectedCustomerId;
    const button = el("button", {
      type: "button",
      "aria-pressed": selected ? "true" : "false",
    }, [customer.name]);
    const card = el("article", { class: `person${selected ? " is-selected" : ""}` }, [
      el("div", { class: "person-top" }, [
        el("h2", {}, [button]),
        inactive ? el("span", { class: "badge badge-late", text: "Inativo" }) : el("span", { class: "badge badge-ok", text: "Ativo" }),
      ]),
      el("p", { class: "meta", text: `${customer.phone} · última compra ${last ? daysLabel(last.deliveredAt) : "sem registo"}` }),
    ]);
    card.addEventListener("click", () => {
      ui.selectedCustomerId = customer.id;
      renderCustomers();
      const next = document.querySelector(".person.is-selected button");
      if (next) next.focus();
    });
    list.append(el("li", {}, [card]));
  });
  renderCustomerDetail();
}

function renderCustomerDetail() {
  const panel = document.getElementById("customer-detail");
  const customer = customerById(ui.selectedCustomerId);
  if (!customer) {
    panel.replaceChildren(el("p", { class: "empty", text: "Escolha um cliente para ver o contacto, as notas e o histórico." }));
    return;
  }
  const history = state.orders
    .filter((order) => order.customerId === customer.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const items = history.map((order) => el("li", {}, [
    el("h3", { text: `#${order.id} · ${STATUS_LABEL[order.status]}${isLate(order) ? " · atrasada" : ""}` }),
    el("p", { class: "meta", text: `${formatDate(order.createdAt)} · ${formatMoney(orderTotal(order))}` }),
    el("p", { text: itemSummary(order) }),
  ]));
  panel.replaceChildren(
    el("p", { class: "eyebrow", text: isInactive(customer.id) ? "Cliente inativo" : "Cliente ativo" }),
    el("h2", { text: customer.name }),
    el("p", {}, [el("a", { href: `tel:${customer.phone.replace(/\s/g, "")}`, text: customer.phone })]),
    el("p", {}, [el("a", { href: `mailto:${customer.email}`, text: customer.email })]),
    el("p", { text: customer.notes || "Sem notas." }),
    el("h3", { text: "Histórico" }),
    history.length ? el("ul", { class: "history" }, items) : el("p", { class: "empty", text: "Ainda não há encomendas deste cliente." }),
  );
}

function renderProducts() {
  const list = document.getElementById("product-list");
  const query = normalize(ui.productQuery.trim());
  const products = state.products.filter((product) => {
    const matches = !query || normalize(product.name).includes(query);
    const low = product.quantity < product.minStock;
    return matches && (ui.productFilter === "todos" || low);
  });
  list.replaceChildren();
  if (!products.length) {
    list.append(el("li", { class: "empty", text: "Nenhum produto corresponde." }));
    return;
  }
  products.forEach((product) => {
    const low = product.quantity < product.minStock;
    const qty = el("input", { type: "number", min: "0", step: "1", value: String(product.quantity), inputmode: "numeric", "aria-label": `Quantidade de ${product.name}` });
    const minimum = el("input", { type: "number", min: "0", step: "1", value: String(product.minStock), inputmode: "numeric", "aria-label": `Stock mínimo de ${product.name}` });
    const form = el("form", { class: "product" }, [
      el("div", {}, [
        el("div", { class: "product-top" }, [
          el("h2", { text: product.name }),
          low ? el("span", { class: "badge badge-alert", text: "Stock baixo" }) : el("span", { class: "badge badge-ok", text: "Ok" }),
        ]),
        el("p", { class: "price", text: formatMoney(product.price) }),
      ]),
      el("label", {}, ["Em stock", qty]),
      el("label", {}, ["Mínimo", minimum]),
      el("button", { class: "btn btn-ghost", type: "submit" }, ["Guardar"]),
    ]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextQty = readCount(qty.value);
      const nextMin = readCount(minimum.value);
      if (nextQty == null || nextMin == null) {
        announce("Use números inteiros, zero ou mais.");
        return;
      }
      product.quantity = nextQty;
      product.minStock = nextMin;
      persist();
      renderData();
      announce(`${product.name} atualizado.`);
    });
    list.append(el("li", {}, [form]));
  });
}

function sortedOrders() {
  return state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
}

function orderVisible(order) {
  if (ui.orderFilter === "todas") return true;
  if (ui.orderFilter === "atrasadas") return isLate(order);
  return order.status === ui.orderFilter;
}

function renderOrders() {
  const list = document.getElementById("order-list");
  const orders = sortedOrders().filter(orderVisible);
  list.replaceChildren();
  if (!orders.length) {
    list.append(el("p", { class: "empty", text: "Nenhuma encomenda neste filtro." }));
    return;
  }
  orders.forEach((order) => {
    const customer = customerById(order.customerId);
    const status = el("select", { "aria-label": `Estado da encomenda ${order.id}`, "data-status": String(order.id) });
    Object.entries(STATUS_LABEL).forEach(([value, label]) => {
      const option = el("option", { value, text: label });
      if (value === order.status) option.selected = true;
      status.append(option);
    });
    const card = el("article", {
      class: `order${isLate(order) ? " is-late" : ""}${order.id === ui.highlightOrderId ? " is-highlight" : ""}`,
      id: `order-${order.id}`,
    }, [
      el("div", { class: "order-top" }, [
        el("div", {}, [
          el("h2", { text: `#${order.id} · ${customer ? customer.name : "Cliente"}` }),
          el("p", { class: "meta", text: `Criada ${formatDate(order.createdAt)} · prevista ${formatDate(order.dueAt)} · ${formatMoney(orderTotal(order))}` }),
        ]),
        el("div", { class: "row-actions" }, [
          isLate(order) ? el("span", { class: "badge badge-late", text: "Atrasada" }) : "",
          status,
        ]),
      ]),
      el("p", { text: itemSummary(order) }),
      el("div", { class: "row-actions" }, [
        el("button", { type: "button", class: "btn btn-ghost", "data-edit": String(order.id) }, ["Editar"]),
        el("button", { type: "button", class: "btn btn-danger", "data-cancel-order": String(order.id) }, ["Anular"]),
      ]),
    ]);
    status.value = order.status;
    list.append(card);
  });
  if (document.documentElement.dataset.view !== "encomendas") return;
  const highlighted = document.getElementById(`order-${ui.highlightOrderId}`);
  if (highlighted) highlighted.scrollIntoView({ block: "nearest" });
}

function renderThread() {
  const thread = document.getElementById("thread");
  thread.replaceChildren();
  state.thread.forEach((message) => {
    const bubble = el("div", { class: `bubble bubble-${message.role}` }, [
      el("p", { text: message.text }),
    ]);
    if (message.proposal && !message.proposal.resolved) bubble.append(proposalForm(message));
    if (message.proposal && message.proposal.resolved === "replaced") {
      bubble.append(el("p", { class: "meta", text: "Confirmação fechada porque fez outra pergunta." }));
    }
    thread.append(bubble);
  });
  thread.scrollTop = thread.scrollHeight;
}

function proposalForm(message) {
  const error = el("p", { "data-error": true, role: "alert" });
  if (message.proposal.type === "order") {
    const customer = el("select", { "data-field": "customer" });
    CUSTOMERS.forEach((item) => customer.append(el("option", { value: String(item.id), text: item.name })));
    const product = el("select", { "data-field": "product" });
    state.products.forEach((item) => product.append(el("option", { value: String(item.id), text: item.name })));
    const qty = el("input", { "data-field": "qty", type: "number", min: "1", step: "1", value: "1", inputmode: "numeric" });
    return el("form", { class: "proposal", "data-proposal": "order", "data-message-id": String(message.id) }, [
      el("label", {}, ["Cliente", customer]),
      el("label", {}, ["Produto", product]),
      el("label", {}, ["Quantidade", qty]),
      error,
      el("div", { class: "proposal-actions" }, [
        el("button", { type: "submit", class: "btn btn-primary" }, ["Confirmar encomenda"]),
        el("button", { type: "button", class: "btn btn-ghost", "data-cancel-proposal": String(message.id) }, ["Cancelar"]),
      ]),
    ]);
  }
  const ready = readyOrders();
  const select = el("select", { "data-field": "order" });
  ready.forEach((order) => {
    const customer = customerById(order.customerId);
    select.append(el("option", { value: String(order.id), text: `#${order.id} · ${customer.name}` }));
  });
  const preview = el("p", { "data-preview": true, text: ready[0] ? messageBody(ready[0]) : "" });
  select.addEventListener("change", () => {
    const order = state.orders.find((item) => item.id === Number(select.value));
    preview.textContent = order ? messageBody(order) : "";
  });
  return el("form", { class: "proposal", "data-proposal": "message", "data-message-id": String(message.id) }, [
    el("label", {}, ["Encomenda em preparação", select]),
    preview,
    error,
    el("div", { class: "proposal-actions" }, [
      el("button", { type: "submit", class: "btn btn-primary" }, ["Confirmar e registar"]),
      el("button", { type: "button", class: "btn btn-ghost", "data-cancel-proposal": String(message.id) }, ["Cancelar"]),
    ]),
  ]);
}

function renderLog() {
  const list = document.getElementById("assistant-log");
  list.replaceChildren();
  if (!state.log.length) {
    list.append(el("li", { class: "empty", text: "Ainda não executei ações. Quando confirmar uma, fica aqui." }));
    return;
  }
  state.log.forEach((entry) => {
    list.append(el("li", {}, [
      el("time", { datetime: entry.at, text: formatDateTime(entry.at) }),
      el("p", { text: entry.text }),
    ]));
  });
}

function updatePressed(selector, attr, value) {
  document.querySelectorAll(selector).forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset[attr] === value ? "true" : "false");
  });
}

function renderData() {
  renderToday();
  renderPainel();
  renderCustomers();
  renderProducts();
  renderOrders();
  renderThread();
  renderLog();
}

function fillOrderSelects() {
  const customers = document.getElementById("order-customer");
  const statuses = document.getElementById("order-status");
  const products = document.getElementById("line-product");
  if (customers.options.length) return;
  CUSTOMERS.forEach((customer) => customers.append(el("option", { value: String(customer.id), text: customer.name })));
  Object.entries(STATUS_LABEL).forEach(([value, label]) => statuses.append(el("option", { value, text: label })));
  state.products.forEach((product) => products.append(el("option", { value: String(product.id), text: product.name })));
}

function renderDraftLines() {
  const list = document.getElementById("line-list");
  const total = ui.draftItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  list.replaceChildren();
  if (!ui.draftItems.length) list.append(el("li", { class: "empty", text: "Ainda sem produtos." }));
  ui.draftItems.forEach((item) => {
    const product = productById(item.productId);
    list.append(el("li", { class: "draft-line" }, [
      el("span", { text: `${product.name} × ${item.qty} · ${formatMoney(item.qty * item.price)}` }),
      el("button", { type: "button", class: "btn btn-danger", "data-remove-line": String(item.productId) }, ["Tirar"]),
    ]));
  });
  document.getElementById("draft-total").textContent = ui.draftItems.length ? `Total ${formatMoney(total)}` : "";
}

function openOrderDialog(order) {
  fillOrderSelects();
  ui.editingId = order ? order.id : null;
  ui.draftItems = order ? order.items.map((item) => ({ ...item })) : [];
  document.getElementById("order-dialog-title").textContent = order ? `Editar encomenda #${order.id}` : "Nova encomenda";
  document.getElementById("order-customer").value = String(order ? order.customerId : CUSTOMERS[0].id);
  document.getElementById("order-status").value = order ? order.status : "pendente";
  document.getElementById("order-due").value = dateInputValue(order ? order.dueAt : shiftDays(1));
  document.getElementById("order-error").textContent = "";
  document.getElementById("line-qty").value = "1";
  renderDraftLines();
  document.getElementById("order-dialog").showModal();
}

function addDraftLine() {
  const productId = Number(document.getElementById("line-product").value);
  const qty = readCount(document.getElementById("line-qty").value);
  const error = document.getElementById("order-error");
  if (!qty) {
    error.textContent = "A quantidade tem de ser um número inteiro maior que zero.";
    return;
  }
  const nextItems = ui.draftItems.map((item) => ({ ...item }));
  const existing = nextItems.find((item) => item.productId === productId);
  if (existing) existing.qty += qty;
  else nextItems.push({ productId, qty, price: productById(productId).price });
  const issue = stockIssue(nextItems, ui.editingId);
  if (issue) {
    error.textContent = issue;
    return;
  }
  ui.draftItems = nextItems;
  error.textContent = "";
  renderDraftLines();
}

function saveOrder(event) {
  event.preventDefault();
  const error = document.getElementById("order-error");
  if (!ui.draftItems.length) {
    error.textContent = "Adicione pelo menos um produto.";
    return;
  }
  const payload = {
    customerId: Number(document.getElementById("order-customer").value),
    status: document.getElementById("order-status").value,
    dueAt: new Date(`${document.getElementById("order-due").value}T12:00:00`).toISOString(),
    items: ui.draftItems.map((item) => ({ ...item })),
  };
  const editing = ui.editingId;
  const result = editing ? updateOrder(editing, payload) : createOrder(payload);
  if (typeof result === "string") {
    error.textContent = result;
    return;
  }
  document.getElementById("order-dialog").close();
  ui.highlightOrderId = result.id;
  renderData();
  announce(editing ? `Encomenda #${result.id} atualizada.` : `Encomenda #${result.id} criada.`);
}

function changeStatus(order, status) {
  if (order.status === status) return;
  const result = updateOrder(order.id, {
    customerId: order.customerId,
    status,
    dueAt: order.dueAt,
    items: order.items.map((item) => ({ ...item })),
  });
  if (typeof result === "string") {
    announce(result);
    renderOrders();
    return;
  }
  renderData();
  announce(`Encomenda #${order.id} marcada como ${STATUS_LABEL[status].toLowerCase()}.`);
}

function askCancel(order) {
  const customer = customerById(order.customerId);
  const ok = window.confirm(`Anular a encomenda #${order.id} de ${customer.name}? O stock volta à prateleira.`);
  if (!ok) return;
  cancelOrder(order.id);
  if (ui.highlightOrderId === order.id) ui.highlightOrderId = null;
  renderData();
  announce(`Encomenda #${order.id} anulada. Stock reposto.`);
}

function currentView() {
  const id = location.hash.slice(1);
  return VIEWS.includes(id) ? id : "inicio";
}

function syncView() {
  const id = currentView();
  if (location.hash.slice(1) !== id) history.replaceState(null, "", `#${id}`);
  document.documentElement.dataset.view = id;
  document.querySelectorAll(".tabs a").forEach((link) => {
    if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (!booted) return;
  const heading = document.getElementById(id).querySelector("h1");
  if (heading) heading.focus();
}

function boot() {
  document.querySelectorAll(".js-fallback").forEach((node) => node.remove());
  renderData();
  updatePressed("[data-customer-filter]", "customerFilter", ui.customerFilter);
  updatePressed("[data-product-filter]", "productFilter", ui.productFilter);
  updatePressed("[data-order-filter]", "orderFilter", ui.orderFilter);
  syncView();
  booted = true;

  window.addEventListener("hashchange", syncView);

  document.getElementById("reset").addEventListener("click", () => {
    const ok = window.confirm("Repor os dados de exemplo? Encomendas, stock e mensagens desta sessão são apagados.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = seed();
    messageSeq = maxMessageId(state.thread);
    ui.selectedCustomerId = 1;
    ui.highlightOrderId = null;
    ui.customerQuery = "";
    ui.productQuery = "";
    ui.customerFilter = "todos";
    ui.productFilter = "todos";
    ui.orderFilter = "todas";
    document.getElementById("customer-search").value = "";
    document.getElementById("product-search").value = "";
    updatePressed("[data-customer-filter]", "customerFilter", ui.customerFilter);
    updatePressed("[data-product-filter]", "productFilter", ui.productFilter);
    updatePressed("[data-order-filter]", "orderFilter", ui.orderFilter);
    renderData();
    announce("Dados de exemplo repostos.");
  });

  document.getElementById("customer-search").addEventListener("input", (event) => {
    ui.customerQuery = event.target.value;
    renderCustomers();
  });
  document.getElementById("product-search").addEventListener("input", (event) => {
    ui.productQuery = event.target.value;
    renderProducts();
  });
  document.querySelectorAll("[data-customer-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.customerFilter = button.dataset.customerFilter;
      updatePressed("[data-customer-filter]", "customerFilter", ui.customerFilter);
      renderCustomers();
    });
  });
  document.querySelectorAll("[data-product-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.productFilter = button.dataset.productFilter;
      updatePressed("[data-product-filter]", "productFilter", ui.productFilter);
      renderProducts();
    });
  });
  document.querySelectorAll("[data-order-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.orderFilter = button.dataset.orderFilter;
      updatePressed("[data-order-filter]", "orderFilter", ui.orderFilter);
      renderOrders();
    });
  });

  document.getElementById("new-order").addEventListener("click", () => openOrderDialog(null));
  document.getElementById("order-cancel").addEventListener("click", () => document.getElementById("order-dialog").close());
  document.getElementById("add-line").addEventListener("click", addDraftLine);
  document.getElementById("line-qty").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addDraftLine();
  });
  document.getElementById("order-form").addEventListener("submit", saveOrder);
  document.getElementById("line-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-line]");
    if (!button) return;
    ui.draftItems = ui.draftItems.filter((item) => item.productId !== Number(button.dataset.removeLine));
    renderDraftLines();
  });

  document.getElementById("order-list").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    if (edit) {
      openOrderDialog(state.orders.find((order) => order.id === Number(edit.dataset.edit)));
      return;
    }
    const cancel = event.target.closest("[data-cancel-order]");
    if (cancel) askCancel(state.orders.find((order) => order.id === Number(cancel.dataset.cancelOrder)));
  });
  document.getElementById("order-list").addEventListener("change", (event) => {
    const select = event.target.closest("[data-status]");
    if (!select) return;
    const order = state.orders.find((item) => item.id === Number(select.dataset.status));
    changeStatus(order, select.value);
  });

  document.body.addEventListener("click", (event) => {
    const asker = event.target.closest("[data-ask]");
    if (asker) ask(asker.dataset.ask);
    const cancel = event.target.closest("[data-cancel-proposal]");
    if (!cancel) return;
    const message = state.thread.find((item) => item.id === Number(cancel.dataset.cancelProposal));
    if (message) cancelProposal(message);
  });

  document.getElementById("thread").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-proposal]");
    if (!form) return;
    event.preventDefault();
    const message = state.thread.find((item) => item.id === Number(form.dataset.messageId));
    if (!message || !message.proposal || message.proposal.resolved) return;
    if (form.dataset.proposal === "order") confirmProposedOrder(message, form);
    if (form.dataset.proposal === "message") confirmProposedMessage(message, form);
  });

  document.getElementById("assistant-form").addEventListener("submit", (event) => {
    event.preventDefault();
    ask(document.getElementById("assistant-input").value);
    document.getElementById("assistant-input").focus();
  });
}

boot();
