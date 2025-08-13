// src/lib/ai/gemini.ts
/**
 * Utilitário de frontend para acionar sua edge function ai-router.
 * NÃO chama a API do Google direto (sem chaves aqui).
 *
 * Use quando quiser disparar manualmente uma resposta da IA (ex.: botão "forçar IA").
 */
export async function requestGeminiReply(params: {
  supabaseUrl: string;           // ex.: "https://tqcnvhjdyirvfmmkoglp.supabase.co"
  instanceName: string;          // ex.: "crm_c404cd10_..." (igual já usa)
  chatJid: string;               // jid do chat (ex.: "5511999999999@s.whatsapp.net")
  messageText: string;           // texto a ser passado à IA
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
