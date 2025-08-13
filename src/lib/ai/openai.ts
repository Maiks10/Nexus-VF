// src/lib/ai/openai.ts
/**
 * Utilitário para acionar sua edge function ai-router pedindo resposta via agente OpenAI.
 * Não expõe chave no frontend; toda autenticação é feita no servidor (ai-router).
 */
export async function requestOpenAIReply(params: {
  supabaseUrl: string;
  instanceName: string;
  chatJid: string;
  messageText: string;
}) {
  const urls = [
    `${params.supabaseUrl.replace(".supabase.co", ".functions.supabase.co")}/ai-router`,
    `${params.supabaseUrl}/functions/v1/ai-router`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: params.instanceName,
          chatJid: params.chatJid,
          messageText: params.messageText,
        }),
      });
      const bodyText = await r.text();
      if (r.ok) return { ok: true, url, status: r.status, body: bodyText };
    } catch (e) {
      // tenta próxima URL
    }
  }
  return { ok: false, error: "ai-router unreachable" };
}
