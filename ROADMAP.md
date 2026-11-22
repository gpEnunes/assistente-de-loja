# Roteiro

O mesmo produto, cinco vezes: o assistente de loja descrito em APP.md. Painel do dia, clientes, produtos e stock, encomendas e um assistente que só age com confirmação. Cada fase entrega a app inteira e utilizável. Não há fase à parte de integração. O TypeScript começa na fase 2.

O quadro de stack em APP.md é um esboço. Vale este roteiro.

## 1. HTML e CSS, com dados de exemplo

**Entrega.** Landing e os ecrãs do dia a dia num site estático (`index.html`, `styles.css`, `app.js`). Uma loja de exemplo, com os dados no browser. JavaScript mínimo para pesquisar, filtrar, gravar encomendas e atualizar o stock.

**Feito quando.** Dá para ver vendas e encomendas do dia, alertas de stock baixo e encomendas pendentes ou atrasadas. Dá para procurar clientes e filtrar inativos, com contacto, notas e histórico. Dá para ver o preço e corrigir quantidade e stock mínimo. Dá para criar, editar e anular encomendas (pendente, em preparação, entregue), com o stock a acompanhar. Dá para fazer as perguntas do dia a dia ao assistente e confirmar antes de criar uma encomenda ou registar uma mensagem. A ação fica no registo.

## 2. O mesmo produto em React e TypeScript

**Entrega.** A mesma loja como SPA em React e TypeScript, partida em componentes. É a primeira fase com tipos.

**Feito quando.** Os fluxos da fase 1 funcionam na SPA: pesquisa, filtros, alertas, encomendas com stock e assistente com confirmação e registo.

## 3. O mesmo produto em Next.js

**Entrega.** A mesma loja em Next.js, com uma rota por ecrã.

**Feito quando.** Painel, clientes, produtos, encomendas e assistente abrem por rota, e os fluxos da fase 2 continuam a funcionar.

## 4. A mesma funcionalidade com API em Node (`node:http`)

**Entrega.** API escrita só com `node:http`, sem Express. A app lê e grava no servidor. Os dados de cada negócio ficam separados.

**Feito quando.** Painel, clientes, produtos, encomendas, stock e assistente usam a API. Criar ou editar uma encomenda atualiza o stock no servidor. O assistente age sobre esses dados e regista o que foi confirmado. Um negócio não vê os dados de outro.

## 5. A mesma API passada para Express

**Entrega.** As mesmas rotas e o mesmo comportamento, agora em Express.

**Feito quando.** Tudo o que a fase 4 faz continua a funcionar, com a API em Express, e a loja segue utilizável de ponta a ponta.
