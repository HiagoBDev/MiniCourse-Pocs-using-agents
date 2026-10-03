# Triagem Automática de Tickets com IA — POC

Prova de conceito desenvolvida como demonstração prática do minicurso **"IA Generativa e Agentes
na Construção de POCs de Mercado"**, ministrado por Hiago Borgaço em 01/10/2026 para alunos de
graduação da **UniFacimp Wyden**, em Imperatriz – MA.

O objetivo da demonstração foi mostrar, em sala, um agente de código implementando uma
funcionalidade completa a partir de um card de requisitos (estilo Jira), com o desenvolvedor
atuando na definição do problema, na aprovação do plano e na revisão do resultado. O material
de apoio da aula está em [`IA Generativa e Agentes em POCs.html`](./IA%20Generativa%20e%20Agentes%20em%20POCs.html).

## Problema e proposta

Equipes de suporte gastam tempo lendo e classificando tickets manualmente. A POC avalia se dois
modelos com papéis distintos, combinados, conseguem fazer essa triagem com qualidade útil:

- **Gemini (Google)**, um LLM generativo, produz um **resumo** de até duas frases;
- **JEV (TypeSafe AI)**, um modelo de decisão, **classifica** categoria, prioridade e
  sentimento entre opções fixas e devolve a **confiança** de cada decisão.

A escolha ilustra um ponto discutido no minicurso: tarefas de escrita e tarefas de decisão têm
naturezas diferentes e podem ser atendidas por modelos diferentes.

## O que foi implementado

- **Triagem síncrona**: o backend chama os dois modelos em paralelo (`Promise.allSettled`) e
  salva o ticket com o resultado.
- **Tolerância a falhas parciais**: o status é `CONCLUIDA` (os dois responderam), `PARCIAL`
  (só um) ou `FALHA` (nenhum); o ticket é persistido em todos os casos, com mensagem amigável
  para o usuário e o detalhe técnico apenas no log.
- **Revisão humana**: o ticket é marcado com *"Revisar manualmente"* quando qualquer confiança
  do JEV fica abaixo de 0,7 ou quando a triagem não é concluída.
- **Mitigação de prompt injection**: no prompt do Gemini, o texto do cliente vai delimitado e é
  tratado como dado, nunca como instrução.
- **Saídas validadas**: as respostas dos dois modelos e as entradas da API são validadas com zod;
  categoria, prioridade e sentimento são valores fechados.
- **Interface**: formulário com contador de caracteres e tickets de exemplo, cards de resumo e de
  classificação (com barra de confiança), estado de carregamento e histórico dos últimos 50
  tickets.

### API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/tickets` | Recebe `{ titulo?, descricao }`, executa a triagem e retorna o ticket (400 se inválido) |
| `GET`  | `/api/tickets` | Lista até 50 tickets, do mais recente ao mais antigo |
| `GET`  | `/api/tickets/:id` | Detalhe de um ticket (404 se não existir) |

## Arquitetura e tecnologias

```
Frontend (React, local) ──/api──▶ Backend (Express, Docker) ──┬──▶ Gemini   (resumo)
                                         │                    └──▶ JEV      (classificação)
                                         ▼
                                  SQLite via Prisma (histórico)
```

| Camada | Tecnologias |
|--------|-------------|
| Backend | Node.js 22, Express 5, TypeScript (strict), zod 4, Prisma 7 + SQLite |
| Frontend | Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, sonner |
| Integrações | Gemini API (`gemini-3.8-flash`, saída JSON estruturada, temperatura 0,1) e TypeSafe AI (`jev-latest`, perguntas do tipo *choice*) |
| Infraestrutura | Docker Compose (backend e volume do banco) |

O backend segue uma arquitetura em camadas (*clean architecture* com *repository pattern*):
o domínio e os casos de uso não dependem de Express, Prisma ou das APIs externas, que ficam
isolados em repositórios e *gateways* na camada de infraestrutura. As chaves de API ficam
apenas no backend. Detalhes de estrutura e convenções estão em [CLAUDE.md](./CLAUDE.md).

## Metodologia: desenvolvimento com agente

O ambiente base (frontend, backend e banco conectados, sem regra de negócio) foi preparado
previamente. A funcionalidade foi implementada inteiramente pelo **Claude Code**, agente de
código da Anthropic, utilizando o modelo **Claude Opus 5.5** (`claude-opus-5-5`).

O fluxo seguiu o que foi apresentado na aula:

1. **Contexto**: o agente recebeu o `CLAUDE.md` (stack, arquitetura e convenções do projeto) e
   o card `card.md` (requisitos, regras de negócio e critérios de aceite).
2. **Pesquisa**: o agente consultou a documentação oficial da TypeSafe AI para confirmar o
   formato da API do JEV, em vez de supor um contrato.
3. **Plano**: antes de editar qualquer arquivo, o agente apresentou um plano em passos e duas
   decisões para o desenvolvedor, que o aprovou.
4. **Implementação e verificação**: o agente escreveu o código, criou a migration, executou
   *typecheck*, *lint* e *build*, testou as rotas e reiniciou o container para verificar a
   persistência. Por restrição de custo, foi feita **uma única** requisição real aos modelos.

### Métricas da execução

| Etapa | Duração | Tokens de saída | Tokens de entrada processados* |
|-------|---------|-----------------|--------------------------------|
| Pesquisa e plano | 1 min 32 s | 5,1 mil | 0,56 milhão |
| Implementação e verificação | 7 min 27 s | 37,6 mil | 2,22 milhões |
| **Total** | **≈ 9 min** | **≈ 42,7 mil** | **≈ 2,78 milhões** |

\* Cerca de 96% da entrada são leituras de cache: a cada passo do ciclo
raciocínio → ação → observação, o agente reenvia o contexto acumulado (que chegou a cerca de
100 mil tokens), e o cache de prompt reduz o custo dessa repetição. Os tempos medem apenas o
trabalho do agente, sem contar a espera pela aprovação do plano.

### Resultado observado

Com o ticket de exemplo *"Fui cobrado duas vezes na fatura de setembro. Já abri chamado semana
passada e ninguém respondeu. Quero o estorno hoje."*, a triagem retornou em 6,8 s:

| Campo | Valor |
|-------|-------|
| Resumo | "O cliente relata uma cobrança duplicada na fatura de setembro e a falta de retorno em chamado anterior. Ele solicita o estorno imediato do valor cobrado a mais." |
| Categoria | `COBRANCA` (confiança 1,00) |
| Prioridade | `URGENTE` (confiança 0,63) |
| Sentimento | `NEGATIVO` (confiança 1,00) |
| Revisão manual | Sim, pois a confiança da prioridade ficou abaixo de 0,7 |

O caso mostra a regra de revisão funcionando como esperado: a decisão menos segura do modelo
foi sinalizada para conferência humana.

## Como executar

Pré-requisitos: Docker com Docker Compose e Node.js 22+.

```bash
cp .env.example .env     # preencha GEMINI_API_KEY e JEV_API_KEY
./dev.sh                 # sobe o backend (Docker) e o frontend; Ctrl+C encerra
```

Acesse http://localhost:5173, cole um ticket (ou use "Usar exemplo") e clique em
"Triar ticket". As migrations do banco são aplicadas automaticamente na subida do backend. Com
uma chave ausente ou inválida, o ticket ainda é salvo, com status `PARCIAL` ou `FALHA`.

Execução manual: `docker compose up --build` para o backend e `npm install && npm run dev`
dentro de `frontend/`.

## Limitações

Trata-se de uma prova de conceito, e não de um produto: não há autenticação, testes automatizados,
filas assíncronas nem deploy. O código gerado pelo agente não foi revisado, apenas foi testada a funcionalidade, mas, como
trata-se de uma POC, não há a necessidade de tal, tendo em vista que seria apenas uma duvida técnica sendo sanada por um time de engenharia.
Em caso de decisão posterior para adotar de fato a ideia em uma ferramenta, o código poderia servir apenas de base para algo feito nas melhores
praticas de engenharia de software, revisões de código por mais de uma pessoa, teste unitários e testes de funcionalidade.

## Autor

**Hiago Borgaço**, Engenheiro de Software Pleno ·
[github.com/hiagobdev](https://github.com/hiagobdev)
