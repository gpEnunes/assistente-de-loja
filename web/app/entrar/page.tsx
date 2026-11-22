"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNT, SESSION_KEY } from "@/lib/domain";

export default function EntrarPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    if (email !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
      setError("Correio ou palavra-passe incorretos.");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, shop: DEMO_ACCOUNT.shop }));
    router.replace("/painel");
  }

  return (
    <div className="gate" style={{ display: "grid" }}>
      <section className="gate-story">
        <p className="gate-mark">AL</p>
        <div>
          <p className="gate-shop">Mercearia Silva</p>
          <h1>A loja fica atrás desta porta.</h1>
          <ul className="gate-points">
            <li>O dia: vendas, stock baixo e encomendas por tratar.</li>
            <li>Clientes, produtos e encomendas no mesmo sítio.</li>
            <li>O assistente só age depois de confirmar.</li>
          </ul>
        </div>
      </section>
      <section className="gate-form">
        <form method="post" onSubmit={submit}>
          <h2>Entrar</h2>
          <p className="intro">A conta de exemplo abre a Mercearia Silva neste separador.</p>
          <label>
            Correio eletrónico
            <input name="email" type="email" defaultValue="silva@mercearia.pt" required autoComplete="username" />
          </label>
          <label>
            Palavra-passe
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <p id="login-error" role="alert">{error}</p>
          <button className="btn btn-primary" type="submit">Entrar</button>
          <p className="note">Conta de exemplo: silva@mercearia.pt, palavra-passe loja. A sessão acaba quando o separador fecha.</p>
        </form>
      </section>
    </div>
  );
}
