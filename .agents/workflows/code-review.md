---
description: Workflow para revisão aprofundada de código pós-implementação. Avalia o trabalho contra arquitetura, clean code, regras de segurança e design guidelines. Aplica política de tolerância zero com correção imediata para erros de Lint, TSC e Testes.
---

# /code-review — Verificação Pós-Implementação

$ARGUMENTS

---

> 📋 **INSTRUÇÃO CRÍTICA:** ANTES DE EXECUTAR ESTE WORKFLOW, VOCÊ DEVE LER E SEGUIR ESTRITAMENTE AS DIRETRIZES DE ARQUITETURA E CLEAN CODE DEFINIDAS EM `@[docs/rules/CLEAN_CODE.md]`, `@[.agents/rules/CONVENTIONS.md]`, `@[.agents/rules/API_SECURITY.md]`, `@[docs/rules/FORM_VALIDATION.md]`, `@[.agents/rules/TSX_SCREEN_RULES.md]`, `@[docs/rules/DESIGN_PATTERNS.md]` E `@[docs/rules/DATA_TABLE.md]`. ESTA É UMA INSTRUÇÃO DE PRIORIDADE MÁXIMA.

---

## 🚨 A REGRA "FIX IMMEDIATELY" (ALTA PRIORIDADE)

> ⚠️ **REGRA ABSOLUTA:** Se você encontrar QUALQUER erro proveniente de `lint`, `TypeScript (tsc)` ou `testes unitários (vitest)`, você **DEVE** corrigi-lo imediatamente.
>
> **NÃO importa se o erro foi causado por suas alterações atuais ou se já existia previamente no projeto.** Se você encontrar um estado quebrado, você é responsável por corrigi-lo antes de prosseguir com a revisão. "Já estava quebrado antes" NÃO é justificativa aceitável.

---

## Parâmetros de Contexto

Este workflow espera os seguintes parâmetros fornecidos no contexto:

- **`task`** (string, obrigatório): A tarefa analítica ou escopo da revisão.
- **`relevantFiles`** (lista de strings, obrigatório): Caminhos completos dos arquivos modificados ou a serem analisados.
- **`responsibility`** (string, padrão "evaluate_task"): Foco da análise ("evaluate_task", "debug" ou "plan").
- **`includeGitDiff`** (bool, padrão true): Incluir o git diff atual não commitado.
- **`relevantGitCommits`** (string, opcional): Faixa de commits a analisar (ex: "HEAD~2..HEAD").

---

## 🛑 POR QUE ESTE WORKFLOW EXISTE

Modelos de IA possuem uma tendência a pular validações individuais e emitir relatórios genéricos de aprovação sem examinar as regras a fundo. **Isso é inaceitável.**

Este workflow impõe execução passo a passo com portões estritos de verificação:

> ❌ **VIOLAÇÃO:** Emitir relatório de revisão sem ter lido os arquivos de regras aplicáveis = WORKFLOW FALHO.  
> ❌ **VIOLAÇÃO:** Pular qualquer uma das checagens de integridade (`npm test`, `tsc`, `lint_runner.py`) = WORKFLOW FALHO.  
> ❌ **VIOLAÇÃO:** Deixar erros existentes sem correção ("não foi alteração minha") = WORKFLOW FALHO.  
> ❌ **VIOLAÇÃO:** Marcar itens como "N/A" sem ter verificado o código contra a regra = WORKFLOW FALHO.  

---

## 🗺️ Estrutura de Execução

```
Step 0 (Global Integrity Gate)         ───► SEQUENCIAL (Bloqueador: lint, tsc, vitest)
    │
    ▼
Step 1 + Step 2                        ───► PARALELO (Coleta de contexto + Leitura das Regras)
    │
    ▼
Step 2.5 (Code-Level Rule Validation)  ───► SEQUENCIAL (Aplica checklists das regras ao código)
    │
    ▼
Step 3 & 3B (Execução de Scripts)      ───► PARALELO (security_scan.py, type_coverage.py, etc.)
    │
    ▼
Step 4 (Final Health Check)            ───► SEQUENCIAL (Bloqueador final: confirma integridade)
    │
    ▼
Step 5 (Report Generation)             ───► SEQUENCIAL (Síntese e emissão do relatório final)
```

---

## Passos de Execução

### Step 0: Global Integrity Gate 🛡️ `[SEQUENCIAL]`

> ⚠️ **AÇÃO OBRIGATÓRIA INICIAL.** Execute antes de qualquer análise.
> ⚠️ **CORRIJA TODOS OS ERROS IMEDIATAMENTE.**

Execute em sequência e comprove que o código está íntegro:
1. **Verificação de Tipos:**
   ```bash
   npx tsc --noEmit
   ```
2. **Suíte de Testes Unitários:**
   ```bash
   npm test
   ```
3. **Lint Runner:**
   ```bash
   python .agents/skills/lint-and-validate/scripts/lint_runner.py .
   ```

*Se houver falha:* Interrompa o review, analise a causa raiz, corrija o código e re-execute até obter aprovação total.

---

### Step 1: Coleta de Contexto 🔍 `[PARALELO]`

Reúna as evidências do escopo em análise:
- Obtenha o diff de alterações:
  ```bash
  git diff HEAD
  ```
- Identifique todos os arquivos afetados e liste-os em `relevantFiles`.

---

### Step 2: Carregamento das Regras do Projeto 📚 `[PARALELO]`

Carregue e examine os 7 documentos fundamentais do projeto:

| # | Caminho do Arquivo | Conteúdo Principal |
|---|---|---|
| 1 | `docs/rules/CLEAN_CODE.md` | Camadas DDD (Delivery, Domain, Infra, Shared), Clean Code, SRP |
| 2 | `docs/rules/DESIGN_PATTERNS.md` | 14 padrões TypeScript/Next.js aplicados |
| 3 | `docs/rules/FORM_VALIDATION.md` | Padrões de formulários A/B, schemas Zod, useActionState |
| 4 | `docs/rules/DATA_TABLE.md` | Diretrizes de tabelas e os 4 estados de UI (loading, empty, error, data) |
| 5 | `.agents/rules/API_SECURITY.md` | Prevenção de Mass Assignment e Data Leakage |
| 6 | `.agents/rules/CONVENTIONS.md` | Convenções de nomenclatura, ordenação de imports, sem `any` |
| 7 | `.agents/rules/TSX_SCREEN_RULES.md` | shadcn/ui obrigatório, Lucide icons, mobile-first, acessibilidade |

---

### Step 2.5: Code-Level Rule Validation Gate 📐 `[SEQUENCIAL]`

Aplique os checklists objetivos contra os arquivos modificados em `relevantFiles`:

#### Checklist 1: CLEAN_CODE.md
- [ ] Nenhum uso de `any` ou `Record<string, any>` nos arquivos modificados.
- [ ] Arquivos com até 350 linhas de código (sem monólitos).
- [ ] Funções concisas (até 25-30 linhas) respeitando responsabilidade única (SRP).
- [ ] Eliminação de magic strings (uso de constantes tipadas com `as const`).
- [ ] Lógica de negócio desacoplada de componentes visuais em `lib/domain/`.

#### Checklist 2: CONVENTIONS.md
- [ ] Arquivos e pastas nomeados estritamente em `kebab-case`.
- [ ] Componentes React exportados em `PascalCase`.
- [ ] Imports organizados em blocos: externos → internos `@/...` → co-localizados → tipos.
- [ ] Path aliases `@/*` utilizados (sem imports relativos longos `../../..`).

#### Checklist 3: TSX_SCREEN_RULES.md (para arquivos `.tsx`)
- [ ] Uso prioritário de componentes do shadcn/ui.
- [ ] Ícones exclusivamente de `lucide-react` (proibido emojis como ícones de UI).
- [ ] Tratamento explícito dos 4 estados de dados (Loading/Skeleton, Empty, Error, Data).
- [ ] Estilização mobile-first com alvos de toque mínimos de 44px.
- [ ] Dialogs possuem botão explícito de cancelamento no rodapé.

#### Checklist 4: API_SECURITY.md (para rotas de API / Server Actions)
- [ ] Validação estrita de entrada via Zod (`safeParse()`).
- [ ] Prevenção de Mass Assignment (nenhum repasse de `body` bruto para update/insert de banco).
- [ ] Prevenção de Over-fetching (seleção explícita de colunas no retorno para a view).
- [ ] Autenticação/autorização verificada em operações sensíveis.

#### Checklist 5: FORM_VALIDATION.md & DATA_TABLE.md
- [ ] Schemas Zod co-localizados ou centralizados, nunca embutidos no JSX.
- [ ] Mensagens de erro inline claras para validações de campos.
- [ ] Tabelas utilizam `<Skeleton>` durante o carregamento e tratam estado vazio.

---

### Step 3 & 3B: Execução de Scripts Obrigatórios 🧪 `[PARALELO]`

Execute os scripts de auditoria automatizada e registre seus resultados:

1. **Varredura de Segurança (OWASP, segredos, configurações):**
   ```bash
   python .agents/skills/vulnerability-scanner/scripts/security_scan.py .
   ```
2. **Cobertura de Tipagem TypeScript:**
   ```bash
   python .agents/skills/lint-and-validate/scripts/type_coverage.py .
   ```

---

### Step 4: Final Health Check 🩺 `[SEQUENCIAL]`

Re-execute a suíte completa de testes para garantir que nenhuma regressão foi introduzida:
```bash
npm test
npx tsc --noEmit
```

---

### Step 5: Geração de Relatório Estruturado de Code Review 📝

Produza o relatório final em Markdown no seguinte formato:

```markdown
# Code Review Report

## 🩺 Global Health Status
- **TypeScript Compiler (tsc):** PASS / FAIL
- **Test Suite (vitest):** PASS / FAIL (X testes aprovados)
- **Security Scanner:** PASS / FAIL (X vulnerabilidades)
- **Type Coverage:** X%

## 📋 Rule Compliance Matrix
| Regra | Status | Observações / Evidências |
|---|---|---|
| CLEAN_CODE.md | PASS / FAIL | [Evidência] |
| CONVENTIONS.md | PASS / FAIL | [Evidência] |
| TSX_SCREEN_RULES.md | PASS / FAIL | [Evidência] |
| API_SECURITY.md | PASS / FAIL | [Evidência] |
| FORM_VALIDATION.md | PASS / FAIL | [Evidência] |
| DATA_TABLE.md | PASS / FAIL | [Evidência] |
| DESIGN_PATTERNS.md | PASS / FAIL | [Evidência] |

## 🔍 Findings & Ações Corretivas
1. **[Arquivo:Linha]**: Descrição do achado e correção aplicada ou recomendada.

## 🎯 Veredito Final
- [ ] **APROVADO:** Todas as regras, testes e critérios de segurança foram cumpridos.
- [ ] **NECESSITA AJUSTES:** Descrever os pontos impeditivos.
```
