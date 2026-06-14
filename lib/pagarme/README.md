# Pagar.me — lib de Pix avulso (inline, Orders API v5)

Biblioteca **portável** para cobranças Pix de pagamento único (inline, com QR Code renderizado
no seu próprio app) usando a Orders API v5 da Pagar.me. Pensada para reuso em vários projetos.

## Estrutura

| Arquivo | Portável? | Conteúdo |
|---|---|---|
| `client.ts` | ✅ | `createPagarmeClient({ secretKey, baseUrl?, userAgent? })`, `request<T>()` |
| `config.ts` | ✅ | `resolveBaseUrl()` — deriva/corrige a base URL (previne o 404 do gateway) |
| `pix.ts` | ✅ | `createPixCharge(client, params)`, `pixDetailsFromCharge(charge)` |
| `orders.ts` | ✅ | `getOrder`, `getCharge`, `firstCharge` |
| `status.ts` | ✅ | `normalizePagarmeStatus(status)` → `pending\|paid\|failed\|refunded` |
| `webhook.ts` | ✅ | `verifyWebhookBasicAuth(header, {user,pass})`, `extractChargeFromEvent(event)` |
| `errors.ts` | ✅ | `PagarmeError`, `classifyPagarmeError()` |
| `types.ts` | ✅ | tipos da Pagar.me |
| `index.ts` | ❌ | **Adaptador deste app** (acoplado: lê env, mapeia para `PaymentStatus`, copy pt-BR) |

## Por que não preciso de `PAGARME_BASE_URL`

A Pagar.me v5 tem **um único host**: `https://api.pagar.me/core/v5`. O ambiente (teste vs
produção) é definido pela **secret key** (`sk_test_…` = sandbox, `sk_live_…`/`sk_…` = produção),
**não** pela URL. Por isso a `baseUrl` é opcional: se ausente, usa o host canônico; se informada,
qualquer host `*.pagar.me` (inclusive o antigo `sdx-api.pagar.me`, que está **morto** e responde
404 `"no route matched with those values"`, ou faltando `/core/v5`) é normalizado para o canônico.

## Uso em outro projeto

Copie `lib/pagarme/` **exceto `index.ts`** e escreva seu próprio adaptador:

```ts
import { createPagarmeClient } from "./pagarme/client"
import { createPixCharge, pixDetailsFromCharge } from "./pagarme/pix"
import { firstCharge } from "./pagarme/orders"

const client = createPagarmeClient({ secretKey: process.env.PAGARME_SECRET_KEY! })

const order = await createPixCharge(client, {
  amountCents: 6000,
  description: "Produto X",
  customerName: "Fulano",
  customerEmail: "fulano@example.com",
  customerDocument: "00000000000", // opcional (algumas contas exigem p/ Pix)
  expiresIn: 3600,
  metadata: { order_id: "abc" },
})

const pix = pixDetailsFromCharge(firstCharge(order))
// pix.qrCode (copia e cola) / pix.qrCodeUrl (imagem) / pix.expiresAt
```

### Webhook

```ts
const ok = verifyWebhookBasicAuth(req.headers.get("authorization"), {
  user: process.env.PAGARME_WEBHOOK_USER,
  pass: process.env.PAGARME_WEBHOOK_PASSWORD,
})
// ok === null -> não configurado | false -> não autorizado | true -> ok
const charge = extractChargeFromEvent(event)
```

## Variáveis de ambiente

| Var | Obrigatória | Observação |
|---|---|---|
| `PAGARME_SECRET_KEY` | sim | `sk_test_…` (sandbox) ou `sk_live_…`/`sk_…` (produção) |
| `PAGARME_BASE_URL` | não | Opcional; default `https://api.pagar.me/core/v5`, e corrigida se malformada |
| `PAGARME_WEBHOOK_USER` / `PAGARME_WEBHOOK_PASSWORD` | só p/ webhook | Basic Auth do endpoint |
