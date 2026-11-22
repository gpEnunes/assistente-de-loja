import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assistente de Loja",
  description: "Clientes, stock e encomendas para pequenos comércios, com um assistente que só age depois de confirmação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
