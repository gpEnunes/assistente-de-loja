# Assistente de Loja

> Uma app simples e pública para qualquer pequeno comércio gerir clientes, stock e encomendas no dia a dia, com um assistente de IA que ajuda a decidir e a agir.

## Problema

Muitos pequenos comércios (lojas, cafés, oficinas, mercearias) ainda gerem clientes, stock e encomendas em cadernos, folhas de Excel ou de memória. As soluções existentes são caras, complexas ou pensadas para empresas maiores.

## Visão

Uma app que qualquer dono de comércio consegue usar em minutos, sem formação, e que responde a perguntas do dia a dia como:

- "O que tenho de repor esta semana?"
- "Que clientes não compram há dois meses?"
- "Quanto vendi este mês comparado com o anterior?"
- "Prepara uma mensagem para o cliente a avisar que a encomenda chegou."

## Público-alvo

- Donos e funcionários de pequenos comércios, de qualquer setor.
- Pessoas com pouca experiência técnica, que precisam de algo claro e rápido.

## Funcionalidades principais

### Painel (resumo do dia)
- Vendas e encomendas do dia.
- Alertas de stock baixo.
- Encomendas pendentes e atrasadas.

### Clientes
- Lista de clientes com contacto, notas e histórico de compras.
- Pesquisa e filtros.

### Produtos e stock
- Catálogo de produtos com preço, quantidade e stock mínimo.
- Alertas quando um produto fica abaixo do mínimo.

### Encomendas
- Criar, editar e acompanhar encomendas (pendente, em preparação, entregue).
- Associar encomendas a clientes e produtos, com atualização automática do stock.

### Assistente de IA
- Responde a perguntas sobre os dados do negócio.
- Sugere reposições e identifica clientes inativos.
- Executa ações com confirmação (criar encomenda, preparar mensagem a um cliente).
- Mantém um registo de tudo o que fez.

## Princípios

- **Simples primeiro**: cada ecrã resolve uma coisa e está a um clique.
- **Utilizável em cada fase**: cada entrega do roadmap é uma versão que já se pode usar.
- **Público**: qualquer comércio se pode registar e usar.
- **IA útil, não decorativa**: o assistente trabalha sobre dados reais e faz ações concretas, sempre com confirmação.
- **Privacidade**: os dados de cada negócio são só desse negócio (RGPD).

## Stack por fase

O produto é sempre o mesmo e evolui em cinco fases, cada uma utilizável:

| Fase | Tecnologia | Foco |
|------|------------|------|
| 1 | HTML e CSS (com JavaScript mínimo) | Landing page e ecrãs base, dados no browser |
| 2 | React | SPA com componentes, pesquisa, filtros e alertas |
| 3 | Next.js | Rotas, login e primeira versão do assistente de IA |
| 4 | Node.js e Express | API com base de dados, vários utilizadores por negócio, assistente com ações |
| 5 | Deploy | Docker, testes, CI e alojamento público |

> O roadmap detalhado de cada fase é definido dentro do projeto.

## Fora de âmbito (por agora)

- Faturação certificada pela AT.
- Integrações com ERPs.
- App nativa para telemóvel.
