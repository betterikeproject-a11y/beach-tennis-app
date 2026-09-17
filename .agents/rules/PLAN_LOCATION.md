---
name: plan-location
version: 1.0.0
priority: P0
trigger: always_on
description: Regra de localização e nomeação de planos de execução. Todos os planos devem ficar em /docs/PLAN-*.md
---

# Regra de Localização e Nomeação de Planos (Mandatório)

> 📌 **REGRA MANDATÓRIA DE NOMEAÇÃO E LOCALIZAÇÃO DE PLANOS DE EXECUÇÃO**

---

## 1. Regras Obrigatórias

1. **Pasta de Destino Obrigatória:**
   - Todos os arquivos de plano de execução DEVEM ser criados exclusivamente dentro da pasta **`/docs`** (caminho relativo: `docs/`).

2. **Prefixo Obrigatório:**
   - Todo arquivo de plano DEVE iniciar com o prefixo **`PLAN-`** (em maiúsculas), seguido pelo slug descritivo da tarefa em `kebab-case`.
   - **Formato Padrão:** `docs/PLAN-{task-slug}.md`

3. **Exemplos Corretos:**
   - `docs/PLAN-autenticacao-usuarios.md`
   - `docs/PLAN-refatoracao-ranking.md`
   - `docs/PLAN-sistema-torneios.md`

4. **Exemplos Incorretos (Proibidos):**
   - ❌ `PLAN-autenticacao.md` (fora da pasta `/docs`)
   - ❌ `docs/autenticacao.md` (sem o prefixo `PLAN-`)
   - ❌ `task-slug.md` (raiz do projeto sem pasta `/docs` e sem prefixo `PLAN-`)
