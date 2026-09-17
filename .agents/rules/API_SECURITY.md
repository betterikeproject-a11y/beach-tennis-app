---
trigger: glob
globs: app/api/**/*.ts, src/app/api/**/*.ts
---

# API Security: Validação Estrita de Input e Output

> 🔒 **MANDATÓRIO E AUTORITÁRIO:** Ao criar ou modificar qualquer rota de API (Route Handlers em `/app/api`), você **DEVE** aplicar obrigatoriamente as restrições estritas de Input e Output descritas abaixo. Nenhuma exceção é permitida. O vazamento de dados não previstos para tela ou a injeção via parâmetros extras configura vulnerabilidade crítica de segurança (**Mass Assignment** ou **Over-fetching / Data Leakage**) e será bloqueado em Code Review.

---

## 1. Regra Estrita de Entrada (Input / Payload / Anti-Mass Assignment)

**Nunca aceite payloads dinâmicos cegamente. Sempre restrinja o payload aos campos estritos que a operação exige.**

1. **Validação de Schema com Zod Obrigatória:** Toda mutação (POST, PUT, PATCH) deve validar o corpo da requisição utilizando `.safeParse()`. Schemas do Zod removem ou ignoram campos não declarados, impedindo que campos sensíveis sejam forçados pelo cliente.
2. **Construção Explícita de Dados para o Banco:** NUNCA passe o objeto bruto do Request (ex: `body` ou `req.body`) diretamente para funções de persistência no banco de dados. O payload gravado deve ser construído explicitamente campo por campo a partir dos dados validados.

### ❌ PROIBIDO (Mass Assignment):
```typescript
// NUNCA FAÇA ISSO! O usuário poderia injetar { ...body, role: 'admin', is_admin: true }
const body = await request.json();
await db.from("users").update(body).eq("id", userId);
```

### ✅ OBRIGATÓRIO:
```typescript
const body = await request.json();
const parsed = updateSchema.safeParse(body);

if (!parsed.success) {
  return Response.json(
    { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
    { status: 400 }
  );
}

// Apenas os campos explícitos e autorizados são enviados ao banco:
await db.from("users").update({
  display_name: parsed.data.displayName,
  email: parsed.data.email,
}).eq("id", userId);
```

---

## 2. Regra Estrita de Saída (Output / Anti-Over-fetching / Anti-Data Leakage)

**Nunca retorne mais dados do que o estritamente necessário para a renderização da interface do cliente.**

1. **Response = DTO da View:** O `Response.json(...)` enviado ao frontend deve conter **somente** os campos que a interface precisa renderizar. Campos internos, hashes, tokens de sessão, credenciais ou dados administrativos irrelevantes para aquela tela devem ser omitidos.
2. **Seleção Explícita de Colunas:** Em consultas ao banco de dados no nível de rota, especifique as colunas necessárias através de cláusulas `select(...)` explícitas em vez de `select("*")`.

### ❌ PROIBIDO (Vazamento de dados / Over-fetching):
```typescript
// Retorna todas as colunas do banco, potencialmente expondo metadados internos ou dados sensíveis:
const { data } = await db.from("users").select("*").eq("id", id).single();
return Response.json(data);
```

### ✅ OBRIGATÓRIO:
```typescript
// Seleciona e retorna apenas os campos estritamente necessários para a UI:
const { data } = await db
  .from("users")
  .select("id, display_name, avatar_url, created_at")
  .eq("id", id)
  .single();

return Response.json(data);
```

---

## 3. Autenticação e Autorização em Rotas Administrativas

- Todas as rotas que realizam alterações críticas de dados (criação, exclusão, redefinição de registros) devem verificar a autorização antes de executar qualquer leitura ou escrita.
- Rotas protegidas devem retornar imediatamente `status: 401` (não autenticado) ou `status: 403` (não autorizado) caso a credencial ou token não seja válido.
