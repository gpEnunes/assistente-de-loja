"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { customerById, messageBody, variationLabel } from "@/lib/domain";
import { formatDateTime, readCount } from "@/lib/format";
import { announce } from "@/components/shell";
import { useShop } from "@/lib/shop";

const CHIPS = [
  "O que preciso de repor?",
  "Quem está inativo?",
  "Como estão as vendas?",
  "Quem aguarda pagamento?",
  "Quem aguarda confirmação?",
  "O que está a processar?",
  "Quais foram devolvidas?",
  "Onde mora a Ana Costa?",
  "Prepara uma mensagem de levantamento",
  "Quero criar uma encomenda",
];

export default function AssistentePage() {
  const shop = useShop();
  const { state } = shop;
  const bottom = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [state.thread.length]);

  function send(text: string) {
    const question = text.trim();
    if (!question) return;
    shop.ask(question);
    setDraft("");
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  return (
    <section className="screen" style={{ display: "block" }}>
      <h1>Assistente</h1>
      <p className="intro">Perguntas sobre stock, clientes e vendas. Criar uma encomenda ou registar uma mensagem só acontece depois de confirmar.</p>
      <div className="assistant-layout">
        <div className="conversation">
        <div className="suggestions" role="group" aria-label="Perguntas frequentes">
          {CHIPS.map((chip) => <button key={chip} type="button" className="chip" onClick={() => send(chip)}>{chip}</button>)}
        </div>
        <div className="thread" aria-live="polite">
          {state.thread.map((message) => (
            <article key={message.id} className={message.role === "user" ? "bubble bubble-user" : "bubble bubble-assistant"}>
              <p>{message.text}</p>
              {message.proposal?.type === "order" && !message.proposal.resolved ? (
                <form className="proposal" onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const qty = readCount(String(data.get("qty") || ""));
                  if (!qty) {
                    setError("Indique uma quantidade inteira.");
                    return;
                  }
                  const result = shop.confirmOrder(message.id, Number(data.get("customerId")), String(data.get("variationId")), qty);
                  if (result) setError(result);
                  else {
                    setError("");
                    announce("Encomenda criada pelo assistente.");
                  }
                }}>
                  <label>Cliente
                    <select name="customerId">{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
                  </label>
                  <label>Variação
                    <select name="variationId">{state.products.flatMap((product) => product.variations.map((item) => <option key={item.id} value={item.id}>{variationLabel(state, item.id)}</option>))}</select>
                  </label>
                  <label>Quantidade<input name="qty" inputMode="numeric" defaultValue="1" /></label>
                  <div className="proposal-actions">
                    <button className="btn btn-primary" type="submit">Confirmar encomenda</button>
                    <button className="btn btn-ghost" type="button" onClick={() => shop.cancelProposal(message.id)}>Cancelar</button>
                  </div>
                </form>
              ) : null}
              {message.proposal?.type === "message" && !message.proposal.resolved ? (
                <form className="proposal" onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const result = shop.confirmMessage(message.id, Number(data.get("orderId")));
                  if (result) setError(result);
                  else {
                    setError("");
                    announce("Mensagem registada. Não foi enviada.");
                  }
                }}>
                  <label>Encomenda em preparação
                    <select name="orderId">
                      {state.orders.filter((order) => order.status === "a_processar").map((order) => {
                        const customer = customerById(state, order.customerId);
                        return <option key={order.id} value={order.id}>#{order.id} · {customer?.name} · {variationLabel(state, order.items[0]?.variationId)}</option>;
                      })}
                    </select>
                  </label>
                  <p className="meta">{messageBody(state, state.orders.find((order) => order.status === "a_processar")!)}</p>
                  <div className="proposal-actions">
                    <button className="btn btn-primary" type="submit">Registar mensagem</button>
                    <button className="btn btn-ghost" type="button" onClick={() => shop.cancelProposal(message.id)}>Cancelar</button>
                  </div>
                </form>
              ) : null}
            </article>
          ))}
          <div ref={bottom} />
        </div>
        <form className="ask" onSubmit={submit}>
          <label className="sr-only" htmlFor="pergunta">Pergunta</label>
          <input id="pergunta" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva a pergunta" />
          <button className="btn btn-primary" type="submit">Perguntar</button>
        </form>
        <p role="alert">{error}</p>
        </div>
        <section className="panel">
          <h2>Registo</h2>
          <ul className="log">
            {state.log.length ? state.log.map((entry) => (
              <li key={entry.at + entry.text}>
                <p>{entry.text}</p>
                <p className="meta">{formatDateTime(entry.at)}</p>
              </li>
            )) : <li className="empty">Ainda sem ações confirmadas.</li>}
          </ul>
        </section>
      </div>
    </section>
  );
}
