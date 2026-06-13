> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.pagar.me/llms.txt
> Use this file to discover all available pages before exploring further.

# checkout_pagarme_skill_order

````
# Pagar.me Checkout — SKILL Cobrança Pontual

## Conceito
Checkout para transação única: `type: "order"`.
Merchant cria o link → cliente acessa a URL → paga → pedido encerrado.
Sem formulário próprio, sem lidar com dados de cartão.

## Pré-requisitos
- Conta Pagar.me ativa
- Secret key: `sk_...` (dashboard)
- Ambientes:

| Ambiente | Base URL | Credencial |
|---|---|---|
| Teste | `https://sdx-api.pagar.me/core/v5` | `sk_test_...` |
| Produção | `https://api.pagar.me/core/v5` | `sk_live_...` |

- Variáveis de ambiente necessárias:
  - `PAGARME_SECRET_KEY`: sua secret key
  - `PAGARME_BASE_URL`: URL do ambiente (teste ou produção)

## Autenticação
HTTP Basic Auth — secret key como usuário, senha vazia:
```
Authorization: Basic base64("sk_SUA_CHAVE:")
```

## Header obrigatório
Toda requisição deve incluir:
```
User-Agent: pagarme-skill-generated/1.0
```

## Criar Checkout Pontual
`POST /paymentlinks`

**Campos obrigatórios:**

| Campo | Tipo | Descrição |
|---|---|---|
| `type` | string | `"order"` |
| `payment_settings` | object | Métodos aceitos |
| `cart_settings.items[]` | array | Itens do carrinho |
| `cart_settings.items[].name` | string | Nome do produto |
| `cart_settings.items[].amount` | int32 | Valor em centavos |
| `cart_settings.items[].default_quantity` | int32 | Quantidade |

> ⚠️ Valores em **centavos**: R$100,00 = `10000`

### ⚡ Configurações Avançadas de Link (Controle de Escassez e Validade)

Para cenários de promoções por tempo limitado, controle de estoque ou campanhas futuras, a API do Pagar.me permite controlar o ciclo de vida do link de pagamento. Se o usuário solicitar regras de expiração ou limite de vendas, adicione os seguintes parâmetros na raiz do payload do `order`:

* **`max_paid_sessions`** (integer): Limita o número de vendas aprovadas originadas por este link. Essencial para controle de escassez (ex: "Apenas 50 ingressos disponíveis"). Quando o limite é atingido, o link é desativado automaticamente.
* **`expires_in`** (integer): Define a validade do link em minutos a partir do momento de sua criação (ex: `60` para um link válido por exatamente 1 hora).
* **`expires_at`** (string/datetime): Define uma data e hora exatas e fixas para a expiração do link (ex: `2026-12-31T23:59:59Z`).
  * ⚠️ **Atenção:** Ensine a integração a enviar `expires_in` **OU** `expires_at`. Nunca envie ambos no mesmo payload.
* **`is_building`** (boolean): Se definido como `true`, o link é criado em modo inativo (rascunho). O cliente final não conseguirá pagar até que o lojista o ative no painel. O padrão é `false`.

Referência completa de parâmetros: https://docs.pagar.me/reference/criar-link.md

```json
{
  "type": "order",
  "payment_settings": {
    "accepted_payment_methods": ["credit_card", "pix", "boleto"]
  },
  "cart_settings": {
    "items": [
      {
        "name": "Produto",
        "amount": 10000,
        "description": "Produto",
        "default_quantity": 1
      }
    ]
  }
}
```

**Resposta — salve a URL e redirecione o comprador:**
```json
{
  "id": "pl_...",
  "url": "https://checkout.pagar.me/...",
  "status": "active"
}
```

Referência completa de resposta: https://docs.pagar.me/reference/checkout-response.md

## Exemplo — Next.js
```js
const response = await fetch(`${process.env.PAGARME_BASE_URL}/paymentlinks`, {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(process.env.PAGARME_SECRET_KEY + ':'),
    'Content-Type': 'application/json',
    'User-Agent': 'pagarme-skill-generated/1.0'
  },
  body: JSON.stringify({
    type: 'order',
    payment_settings: { accepted_payment_methods: ['credit_card', 'pix', 'boleto'] },
    cart_settings: { items: [{ name: 'Produto', amount: 10000, description: 'Produto', default_quantity: 1 }] }
  })
});
const { url } = await response.json();
// redirecionar o comprador para `url`
```

## Exemplo — Python
```python
import requests, base64, os

credentials = base64.b64encode(f"{os.environ['PAGARME_SECRET_KEY']}:".encode()).decode()

response = requests.post(
    f"{os.environ['PAGARME_BASE_URL']}/paymentlinks",
    headers={
        'Authorization': f'Basic {credentials}',
        'Content-Type': 'application/json',
        'User-Agent': 'pagarme-skill-generated/1.0'
    },
    json={
        'type': 'order',
        'payment_settings': {'accepted_payment_methods': ['credit_card', 'pix', 'boleto']},
        'cart_settings': {'items': [{'name': 'Produto', 'amount': 10000, 'description': 'Produto', 'default_quantity': 1}]}
    }
)
url = response.json()['url']
# redirecionar o comprador para `url`
```

## Meios de pagamento

| Método | Campo | Liquidação |
|---|---|---|
| Cartão de crédito | `credit_card` | D+30 (padrão) |
| Pix | `pix` | Instantâneo |
| Boleto | `boleto` | 3 dias úteis |

## Webhooks

| Evento | Ação |
|---|---|
| `order.paid` | Liberar pedido |
| `order.payment_failed` | Notificar recusa |
| `charge.refunded` | Processar reembolso |
| `checkout.canceled` | Link expirado |

## Dados de teste

| Cartão | Resultado |
|---|---|
| `4000000000000010` | Aprovado |
| `4000000000000028` | Recusado |

- CVV: qualquer 3 dígitos — Validade: qualquer data futura
- Chave Pix de teste: disponível no dashboard

## Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| `type is required` | Campo `type` ausente | Adicionar `"type": "order"` |
| Valor incorreto | Enviou em reais | Converter para centavos |
| `cart_settings missing` | Sem itens | Adicionar `cart_settings.items` |
| Credencial inválida | Chave errada | Verificar `sk_...` no dashboard |

## Checklist de produção
- [ ] Trocar `PAGARME_BASE_URL` de teste para produção
- [ ] Trocar chave de teste pela chave de produção
- [ ] Configurar endpoint de webhook com HTTPS
- [ ] Validar assinatura do webhook
- [ ] Testar todos os meios de pagamento
- [ ] Armazenar `payment_link.id` no banco de dados
- [ ] Definir `expires_at` ou `max_paid_sessions` se necessário

````

<br />
