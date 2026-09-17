# Padrão de Implementação: Formulários e Validação

> Este documento define os padrões canônicos para implementação de formulários e validação de dados em aplicações Next.js 16 (App Router) e React 19.

---

## Visão Geral

No ecossistema Next.js com React 19, adotamos dois padrões principais de formulário de acordo com a complexidade e necessidade de interatividade da interface:

| Padrão | Cenário de Uso | Mecanismo de Validação | Gestão de Estado |
|---|---|---|---|
| **Padrão A — Server Action + Zod + `useActionState`** | Formulários de mutação convencionais (cadastros, edições, diálogos) | Servidor (Zod no Server Action) | React 19 `useActionState` + `isPending` |
| **Padrão B — Client Validation + API / Action** | Formulários com interatividade rica em tempo real (máscaras dinâmicas, validação imediata no `onBlur`, múltiplos steps) | Cliente (Zod co-localizado) + Servidor (Zod no endpoint) | Estado local ou React Hook Form + Zod Resolver |

---

## 1. Padrão A — Server Action + Zod + `useActionState`

Este é o padrão **preferencial** para a grande maioria dos cadastros e mutações no Next.js.

### Estrutura Recomendada de Arquivos
```
app/(rota)/_components/
├── RecordForm.tsx          # Componente de formulário "use client"
└── record.validation.ts    # Schema Zod co-localizado
app/actions/
└── record-actions.ts       # "use server" com validação estrita
```

### 1.1 Schema Zod Co-localizado (`record.validation.ts`)
```typescript
import { z } from "zod";

export const recordSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(80, "O nome não pode exceder 80 caracteres"),
  category: z.string().min(1, "Selecione uma categoria válida"),
  active: z.boolean().default(true),
});

export type RecordInput = z.infer<typeof recordSchema>;
```

### 1.2 Server Action (`record-actions.ts`)
```typescript
"use server";

import { recordSchema } from "./record.validation";

export type FormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function saveRecordAction(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  const rawData = {
    name: formData.get("name"),
    category: formData.get("category"),
    active: formData.get("active") === "on",
  };

  const validated = recordSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
      message: "Existem erros no formulário. Verifique os campos.",
    };
  }

  try {
    // Executar persistência no banco de dados via repositório/serviço
    // await db.save(validated.data);

    return {
      success: true,
      message: "Registro salvo com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro interno ao salvar.",
    };
  }
}
```

### 1.3 Componente de Interface (`RecordForm.tsx`)
```tsx
"use client";

import { useActionState } from "react";
import { saveRecordAction } from "@/app/actions/record-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecordForm() {
  const [state, action, isPending] = useActionState(saveRecordAction, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          name="name"
          disabled={isPending}
          aria-invalid={!!state?.errors?.name}
          aria-describedby={state?.errors?.name ? "name-error" : undefined}
        />
        {state?.errors?.name && (
          <p id="name-error" className="text-xs text-red-500 mt-1">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand hover:bg-brand-hover text-white h-11"
      >
        {isPending ? "Salvando..." : "Salvar Registro"}
      </Button>
    </form>
  );
}
```

---

## 2. Padrão B — Validação no Cliente com Feedback Instantâneo

Utilizado quando a interface exige validação imediata ao perder o foco (`onBlur`) ou formatação progressiva enquanto o usuário digita.

### Diretrizes:
1. **Validação no `onBlur`:** Dispare a checagem individual do campo quando o usuário transita para o próximo elemento, evitando mensagens de erro prematuras enquanto o campo ainda está sendo digitado.
2. **Erros Inline:** Mensagens de erro de validação de campo devem ser exibidas **diretamente abaixo do campo afetado** com tipografia `text-xs text-red-500`. Nunca dependa exclusivamente de toasts voláteis para erros em múltiplos campos.
3. **Desativação Visual durante Submissão:** Durante o envio, os campos e o botão de submissão devem exibir estado de carregamento e bloquear novos disparos concorrentes.
4. **Alvos de Toque:** Em dispositivos móveis, garanta que inputs e seletores possuam altura de pelo menos **44px a 48px** com `inputMode` condizente com o tipo de dado (ex: `inputMode="numeric"` para números).

---

## 3. Checklist Obrigatório para Formulários

- [ ] Schema Zod definido com mensagens de erro claras em português (`pt-BR`).
- [ ] Tratamento de campos numéricos (conversão segura de string de formulário para número).
- [ ] Atributos `aria-invalid` e `aria-describedby` para acessibilidade de leitores de tela.
- [ ] Feedback visual de submissão (`isPending` / loading spinner no botão).
- [ ] Prevenção de múltiplos cliques durante o envio assíncrono.
