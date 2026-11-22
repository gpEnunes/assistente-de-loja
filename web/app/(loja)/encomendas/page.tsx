"use client";

import { FormEvent, useState } from "react";
import { customerById, dueIso, dueTomorrow, findVariation, isLate, itemSummary, orderTotal, stockHasLeft } from "@/lib/domain";
import { STATUS_LABEL, WAIT_LABEL, dateInputValue, formatDate, formatMoney, readCount, statusText } from "@/lib/format";
import type { Line, Order, OrderStatus, Wait } from "@/lib/types";
import { announce } from "@/components/shell";
import { useShop } from "@/lib/shop";

type Filter = "todas" | OrderStatus | "atrasadas";

const FILTERS: Filter[] = ["todas", "em_preparacao", "a_processar", "entregue", "devolvida", "atrasadas"];

export default function EncomendasPage() {
  const shop = useShop();
  const { state } = shop;
  const [filter, setFilter] = useState<Filter>("todas");
  const [editing, setEditing] = useState<Order | "new" | null>(null);
  const [error, setError] = useState("");
  const variations = state.products.flatMap((product) => product.variations.map((item) => ({ product, item })));

  const shown = state.orders.filter((order) => {
    if (filter === "atrasadas") return isLate(order);
    if (filter === "todas") return true;
    return order.status === filter;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const variationId = String(data.get("variationId") || "");
    const qty = readCount(String(data.get("qty") || ""));
    const found = findVariation(state, variationId);
    if (!qty || !found) {
      setError("Indique uma quantidade inteira.");
      return;
    }
    const status = String(data.get("status")) as OrderStatus;
    const items: Line[] = [{ variationId, qty, price: found.product.price }];
    const draft = {
      customerId: Number(data.get("customerId")),
      status,
      espera: status === "em_preparacao" ? String(data.get("espera")) as Wait : null,
      dueAt: dueIso(String(data.get("dueAt"))),
      items,
    };
    const message = editing === "new" ? shop.createOrder(draft) : shop.updateOrder((editing as Order).id, draft);
    if (message) {
      setError(message);
      return;
    }
    const moved = stockHasLeft(status) ? "O stock saiu da prateleira." : "O stock da prateleira não mudou por este estado.";
    announce(editing === "new" ? `Encomenda criada. ${moved}` : `Encomenda atualizada. ${moved}`);
    setEditing(null);
    setError("");
  }

  const current = editing && editing !== "new" ? editing : null;

  return (
    <section className="screen" style={{ display: "block" }}>
      <div className="screen-head">
        <div>
          <h1>Encomendas</h1>
          <p className="intro">Em preparação o stock fica na prateleira. Sai quando o estado passa a processar ou a entregue. Devolvida repõe o que tinha saído. Atrasada é uma data prevista anterior a hoje, sem entrega nem devolução.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setError(""); setEditing("new"); }}>Nova encomenda</button>
      </div>
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Estado">
          {FILTERS.map((value) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === "todas" ? "Todas" : value === "atrasadas" ? "Atrasadas" : STATUS_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="order-list">
        {shown.length ? shown.map((order) => {
          const customer = customerById(state, order.customerId);
          return (
            <article key={order.id} className={isLate(order) ? "order is-late" : "order"}>
              <div className="order-top">
                <h2>#{order.id} · {customer?.name}</h2>
                <span className={isLate(order) ? "badge badge-late" : `badge badge-${order.status}`}>{isLate(order) ? "Atrasada" : statusText(order)}</span>
              </div>
              <p>{itemSummary(state, order)}</p>
              <p className="meta">Criada {formatDate(order.createdAt)} · prevista {formatDate(order.dueAt)} · {formatMoney(orderTotal(order))}</p>
              <div className="row-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { setError(""); setEditing(order); }}>Editar</button>
                <button type="button" className="btn btn-danger" onClick={() => {
                  const returned = stockHasLeft(order.status);
                  shop.cancelOrder(order.id);
                  announce(returned ? `Encomenda #${order.id} removida. O stock voltou.` : `Encomenda #${order.id} removida. O stock não mudou.`);
                }}>Remover</button>
              </div>
            </article>
          );
        }) : <p className="empty">Nenhuma encomenda neste filtro.</p>}
      </div>
      {editing ? (
        <dialog open aria-labelledby="order-title">
          <form onSubmit={save}>
            <h2 id="order-title">{current ? `Encomenda #${current.id}` : "Nova encomenda"}</h2>
            <label>
              Cliente
              <select name="customerId" defaultValue={current?.customerId ?? state.customers[0]?.id}>
                {state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label>
              Estado
              <select name="status" defaultValue={current?.status ?? "em_preparacao"}>
                {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
              </select>
            </label>
            <label>
              Espera
              <select name="espera" defaultValue={current?.espera ?? "aguarda_confirmacao"}>
                {(Object.keys(WAIT_LABEL) as Wait[]).map((wait) => <option key={wait} value={wait}>{WAIT_LABEL[wait]}</option>)}
              </select>
            </label>
            <label>Data prevista<input name="dueAt" type="date" defaultValue={current ? dateInputValue(current.dueAt) : dueTomorrow()} required /></label>
            <label>
              Variação
              <select name="variationId" defaultValue={current?.items[0]?.variationId ?? variations[0]?.item.id}>
                {variations.map(({ product, item }) => (
                  <option key={item.id} value={item.id}>{product.referencia} · {product.name} · {item.size}{item.color ? ` · ${item.color}` : ""}</option>
                ))}
              </select>
            </label>
            <label>Quantidade<input name="qty" inputMode="numeric" defaultValue={current?.items[0]?.qty ?? 1} required /></label>
            <p role="alert">{error}</p>
            <div className="dialog-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Fechar</button>
              <button className="btn btn-primary" type="submit">Guardar</button>
            </div>
          </form>
        </dialog>
      ) : null}
    </section>
  );
}
