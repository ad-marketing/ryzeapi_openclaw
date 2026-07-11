# Ryze API — OpenClaw Plugin

Ferramentas para operar WhatsApp via [Ryze API](https://docs.ryzeapi.cloud) diretamente do seu agente OpenClaw: mensagens, chats, grupos, comunidades, newsletters, perfil e gestão de instância.

## O que inclui

63 tools cobrindo:

- **Instância**: criar, listar, conectar, reconectar, logout, deletar, configurações, proxy, S3.
- **Mensageria**: texto, mídia, localização, contato, reação, botões, lista, carrossel, enquete, sticker, status, forward, editar, deletar.
- **Chat**: contatos, histórico, arquivar, fixar, silenciar, bloquear, etiquetar, presença, limpar.
- **Grupos**: criar, listar, info, atualizar, convidar, remover, promover, rebaixar, link de convite, sair.
- **Comunidades**: criar, listar, vincular/desvincular grupo.
- **Newsletter/canais**: criar, listar, publicar, seguir, deixar de seguir.
- **Perfil**: info, nome, foto, privacidade, status.
- **Webhooks**: configurar, listar, remover.
- **Chatwoot**: vincular, status, desvincular.

## Configuração

Defina estas variáveis de ambiente no gateway do OpenClaw:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `RYZE_TOKEN_ACCOUNT` | Sim, para tools de gestão de conta/instância | Token de conta (`Authorization: Bearer`) |
| `RYZE_TOKEN_INSTANCE` | Sim, para tools de mensageria/chat/grupos/etc | Token da instância (`apikey`) |
| `RYZE_DEFAULT_INSTANCE` | Não | Nome da instância usada quando o parâmetro `instance` não é informado numa chamada |
| `RYZE_BASE_URL` | Não (default `https://ryzeapi.cloud`) | Útil se você usa uma instalação self-hosted/compatível |

Se nenhuma instância for informada (nem por parâmetro, nem por `RYZE_DEFAULT_INSTANCE`), a tool retorna um erro claro pedindo pra especificar uma.

## Uso

Cada tool aceita:
- `instance` (opcional): nome da instância do WhatsApp.
- `body` (opcional, objeto JSON): campos do corpo da requisição, conforme documentado em [docs.ryzeapi.cloud](https://docs.ryzeapi.cloud) para o endpoint correspondente.

Exemplo — enviar uma mensagem de texto:
```json
{
  "instance": "minha-instancia",
  "body": { "number": "5511999999999", "text": "Olá!" }
}
```

## Avisos

- Tools de gestão de instância como `ryze_instance_delete` e `ryze_instance_logout` são **destrutivas/sensíveis** — o agente deve confirmar com o usuário antes de executá-las.
- Rate limit da Ryze API: 100 req/min por token (20 req/min para criação de instância). Erros 429 retornam mensagem clara em vez de falhar silenciosamente.

## Build (para contribuidores)

```bash
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

## Licença

MIT
