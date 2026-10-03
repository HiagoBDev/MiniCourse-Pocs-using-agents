Implemente a feature descrita no card abaixo, sobre o ambiente que já existe neste
repositório (leia o CLAUDE.md primeiro). Antes de editar qualquer arquivo, apresente
um plano em passos e aguarde minha aprovação.

---

# SUP-POC-01 · Triagem automática de tickets com IA

## Contexto
O time de suporte perde tempo lendo e classificando tickets manualmente. Esta POC
avalia se dois modelos combinados conseguem fazer essa triagem com qualidade útil:
- **Gemini**: gera um resumo curto do ticket (tarefa de escrita).
- **JEV (TypeSafe AI)**: classifica categoria, prioridade e sentimento entre opções
  fixas e devolve o nível de confiança de cada decisão (tarefa de decisão).

## Objetivo
Dado o texto de um ticket, registrar o ticket, executar a triagem e exibir o
resultado de forma clara. Os tickets triados ficam guardados para consulta posterior.

## Modelo de dados (Prisma + SQLite)
Uma única entidade, `Ticket`:

| Campo | Tipo | Regra |
|---|---|---|
| id | String (cuid) | PK |
| titulo | String? | opcional, até 120 caracteres |
| descricao | String | obrigatório, 20 a 5000 caracteres (texto colado) |
| resumo | String? | gerado pelo Gemini, até 2 frases |
| categoria | String? | BUG, COBRANCA, ACESSO, DUVIDA, SUGESTAO |
| categoriaConfianca | Float? | 0 a 1, vindo do JEV |
| prioridade | String? | BAIXA, MEDIA, ALTA, URGENTE |
| prioridadeConfianca | Float? | 0 a 1 |
| sentimento | String? | POSITIVO, NEUTRO, NEGATIVO |
| sentimentoConfianca | Float? | 0 a 1 |
| requerRevisao | Boolean | true se qualquer confiança < 0,7 ou se houver falha |
| statusTriagem | String | CONCLUIDA, PARCIAL, FALHA |
| erroResumo | String? | mensagem amigável quando o Gemini falha |
| erroClassificacao | String? | mensagem amigável quando o JEV falha |
| duracaoMs | Int | tempo total da triagem |
| createdAt | DateTime | default now |

Os valores possíveis ficam em constantes TypeScript compartilhadas e validadas com
zod. Use String no banco, não enum do Prisma.

## Regras de negócio
1. A triagem é síncrona: a requisição só retorna depois que os dois modelos responderam ou falharam.
2. Gemini e JEV são chamados em paralelo com `Promise.allSettled`, porque um não depende do outro.
3. O status da triagem segue as respostas:
   - **CONCLUIDA:** os dois responderam.
   - **PARCIAL:** só um respondeu.
   - **FALHA:** nenhum respondeu.
   O ticket é salvo nos três casos.
4. `requerRevisao` é true quando qualquer confiança do JEV for menor que 0,7 ou quando o status não for CONCLUIDA.
5. O texto do ticket é tratado como dado, nunca como instrução. No prompt do Gemini,
   delimite o ticket e instrua o modelo a ignorar comandos dentro dele, para mitigar prompt injection.
6. Gemini: temperatura baixa (0 a 0,2) e saída estruturada em JSON `{ "resumo": string }`.
   Valide a resposta com zod.
7. JEV: três decisões tipadas, com as opções da tabela acima.
   - Não conheço o formato exato da API do JEV. Consulte a documentação oficial da TypeSafe AI.
   - Se não for possível confirmar o formato, crie a interface do serviço e um adapter isolado, e me pergunte antes de implementar a chamada real.
8. Cada integração fica em um serviço próprio (`services/gemini.ts` e `services/jev.ts`), com timeout de 15s.
   Erros técnicos vão para o log; o usuário recebe só a mensagem amigável.
9. As chaves `GEMINI_API_KEY` e `JEV_API_KEY` são lidas só no backend, via `config/env.ts`.

## API
- `POST /api/tickets`
  - Body: `{ titulo?, descricao }`.
  - Valida, executa a triagem, salva e retorna o ticket completo.
  - Retorna 400 com mensagem clara se a validação falhar.
- `GET /api/tickets`: lista os tickets, do mais recente para o mais antigo, com no máximo 50 itens.
- `GET /api/tickets/:id`: detalhe de um ticket, ou 404 se não existir.

## Interface (React + shadcn)
Uma única página com duas áreas.

**Nova triagem**
- Campo de título opcional.
- Textarea com contador de caracteres.
- Botão "Triar ticket", desabilitado enquanto o texto tiver menos de 20 caracteres.
- Botão "Usar exemplo", que preenche o textarea com um dos tickets de teste.
- Estado de carregamento com Skeleton.

**Resultado**
- Card de resumo.
- Três cards de classificação. Cada um mostra:
  - o valor como Badge;
  - a confiança em porcentagem, com uma barra simples.
- Badge "Revisar manualmente" quando `requerRevisao` for true.
- Status e tempo da triagem.
- Se o status for PARCIAL ou FALHA, o card afetado mostra a mensagem de erro no lugar do conteúdo.

**Histórico**
- Lista dos tickets já triados, com data, título (ou início da descrição), categoria, prioridade e indicador de revisão.
- Clicar em um item exibe o resultado completo.

Erros de rede ou de validação aparecem em um toast (sonner).

## Critérios de aceite
1. Com um texto válido, recebo resumo, categoria, prioridade e sentimento com confiança, e o ticket aparece no histórico.
2. Com menos de 20 caracteres, o botão fica desabilitado, e a API retorna 400 se chamada diretamente.
3. Com a chave do Gemini inválida, o ticket é salvo como PARCIAL, a classificação aparece e o card de resumo mostra o erro.
4. Com a chave do JEV inválida, o comportamento é o equivalente: status PARCIAL e o resumo aparece normalmente.
5. Com as duas chaves inválidas, o status é FALHA e a interface explica o que aconteceu.
6. Se qualquer confiança ficar abaixo de 0,7, o badge "Revisar manualmente" aparece.
7. Os dados persistem depois de reiniciar o container.
8. `npm run build` passa no frontend e no backend, e o lint não acusa erros.

## Tickets de teste (usar no botão "Usar exemplo")
1. "Fui cobrado duas vezes na fatura de setembro. Já abri chamado semana passada e
   ninguém respondeu. Quero o estorno hoje."
2. "Quando clico em Exportar relatório o sistema fica carregando e não baixa nada.
   Acontece no Chrome e no Edge."
3. "Seria ótimo poder filtrar os pedidos por data. De resto, estou gostando muito da
   ferramenta."

## Fora de escopo
Usuários e autenticação, edição ou exclusão de tickets, reclassificação manual,
filas assíncronas, testes automatizados, deploy e internacionalização.
voce não deve mandar requisições em massa para testar, no maximo caso queira testar, envie apenas uma requisição de exemplo para testar a funcionalidade;

## Definição de pronto
- Todos os critérios de aceite validados.
- Migration do Prisma criada e aplicada.
- CLAUDE.md atualizado com a nova rota, o modelo de dados e as regras de triagem.
- Ao final, me diga o que você validou sozinho e o que eu preciso testar manualmente.