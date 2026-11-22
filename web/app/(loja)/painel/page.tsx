"use client";

import Link from "next/link";
import { isLate, itemSummary, lowStock, monthSales, orderTotal, salesText, sameDay, variationLabel } from "@/lib/domain";
import { formatDate, formatMoney, statusText } from "@/lib/format";
import { useShop } from "@/lib/shop";

export default function PainelPage() {
  const { state } = useShop();
  const now = new Date();
  const deliveredToday = state.orders.filter((order) => order.status === "entregue" && order.deliveredAt && sameDay(order.deliveredAt, now));
  const createdToday = state.orders.filter((order) => sameDay(order.createdAt, now));
  const low = lowStock(state);
  const open = state.orders.filter((order) => order.status === "em_preparacao" || order.status === "a_processar");
  const late = open.filter(isLate);
  const sales = deliveredToday.reduce((sum, order) => sum + orderTotal(order), 0);
  const current = monthSales(state, 0);

  return (
    <section className="screen" style={{ display: "block" }}>
      <h1>Painel</h1>
      <p className="intro">Resumo de hoje na Mercearia Silva. Os números vêm dos dados de exemplo e do que alterar nesta sessão.</p>
      <ul className="metrics">
        <li>
          <p className="metric-label">Vendas de hoje</p>
          <p className="metric-value">{formatMoney(sales)}</p>
          <p className="metric-hint">{deliveredToday.length} {deliveredToday.length === 1 ? "entregue" : "entregues"}</p>
        </li>
        <li>
          <p className="metric-label">Encomendas de hoje</p>
          <p className="metric-value">{createdToday.length}</p>
          <p className="metric-hint">{createdToday.length === 1 ? "criada hoje" : "criadas hoje"}</p>
        </li>
        <li>
          <p className="metric-label">Stock baixo</p>
          <p className="metric-value">{low.length}</p>
          <p className="metric-hint">{low.length === 1 ? "variação abaixo do mínimo" : "variações abaixo do mínimo"}</p>
        </li>
        <li>
          <p className="metric-label">Por tratar</p>
          <p className="metric-value">{open.length}</p>
          <p className="metric-hint">{late.length ? `${late.length} ${late.length === 1 ? "atrasada" : "atrasadas"}` : "nenhuma atrasada"}</p>
        </li>
      </ul>
      <section className="compare" aria-label="Este mês e o anterior">
        <h2>Este mês e o anterior</h2>
        <p>{salesText(state)}</p>
        <p className="meta">{current.orders.length} entregas contam para {formatMoney(current.total)}.</p>
      </section>
      <div className="columns">
        <section className="panel">
          <h2>Stock baixo</h2>
          <ul className="stack">
            {low.length ? low.map(({ variation }) => (
              <li key={variation.id}>
                <Link href="/produtos">{variationLabel(state, variation.id)}</Link>
                <p className="meta">{variation.quantity} em stock · mínimo {variation.minStock} · faltam {variation.minStock - variation.quantity}</p>
              </li>
            )) : <li className="empty">Nenhuma variação abaixo do mínimo.</li>}
          </ul>
        </section>
        <section className="panel">
          <h2>Encomendas por tratar</h2>
          <ul className="stack">
            {open.length ? open.map((order) => {
              const customer = state.customers.find((item) => item.id === order.customerId);
              return (
                <li key={order.id}>
                  <div className="person-top">
                    <Link href="/encomendas">#{order.id} · {customer?.name}</Link>
                    <span className={isLate(order) ? "badge badge-late" : `badge badge-${order.status}`}>{isLate(order) ? "Atrasada" : statusText(order)}</span>
                  </div>
                  <p className="meta">{itemSummary(state, order)} · prevista {formatDate(order.dueAt)}</p>
                </li>
              );
            }) : <li className="empty">Nada por tratar.</li>}
          </ul>
        </section>
      </div>
    </section>
  );
}
