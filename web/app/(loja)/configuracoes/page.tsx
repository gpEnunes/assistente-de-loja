"use client";

import { FormEvent, useEffect, useState } from "react";
import { BRIDGE_KEY, bridgeReady, emptyBridge } from "@/lib/domain";
import type { Bridge } from "@/lib/types";
import { announce } from "@/components/shell";

export default function ConfiguracoesPage() {
  const [bridge, setBridge] = useState<Bridge>(emptyBridge);
  const [status, setStatus] = useState("Por ligar.");

  useEffect(() => {
    const raw = localStorage.getItem(BRIDGE_KEY);
    if (!raw) return;
    const saved = { ...emptyBridge(), ...JSON.parse(raw) } as Bridge;
    setBridge(saved);
    setStatus(bridgeReady(saved)
      ? "Identificadores guardados. A leitura dos contactos faz-se no servidor."
      : "Por ligar.");
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Bridge = {
      appId: String(data.get("appId") || "").trim(),
      portfolioId: String(data.get("portfolioId") || "").trim(),
      pageId: String(data.get("pageId") || "").trim(),
      instagramId: String(data.get("instagramId") || "").trim(),
      whatsappId: String(data.get("whatsappId") || "").trim(),
      phoneId: String(data.get("phoneId") || "").trim(),
    };
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(next));
    setBridge(next);
    const text = bridgeReady(next)
      ? "Identificadores guardados. A leitura dos contactos faz-se no servidor."
      : "Por ligar.";
    setStatus(text);
    announce(text);
  }

  return (
    <section className="screen" style={{ display: "block" }}>
      <h1>Conta</h1>
      <p className="intro">Identificadores da ponte com o Meta for Business. O token fica no servidor e não entra neste ecrã.</p>
      <form className="bridge" onSubmit={save}>
        <label>App ID<input name="appId" defaultValue={bridge.appId} /></label>
        <label>Business portfolio ID<input name="portfolioId" defaultValue={bridge.portfolioId} /></label>
        <label>Page ID<input name="pageId" defaultValue={bridge.pageId} /></label>
        <label>Instagram ID<input name="instagramId" defaultValue={bridge.instagramId} /></label>
        <label>WhatsApp business account ID<input name="whatsappId" defaultValue={bridge.whatsappId} /></label>
        <label>Phone number ID<input name="phoneId" defaultValue={bridge.phoneId} /></label>
        <p id="bridge-status">{status}</p>
        <button className="btn btn-primary" type="submit">Guardar</button>
      </form>
    </section>
  );
}
