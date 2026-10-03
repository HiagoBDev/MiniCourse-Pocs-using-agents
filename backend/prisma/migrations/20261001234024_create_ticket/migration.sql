-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT,
    "descricao" TEXT NOT NULL,
    "resumo" TEXT,
    "categoria" TEXT,
    "categoriaConfianca" REAL,
    "prioridade" TEXT,
    "prioridadeConfianca" REAL,
    "sentimento" TEXT,
    "sentimentoConfianca" REAL,
    "requerRevisao" BOOLEAN NOT NULL,
    "statusTriagem" TEXT NOT NULL,
    "erroResumo" TEXT,
    "erroClassificacao" TEXT,
    "duracaoMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
