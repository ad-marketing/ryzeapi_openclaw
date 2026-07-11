import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

type AuthType = "account" | "instance";

interface RyzeEndpoint {
  id: string;
  name: string;
  description: string;
  method: "GET" | "POST" | "DELETE";
  path: string; // may contain :instance
  authType: AuthType;
  hasBody: boolean;
}

const RYZE_BASE_URL = process.env.RYZE_BASE_URL || "https://ryzeapi.cloud";
const DEFAULT_INSTANCE = process.env.RYZE_DEFAULT_INSTANCE || "";

async function ryzeRequest(
  endpoint: RyzeEndpoint,
  instance: string | undefined,
  body: Record<string, unknown> | undefined
) {
  const tokenAccount = process.env.RYZE_TOKEN_ACCOUNT;
  const tokenInstance = process.env.RYZE_TOKEN_INSTANCE;

  const resolvedInstance = instance || DEFAULT_INSTANCE;
  if (endpoint.path.includes(":instance") && !resolvedInstance) {
    return {
      error:
        "Nenhuma instância informada. Passe o parâmetro 'instance' na chamada ou configure RYZE_DEFAULT_INSTANCE no ambiente do gateway.",
    };
  }
  const path = endpoint.path.replace(":instance", encodeURIComponent(resolvedInstance));
  const url = `${RYZE_BASE_URL}${path}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (endpoint.authType === "account") {
    if (!tokenAccount) {
      return { error: "RYZE_TOKEN_ACCOUNT não configurado no ambiente do gateway." };
    }
    headers["Authorization"] = `Bearer ${tokenAccount}`;
  } else {
    if (!tokenInstance) {
      return { error: "RYZE_TOKEN_INSTANCE não configurado no ambiente do gateway." };
    }
    headers["apikey"] = tokenInstance;
  }

  try {
    const res = await fetch(url, {
      method: endpoint.method,
      headers,
      body: endpoint.hasBody && body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      if (res.status === 429) {
        return {
          error: "Rate limit da Ryze API excedido (429). Aguarde antes de tentar novamente.",
          status: 429,
          data,
        };
      }
      return { error: `Ryze API retornou erro ${res.status}.`, status: res.status, data };
    }

    return { status: res.status, data };
  } catch (err) {
    return { error: `Falha de rede ao chamar Ryze API: ${(err as Error).message}` };
  }
}

const ENDPOINTS: RyzeEndpoint[] = [
  // Instância (TokenAccount)
  { id: "instance_new", name: "ryze_instance_new", description: "Cria uma nova instância do WhatsApp na Ryze API.", method: "POST", path: "/api/instance/new", authType: "account", hasBody: true },
  { id: "instance_list", name: "ryze_instance_list", description: "Lista instâncias com estado de conexão e dados de perfil.", method: "GET", path: "/api/instance/list", authType: "account", hasBody: false },
  { id: "instance_connect", name: "ryze_instance_connect", description: "Gera QR code ou código de pareamento para conectar uma instância ao WhatsApp.", method: "GET", path: "/api/instance/connect/:instance", authType: "instance", hasBody: false },
  { id: "instance_reconnect", name: "ryze_instance_reconnect", description: "Reconecta uma instância usando sessão salva, sem novo QR code.", method: "POST", path: "/api/instance/reconnect/:instance", authType: "instance", hasBody: false },
  { id: "instance_logout", name: "ryze_instance_logout", description: "Desconecta a instância do WhatsApp, mantendo-a para reconexão futura. Ação sensível — confirme com o usuário antes.", method: "DELETE", path: "/api/instance/logout/:instance", authType: "instance", hasBody: false },
  { id: "instance_delete", name: "ryze_instance_delete", description: "Remove permanentemente uma instância da conta. Ação DESTRUTIVA e irreversível — sempre confirme explicitamente com o usuário antes de executar.", method: "DELETE", path: "/api/instance/delete/:instance", authType: "instance", hasBody: false },
  { id: "instance_get_settings", name: "ryze_instance_get_settings", description: "Consulta as configurações de comportamento da instância (rejeição de chamada, sync de histórico, status online).", method: "GET", path: "/api/instance/getSettings/:instance", authType: "instance", hasBody: false },
  { id: "instance_set_settings", name: "ryze_instance_set_settings", description: "Atualiza preferências da instância (auto-rejeitar chamadas, presença, mute, sincronização).", method: "POST", path: "/api/instance/settings/:instance", authType: "instance", hasBody: true },
  { id: "instance_get_proxy", name: "ryze_instance_get_proxy", description: "Lê a configuração de proxy (HTTP/HTTPS/SOCKS5) da instância.", method: "GET", path: "/api/instance/getProxy/:instance", authType: "instance", hasBody: false },
  { id: "instance_set_proxy", name: "ryze_instance_set_proxy", description: "Configura proxy para a instância (host, porta, protocolo, credenciais).", method: "POST", path: "/api/instance/proxy/:instance", authType: "instance", hasBody: true },
  { id: "instance_get_s3", name: "ryze_instance_get_s3", description: "Consulta a configuração de storage S3/MinIO para mídia recebida.", method: "GET", path: "/api/instance/getS3/:instance", authType: "instance", hasBody: false },
  { id: "instance_set_s3", name: "ryze_instance_set_s3", description: "Configura bucket S3 ou MinIO para upload automático de mídia.", method: "POST", path: "/api/instance/s3/:instance", authType: "instance", hasBody: true },

  // Mensageria
  { id: "message_text", name: "ryze_send_text", description: "Envia mensagem de texto simples para um contato ou grupo.", method: "POST", path: "/api/message/text/:instance", authType: "instance", hasBody: true },
  { id: "message_media", name: "ryze_send_media", description: "Envia imagem, vídeo, áudio ou documento, com legenda opcional.", method: "POST", path: "/api/message/media/:instance", authType: "instance", hasBody: true },
  { id: "message_location", name: "ryze_send_location", description: "Envia coordenadas geográficas com rótulo opcional.", method: "POST", path: "/api/message/location/:instance", authType: "instance", hasBody: true },
  { id: "message_contact", name: "ryze_send_contact", description: "Envia um cartão de contato (vCard).", method: "POST", path: "/api/message/contact/:instance", authType: "instance", hasBody: true },
  { id: "message_reaction", name: "ryze_send_reaction", description: "Reage a uma mensagem com um emoji.", method: "POST", path: "/api/message/reaction/:instance", authType: "instance", hasBody: true },
  { id: "message_buttons", name: "ryze_send_buttons", description: "Envia botões interativos com callback de resposta.", method: "POST", path: "/api/message/buttons/:instance", authType: "instance", hasBody: true },
  { id: "message_list", name: "ryze_send_list", description: "Envia menu de lista com seções e opções.", method: "POST", path: "/api/message/list/:instance", authType: "instance", hasBody: true },
  { id: "message_carousel", name: "ryze_send_carousel", description: "Envia carrossel de cartões horizontais com imagens e ações.", method: "POST", path: "/api/message/carousel/:instance", authType: "instance", hasBody: true },
  { id: "message_poll", name: "ryze_send_poll", description: "Cria uma enquete interativa com múltiplas opções.", method: "POST", path: "/api/message/poll/:instance", authType: "instance", hasBody: true },
  { id: "message_sticker", name: "ryze_send_sticker", description: "Envia um sticker estático ou animado.", method: "POST", path: "/api/message/sticker/:instance", authType: "instance", hasBody: true },
  { id: "message_status", name: "ryze_publish_status", description: "Publica um status (story) que desaparece em 24 horas.", method: "POST", path: "/api/message/status/:instance", authType: "instance", hasBody: true },
  { id: "message_forward", name: "ryze_forward_message", description: "Encaminha uma mensagem existente para outro chat.", method: "POST", path: "/api/message/forward/:instance", authType: "instance", hasBody: true },
  { id: "message_edit", name: "ryze_edit_message", description: "Edita o texto de uma mensagem já enviada.", method: "POST", path: "/api/message/edit/:instance", authType: "instance", hasBody: true },
  { id: "message_delete", name: "ryze_delete_message", description: "Apaga uma mensagem para o remetente ou para todos os participantes.", method: "POST", path: "/api/message/delete/:instance", authType: "instance", hasBody: true },

  // Chat
  { id: "chat_contacts", name: "ryze_list_contacts", description: "Lista todos os contatos com nome, telefone e dados de perfil.", method: "GET", path: "/api/chat/contacts/:instance", authType: "instance", hasBody: false },
  { id: "chat_messages", name: "ryze_get_chat_messages", description: "Recupera histórico de mensagens de um chat, com paginação.", method: "GET", path: "/api/chat/messages/:instance", authType: "instance", hasBody: false },
  { id: "chat_archive", name: "ryze_archive_chat", description: "Arquiva ou desarquiva uma conversa.", method: "POST", path: "/api/chat/archive/:instance", authType: "instance", hasBody: true },
  { id: "chat_pin", name: "ryze_pin_chat", description: "Fixa ou desafixa um chat no topo da lista.", method: "POST", path: "/api/chat/pin/:instance", authType: "instance", hasBody: true },
  { id: "chat_mute", name: "ryze_mute_chat", description: "Silencia notificações de um chat por um período.", method: "POST", path: "/api/chat/mute/:instance", authType: "instance", hasBody: true },
  { id: "chat_block", name: "ryze_block_contact", description: "Bloqueia ou desbloqueia um contato.", method: "POST", path: "/api/chat/block/:instance", authType: "instance", hasBody: true },
  { id: "chat_label", name: "ryze_label_chat", description: "Atribui ou remove etiquetas (labels) de um chat.", method: "POST", path: "/api/chat/label/:instance", authType: "instance", hasBody: true },
  { id: "chat_presence", name: "ryze_set_presence", description: "Define indicador de 'digitando' ou 'gravando áudio'.", method: "POST", path: "/api/chat/presence/:instance", authType: "instance", hasBody: true },
  { id: "chat_clear", name: "ryze_clear_chat", description: "Limpa o histórico de um chat localmente.", method: "DELETE", path: "/api/chat/clear/:instance", authType: "instance", hasBody: true },

  // Grupos
  { id: "group_create", name: "ryze_create_group", description: "Cria um novo grupo com participantes iniciais e foto opcional.", method: "POST", path: "/api/group/create/:instance", authType: "instance", hasBody: true },
  { id: "group_list", name: "ryze_list_groups", description: "Lista todos os grupos dos quais o usuário é membro.", method: "GET", path: "/api/group/list/:instance", authType: "instance", hasBody: false },
  { id: "group_info", name: "ryze_group_info", description: "Recupera nome, descrição, foto e lista de membros de um grupo.", method: "GET", path: "/api/group/info/:instance", authType: "instance", hasBody: false },
  { id: "group_update", name: "ryze_update_group", description: "Atualiza nome, descrição, tópico ou foto de um grupo.", method: "POST", path: "/api/group/update/:instance", authType: "instance", hasBody: true },
  { id: "group_invite", name: "ryze_invite_to_group", description: "Adiciona participantes a um grupo via JID ou número de telefone.", method: "POST", path: "/api/group/invite/:instance", authType: "instance", hasBody: true },
  { id: "group_remove", name: "ryze_remove_from_group", description: "Remove um membro do grupo (requer ser admin).", method: "POST", path: "/api/group/remove/:instance", authType: "instance", hasBody: true },
  { id: "group_promote", name: "ryze_promote_admin", description: "Concede privilégios de admin a um membro do grupo.", method: "POST", path: "/api/group/promote/:instance", authType: "instance", hasBody: true },
  { id: "group_demote", name: "ryze_demote_admin", description: "Remove privilégios de admin de um membro do grupo.", method: "POST", path: "/api/group/demote/:instance", authType: "instance", hasBody: true },
  { id: "group_invite_link", name: "ryze_get_group_invite_link", description: "Gera ou recupera o link de convite do grupo.", method: "GET", path: "/api/group/invite-link/:instance", authType: "instance", hasBody: false },
  { id: "group_reset_link", name: "ryze_reset_group_invite_link", description: "Reseta o link de convite, invalidando o anterior.", method: "POST", path: "/api/group/reset-link/:instance", authType: "instance", hasBody: true },
  { id: "group_leave", name: "ryze_leave_group", description: "Remove o usuário autenticado do grupo.", method: "POST", path: "/api/group/leave/:instance", authType: "instance", hasBody: true },

  // Comunidades
  { id: "community_create", name: "ryze_create_community", description: "Cria uma comunidade (container para múltiplos grupos).", method: "POST", path: "/api/community/create/:instance", authType: "instance", hasBody: true },
  { id: "community_list", name: "ryze_list_communities", description: "Lista comunidades gerenciadas pelo usuário.", method: "GET", path: "/api/community/list/:instance", authType: "instance", hasBody: false },
  { id: "community_link_group", name: "ryze_link_group_to_community", description: "Vincula um subgrupo a uma comunidade existente.", method: "POST", path: "/api/community/link-group/:instance", authType: "instance", hasBody: true },
  { id: "community_unlink_group", name: "ryze_unlink_group_from_community", description: "Remove um subgrupo de uma comunidade.", method: "POST", path: "/api/community/unlink-group/:instance", authType: "instance", hasBody: true },

  // Newsletter
  { id: "newsletter_create", name: "ryze_create_newsletter", description: "Cria um canal de transmissão (newsletter) para seguidores.", method: "POST", path: "/api/newsletter/create/:instance", authType: "instance", hasBody: true },
  { id: "newsletter_list", name: "ryze_list_newsletters", description: "Lista newsletters seguidas e/ou de propriedade do usuário.", method: "GET", path: "/api/newsletter/list/:instance", authType: "instance", hasBody: false },
  { id: "newsletter_publish", name: "ryze_publish_newsletter", description: "Publica uma mensagem para os assinantes do canal.", method: "POST", path: "/api/newsletter/publish/:instance", authType: "instance", hasBody: true },
  { id: "newsletter_follow", name: "ryze_follow_newsletter", description: "Segue um canal de newsletter público.", method: "POST", path: "/api/newsletter/follow/:instance", authType: "instance", hasBody: true },
  { id: "newsletter_unfollow", name: "ryze_unfollow_newsletter", description: "Deixa de seguir um canal.", method: "POST", path: "/api/newsletter/unfollow/:instance", authType: "instance", hasBody: true },

  // Perfil
  { id: "profile_info", name: "ryze_get_profile_info", description: "Recupera nome, foto de perfil e status de conta business.", method: "GET", path: "/api/profile/info/:instance", authType: "instance", hasBody: false },
  { id: "profile_name", name: "ryze_set_profile_name", description: "Atualiza o nome de exibição da conta.", method: "POST", path: "/api/profile/name/:instance", authType: "instance", hasBody: true },
  { id: "profile_picture", name: "ryze_set_profile_picture", description: "Define a foto de perfil a partir de base64 ou URL.", method: "POST", path: "/api/profile/picture/:instance", authType: "instance", hasBody: true },
  { id: "profile_privacy", name: "ryze_set_profile_privacy", description: "Configura visibilidade de 'visto por último', status e foto de perfil.", method: "POST", path: "/api/profile/privacy/:instance", authType: "instance", hasBody: true },
  { id: "profile_status", name: "ryze_set_profile_status", description: "Atualiza a bio/status da conta.", method: "POST", path: "/api/profile/status/:instance", authType: "instance", hasBody: true },

  // Eventos / Webhooks
  { id: "webhook_set", name: "ryze_set_webhook", description: "Configura um webhook HTTP para eventos em tempo real (até 3 por instância).", method: "POST", path: "/api/events/webhook/:instance", authType: "instance", hasBody: true },
  { id: "webhook_list", name: "ryze_list_webhooks", description: "Lista webhooks configurados, com status e detalhes de retry.", method: "GET", path: "/api/events/webhook/:instance", authType: "instance", hasBody: false },
  { id: "webhook_delete", name: "ryze_delete_webhook", description: "Remove um webhook pelo rótulo (label).", method: "DELETE", path: "/api/events/webhook/:instance", authType: "instance", hasBody: true },

  // Chatwoot
  { id: "chatwoot_set", name: "ryze_set_chatwoot", description: "Vincula a instância a uma inbox do Chatwoot (token de API e ID de conta).", method: "POST", path: "/api/chatwoot/set/:instance", authType: "instance", hasBody: true },
  { id: "chatwoot_list", name: "ryze_get_chatwoot_status", description: "Recupera status da integração Chatwoot e credenciais expostas.", method: "GET", path: "/api/chatwoot/list/:instance", authType: "instance", hasBody: false },
  { id: "chatwoot_unlink", name: "ryze_unlink_chatwoot", description: "Desconecta a instância do Chatwoot.", method: "DELETE", path: "/api/chatwoot/unlink/:instance", authType: "instance", hasBody: true },
];

export default defineToolPlugin({
  id: "ryze-api",
  name: "Ryze API",
  description:
    "Ferramentas para operar WhatsApp via Ryze API: mensagens, chats, grupos, comunidades, newsletters, perfil e gestão de instância.",
  tools: (tool) =>
    ENDPOINTS.map((endpoint) =>
      tool({
        name: endpoint.name,
        description: endpoint.description,
        parameters: Type.Object({
          instance: Type.Optional(
            Type.String({
              description:
                "Nome da instância do WhatsApp. Se omitido, usa RYZE_DEFAULT_INSTANCE (variável de ambiente do gateway), se configurada.",
            })
          ),
          ...(endpoint.hasBody
            ? {
                body: Type.Optional(
                  Type.Record(Type.String(), Type.Unknown(), {
                    description:
                      "Corpo da requisição em JSON, conforme os campos documentados para este endpoint em docs.ryzeapi.cloud.",
                  })
                ),
              }
            : {}),
        }),
        execute: async (params: any) =>
          ryzeRequest(endpoint, params.instance, params.body),
      })
    ),
});
