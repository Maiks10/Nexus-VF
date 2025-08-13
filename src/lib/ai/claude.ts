// src/lib/ai/claude.ts
/**
 * Mesmo padrão do gemini.ts — chama ai-router (servidor),
 * que decide o provedor pelo agente selecionado.
 */
export async function requestClaudeReply(params: {
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
    } catch {}
  }
  return { ok: false, error: "ai-router unreachable" };
}
