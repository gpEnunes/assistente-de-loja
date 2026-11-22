"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BRIDGE_KEY, bridgeReady, customerById, emptyBridge, isInactive, lastDelivered, orderTotal } from "@/lib/domain";
import { ORIGIN_LABEL, formatDate, formatMoney } from "@/lib/format";
import type { Customer, Origin } from "@/lib/types";
import { announce } from "@/components/shell";
import { useShop } from "@/lib/shop";

const PAGE_SIZE = 6;

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export default function ClientesPage() {
  const shop = useShop();
  const { state } = shop;
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState("todos");
  const [cobranca, setCobranca] = useState("todos");
  const [origem, setOrigem] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(state.customers[0]?.id ?? null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const visible = useMemo(() => state.customers.filter((customer) => {
    if (activity === "ativos" && isInactive(state, customer.id)) return false;
    if (activity === "inativos" && !isInactive(state, customer.id)) return false;
    if (cobranca === "sim" && !customer.cobranca) return false;
    if (cobranca === "nao" && customer.cobranca) return false;
    if (origem !== "todos" && customer.origem !== origem) return false;
    const haystack = normalize(`${customer.name} ${customer.phone} ${customer.address}`);
    return !query.trim() || haystack.includes(normalize(query));
  }), [state, activity, cobranca, origem, query]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const slice = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const suggestions = query.trim()
    ? state.customers.filter((customer) => normalize(`${customer.name} ${customer.phone} ${customer.address}`).includes(normalize(query))).slice(0, 6)
    : [];

  useEffect(() => {
    if (selected != null && !state.customers.some((customer) => customer.id === selected)) {
      setSelected(visible[0]?.id ?? null);
    }
  }, [state.customers, selected, visible]);

  function choose(customer: Customer) {
    const index = state.customers.findIndex((item) => item.id === customer.id);
    setActivity("todos");
    setCobranca("todos");
    setOrigem("todos");
    setQuery("");
    setSuggestOpen(false);
    setPage(Math.floor(Math.max(index, 0) / PAGE_SIZE));
    setSelected(customer.id);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected == null) return;
    const data = new FormData(event.currentTarget);
    shop.saveCustomer(selected, {
      name: String(data.get("name") || "").trim(),
      address: String(data.get("address") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      cobranca: data.get("cobranca") === "sim",
    });
    announce("Ficha atualizada.");
  }

  function sync() {
    const raw = localStorage.getItem(BRIDGE_KEY);
    const bridge = raw ? { ...emptyBridge(), ...JSON.parse(raw) } : emptyBridge();
    if (!bridgeReady(bridge)) {
      window.location.assign("/configuracoes");
      return;
    }
    announce("A conta está guardada. A leitura dos contactos faz-se no servidor, ainda sem chamada ao Meta.");
  }

  const detail = selected == null ? null : customerById(state, selected);
  const history = detail
    ? state.orders.filter((order) => order.customerId === detail.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const last = detail ? lastDelivered(state, detail.id) : null;

  return (
    <section className="screen" style={{ display: "block" }}>
      <div className="screen-head">
        <div>
          <h1>Clientes</h1>
          <p className="intro">Ficha local com foto, nome, morada, telefone, histórico e se pode receber à cobrança. A sincronização com o Meta fica no servidor.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={sync}>Sincronizar com a conta</button>
      </div>
      <div className="split">
        <div>
          <div className="toolbar">
          <div className="combo">
            <label className="search" htmlFor="customer-search"><span className="sr-only">Pesquisar clientes</span></label>
            <input
              id="customer-search"
              role="combobox"
              aria-expanded={suggestOpen}
              aria-controls="customer-suggest"
              value={query}
              placeholder="Nome, telefone ou morada"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
                setSuggestOpen(true);
                setActiveSuggestion(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSuggestOpen(true);
                  setActiveSuggestion((index) => Math.min(index + 1, suggestions.length - 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveSuggestion((index) => Math.max(index - 1, 0));
                }
                if (event.key === "Enter" && suggestOpen && suggestions[activeSuggestion]) {
                  event.preventDefault();
                  choose(suggestions[activeSuggestion]);
                }
                if (event.key === "Escape") setSuggestOpen(false);
              }}
            />
            <ul id="customer-suggest" className="suggest" role="listbox" hidden={!suggestOpen || suggestions.length === 0}>
              {suggestions.map((customer, index) => (
                <li
                  key={customer.id}
                  role="option"
                  aria-selected={index === activeSuggestion}
                  className={index === activeSuggestion ? "is-active" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(customer)}
                >
                  {customer.name}
                  <span>{customer.phone}</span>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="btn btn-ghost" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>Filtros</button>
          </div>
          <form className="advanced" hidden={!filtersOpen} onChange={() => setPage(0)}>
            <label>
              Atividade
              <select value={activity} onChange={(event) => setActivity(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </label>
            <label>
              À cobrança
              <select value={cobranca} onChange={(event) => setCobranca(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </label>
            <label>
              Origem
              <select value={origem} onChange={(event) => setOrigem(event.target.value)}>
                <option value="todos">Todas</option>
                {(Object.keys(ORIGIN_LABEL) as Origin[]).map((key) => <option key={key} value={key}>{ORIGIN_LABEL[key]}</option>)}
              </select>
            </label>
          </form>
          <ul className="stack">
            {slice.length ? slice.map((customer) => (
              <li key={customer.id}>
                <article className={customer.id === selected ? "person is-selected" : "person"} onClick={() => setSelected(customer.id)}>
                  <div className="person-top">
                    <span className="avatar">{customer.photo ? <img src={customer.photo} alt="" /> : initials(customer.name)}</span>
                    <h2><button type="button">{customer.name}</button></h2>
                  </div>
                  <p className="meta">{customer.phone} · {isInactive(state, customer.id) ? "inativo" : "ativo"}{customer.cobranca ? " · à cobrança" : ""}</p>
                </article>
              </li>
            )) : <li className="empty">Nenhum cliente com estes filtros.</li>}
          </ul>
          <nav className="pager" aria-label="Páginas de clientes">
            <button type="button" className="btn btn-ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <p>Página {currentPage + 1} de {pages}</p>
            <button type="button" className="btn btn-ghost" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Seguinte</button>
          </nav>
        </div>
        <aside className="detail" aria-label="Ficha do cliente">
          <div className="ficha">
          {detail ? (
            <form key={detail.id} onSubmit={save}>
              <div className="ficha-head">
                <span className="avatar avatar-lg">{detail.photo ? <img src={detail.photo} alt="" /> : initials(detail.name)}</span>
                <div>
                  <h2>{detail.name}</h2>
                  <p className="meta">Última entrega: {last?.deliveredAt ? formatDate(last.deliveredAt) : "ainda sem entregas"}</p>
                </div>
              </div>
              <label>Nome completo<input name="name" defaultValue={detail.name} required /></label>
              <label>Morada<input name="address" defaultValue={detail.address} required /></label>
              <label>Telefone<input name="phone" defaultValue={detail.phone} required /></label>
              <label>
                À cobrança
                <select name="cobranca" defaultValue={detail.cobranca ? "sim" : "nao"}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </label>
              <button className="btn btn-primary" type="submit">Guardar ficha</button>
              <h3>Histórico</h3>
              <ul className="history">
                {history.length ? history.map((order) => (
                  <li key={order.id}>
                    <strong>#{order.id}</strong>
                    <p className="meta">{formatDate(order.createdAt)} · {formatMoney(orderTotal(order))}</p>
                  </li>
                )) : <li className="empty">Sem encomendas.</li>}
              </ul>
            </form>
          ) : <p className="empty">Escolha um cliente.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
