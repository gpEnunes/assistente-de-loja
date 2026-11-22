"use client";

import { FormEvent, useState } from "react";
import { variationLabel } from "@/lib/domain";
import { formatMoney, readStock } from "@/lib/format";
import type { VariationDraft } from "@/lib/types";
import { announce } from "@/components/shell";
import { useShop } from "@/lib/shop";

type Dialog =
  | { kind: "stock"; variationId: string }
  | { kind: "variation"; productId: number }
  | { kind: "product" }
  | null;

function draftFrom(data: FormData): VariationDraft | null {
  const quantity = readStock(String(data.get("quantity") || ""));
  const minStock = readStock(String(data.get("minStock") || ""));
  if (quantity == null || minStock == null) return null;
  return {
    size: String(data.get("size") || ""),
    color: String(data.get("color") || ""),
    quantity,
    minStock,
  };
}

export default function ProdutosPage() {
  const shop = useShop();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState("");

  function saveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog?.kind !== "stock") return;
    const data = new FormData(event.currentTarget);
    const quantity = readStock(String(data.get("quantity") || ""));
    const minStock = readStock(String(data.get("minStock") || ""));
    if (quantity == null || minStock == null) return;
    shop.saveVariation(dialog.variationId, quantity, minStock);
    announce("Stock da variação atualizado.");
    setDialog(null);
  }

  function saveVariation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog?.kind !== "variation") return;
    const draft = draftFrom(new FormData(event.currentTarget));
    if (!draft) return;
    const message = shop.addVariation(dialog.productId, draft);
    if (message) {
      setError(message);
      return;
    }
    announce("Variação criada.");
    setDialog(null);
  }

  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const draft = draftFrom(data);
    const price = Number(String(data.get("price") || "").replace(",", "."));
    if (!draft || !Number.isFinite(price)) return;
    const message = shop.createProduct(String(data.get("referencia") || ""), String(data.get("name") || ""), price, draft);
    if (message) {
      setError(message);
      return;
    }
    announce("Produto criado.");
    setDialog(null);
  }

  const editing = dialog?.kind === "stock"
    ? shop.state.products.flatMap((product) => product.variations).find((item) => item.id === dialog.variationId)
    : null;

  return (
    <section className="screen" style={{ display: "block" }}>
      <div className="screen-head">
        <div>
          <h1>Produtos</h1>
          <p className="intro">A referência identifica o produto. O stock vive em cada variação: tamanho é a embalagem e a cor pode ficar vazia.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setError(""); setDialog({ kind: "product" }); }}>Novo produto</button>
      </div>
      <ul className="catalog">
        {shop.state.products.map((product) => (
          <li key={product.id} className="product" style={{ gridTemplateColumns: "1fr" }}>
            <div className="product-top">
              <h2>{product.name}</h2>
              <span className="meta">{product.referencia} · {formatMoney(product.price)}</span>
              <button type="button" className="btn btn-ghost" onClick={() => { setError(""); setDialog({ kind: "variation", productId: product.id }); }}>Nova variação</button>
            </div>
            <ul className="stack">
              {product.variations.map((item) => {
                const low = item.quantity < item.minStock;
                return (
                  <li key={item.id} className="person-top">
                    <div>
                      <strong>{variationLabel(shop.state, item.id)}</strong>
                      <p className="meta">{item.quantity} em stock · mínimo {item.minStock}</p>
                    </div>
                    <span className={low ? "badge badge-alert" : "badge badge-ok"}>{low ? "Abaixo do mínimo" : "Ok"}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => { setError(""); setDialog({ kind: "stock", variationId: item.id }); }}>Ajustar</button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {dialog?.kind === "stock" && editing ? (
        <dialog open aria-labelledby="stock-title">
          <form onSubmit={saveStock}>
            <h2 id="stock-title">{variationLabel(shop.state, editing.id)}</h2>
            <label>Quantidade<input name="quantity" inputMode="numeric" defaultValue={editing.quantity} required /></label>
            <label>Stock mínimo<input name="minStock" inputMode="numeric" defaultValue={editing.minStock} required /></label>
            <div className="dialog-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setDialog(null)}>Cancelar</button>
              <button className="btn btn-primary" type="submit">Guardar</button>
            </div>
          </form>
        </dialog>
      ) : null}
      {dialog?.kind === "variation" ? (
        <dialog open aria-labelledby="variation-title">
          <form onSubmit={saveVariation}>
            <h2 id="variation-title">Nova variação</h2>
            <label>Tamanho ou embalagem<input name="size" required placeholder="250g" /></label>
            <label>Cor<input name="color" placeholder="pode ficar vazio" /></label>
            <label>Quantidade<input name="quantity" inputMode="numeric" defaultValue="0" required /></label>
            <label>Stock mínimo<input name="minStock" inputMode="numeric" defaultValue="1" required /></label>
            <p role="alert">{error}</p>
            <div className="dialog-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setDialog(null)}>Cancelar</button>
              <button className="btn btn-primary" type="submit">Criar</button>
            </div>
          </form>
        </dialog>
      ) : null}
      {dialog?.kind === "product" ? (
        <dialog open aria-labelledby="product-title">
          <form onSubmit={saveProduct}>
            <h2 id="product-title">Novo produto</h2>
            <label>Referência<input name="referencia" required /></label>
            <label>Nome<input name="name" required /></label>
            <label>Preço<input name="price" inputMode="decimal" required placeholder="1,50" /></label>
            <label>Tamanho ou embalagem<input name="size" required /></label>
            <label>Cor<input name="color" placeholder="pode ficar vazio" /></label>
            <label>Quantidade<input name="quantity" inputMode="numeric" defaultValue="0" required /></label>
            <label>Stock mínimo<input name="minStock" inputMode="numeric" defaultValue="1" required /></label>
            <p role="alert">{error}</p>
            <div className="dialog-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setDialog(null)}>Cancelar</button>
              <button className="btn btn-primary" type="submit">Criar</button>
            </div>
          </form>
        </dialog>
      ) : null}
    </section>
  );
}
