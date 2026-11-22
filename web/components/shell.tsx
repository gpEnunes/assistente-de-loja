"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SESSION_KEY } from "@/lib/domain";
import { todayLabel } from "@/lib/format";
import { ShopProvider, useShop } from "@/lib/shop";

const LINKS = [
  ["/painel", "Painel"],
  ["/clientes", "Clientes"],
  ["/produtos", "Produtos"],
  ["/encomendas", "Encomendas"],
  ["/assistente", "Assistente"],
  ["/configuracoes", "Conta"],
] as const;

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shop = useShop();
  const [status, setStatus] = useState("");

  useEffect(() => {
    function onStatus(event: Event) {
      setStatus((event as CustomEvent<string>).detail);
    }
    window.addEventListener("loja-status", onStatus);
    return () => window.removeEventListener("loja-status", onStatus);
  }, []);

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    router.replace("/entrar");
  }

  function reset() {
    if (!window.confirm("Repor os dados de exemplo? Encomendas, stock e mensagens desta sessão são apagados.")) return;
    shop.reset();
    window.dispatchEvent(new CustomEvent("loja-status", { detail: "Dados de exemplo repostos." }));
  }

  return (
    <div className="app">
      <div className="shell">
        <header className="mast">
          <Link className="brand" href="/painel">
            <span className="mark">AL</span>
            <span>
              <span className="brand-name">Assistente de Loja</span>
              <span className="shop">Mercearia Silva</span>
            </span>
          </Link>
          <div className="mast-side">
            <p className="today">{todayLabel()}</p>
            <button type="button" className="btn btn-ghost" onClick={reset}>Repor dados</button>
            <button type="button" className="btn btn-ghost" onClick={logout}>Sair</button>
          </div>
        </header>
        <div className="workspace">
          <nav className="rail" aria-label="Secções">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
            ))}
          </nav>
          <main id="conteudo" tabIndex={-1}>
            <p id="status" className="sr-only" aria-live="polite">{status}</p>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function ShopFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) router.replace("/entrar");
    else setAllowed(true);
  }, [router]);

  if (!allowed) return null;
  return (
    <ShopProvider>
      <Frame>{children}</Frame>
    </ShopProvider>
  );
}

export function announce(text: string) {
  window.dispatchEvent(new CustomEvent("loja-status", { detail: "" }));
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("loja-status", { detail: text }));
  }, 20);
}
