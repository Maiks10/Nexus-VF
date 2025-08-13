// src/components/Support/SupportChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";

/* ===================== CONFIG ===================== */
const CHATS_POLL_MS = 3000;
const MSGS_POLL_MS = 2000;

/* ===================== HELPERS ===================== */
async function getCurrentInstance() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (user) {
    const { data: rows } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .order("created_at", { ascending: true });
    if (rows && rows.length) return rows[0].instance_name;
  }
  return localStorage.getItem("instance_name") || null;
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}
function phoneFromJid(jid) {
  return String(jid || "").replace(/@.*/, "");
}
function formatPhone(n) {
  const d = onlyDigits(n);
  if (d.length === 13) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return n;
}
const isGroup = (jid) => String(jid || "").endsWith("@g.us");

function platformFromChat(c) {
  const p = (c.platform || "").toLowerCase();
  if (p) return p;
  const jid = String(c.jid || "").toLowerCase();
  if (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us")) return "whatsapp";
  if (jid.includes("instagram")) return "instagram";
  if (jid.includes("facebook")) return "facebook";
  if (jid.includes("telegram")) return "telegram";
  return "whatsapp";
}

/* ===================== COMPONENT ===================== */
export default function SupportChat() {
  const [instanceName, setInstanceName] = useState(null);

  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);

  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const [agents, setAgents] = useState([]);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);

  const pendingSendsRef = useRef([]); // [{text, createdAtMs}]
  const chatsTimerRef = useRef(null);
  const msgsTimerRef = useRef(null);
  const scrollerRef = useRef(null);

  /* ---------- boot: instancia + agentes ---------- */
  useEffect(() => {
    (async () => {
      const inst = await getCurrentInstance();
      setInstanceName(inst);

      const { data: aData } = await supabase
        .from("ai_agents")
        .select("id, name, provider, is_active");
      setAgents(aData || []);
    })();
  }, []);

  /* ---------- fetchers ---------- */
  async function fetchChatsOnce() {
    if (!instanceName) return;

    // 1) filtro direto no banco (não traz grupos)
    const { data, error } = await supabase
      .from("whatsapp_chats")
      .select("*")
      .eq("instance_name", instanceName)
      .not("jid", "like", "%@g.us")
      .order("updated_at", { ascending: false });

    if (!error) {
      // 2) cinto e suspensório: filtra no front também
      const rows = (data || []).filter((c) => !isGroup(c.jid));

      setChats((prev) => {
        if (selected) {
          const fresh = rows.find((c) => c.id === selected.id);
          if (fresh) setSelected((old) => ({ ...(old || {}), ...fresh }));
          // se o selecionado atual for grupo (por algum motivo), desmarca
          if (selected && isGroup(selected.jid)) {
            setSelected(null);
          }
        }
        return rows;
      });

      if (!selected && rows.length) {
        const saved = localStorage.getItem("nf:lastChatId");
        const target =
          (saved && rows.find((c) => String(c.id) === saved)) ||
          rows.find((c) => !isGroup(c.jid)) ||
          null;
        if (target) setSelected(target);
      }
    }
  }

  async function fetchMessagesOnce() {
    if (!instanceName || !selected) return;
    if (isGroup(selected.jid)) return; // não carrega mensagens de grupos

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("instance_name", instanceName)
      .eq("chat_jid", selected.jid)
      .order("timestamp", { ascending: true });

    if (!error) {
      setMessages(data || []);
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        top: scrollerRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  /* ---------- polling: CHATS ---------- */
  useEffect(() => {
    if (!instanceName) return;

    fetchChatsOnce();
    clearInterval(chatsTimerRef.current);
    chatsTimerRef.current = setInterval(fetchChatsOnce, CHATS_POLL_MS);

    return () => clearInterval(chatsTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceName]);

  /* ---------- polling: MESSAGES ---------- */
  useEffect(() => {
    if (!instanceName || !selected) return;

    (async () => {
      await fetchMessagesOnce();
      if (selected.unread_count && selected.unread_count > 0) {
        markChatRead(selected.id);
      }
    })();

    clearInterval(msgsTimerRef.current);
    msgsTimerRef.current = setInterval(async () => {
      const lenBefore = messages.length;
      await fetchMessagesOnce();
      if (messages.length !== lenBefore) scrollToBottom();

      // dedupe temporárias quando a real chegar
      const last = messages[messages.length - 1];
      if (last) {
        const bodyNew = last.text ?? last.body ?? "";
        const cutoff = Date.now() - 30_000;
        const hadPending = pendingSendsRef.current.some(
          (p) => p.text === bodyNew && p.createdAtMs >= cutoff
        );
        if (hadPending) {
          setMessages((prev) =>
            prev.filter(
              (m) =>
                !(
                  String(m.id).startsWith("temp-") &&
                  (m.text ?? m.body ?? "") === bodyNew
                )
            )
          );
          pendingSendsRef.current = pendingSendsRef.current.filter(
            (p) => !(p.text === bodyNew && p.createdAtMs >= cutoff)
          );
        }
      }
    }, MSGS_POLL_MS);

    return () => clearInterval(msgsTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceName, selected]);

  /* ---------- helpers ---------- */
  async function markChatRead(chatId) {
    await supabase.from("whatsapp_chats").update({ unread_count: 0 }).eq("id", chatId);
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c)));
    setSelected((prev) => (prev ? { ...prev, unread_count: 0 } : prev));
  }

  function handleSelectChat(c) {
    if (isGroup(c.jid)) return; // não permite abrir grupo
    setSelected(c);
    localStorage.setItem("nf:lastChatId", String(c.id));
    setAgentMenuOpen(false);
    if (c.unread_count && c.unread_count > 0) markChatRead(c.id);
    fetchMessagesOnce();
  }

  async function send() {
    if (!text.trim() || !selected || !instanceName) return;
    if (selected.ai_enabled) return;
    if (isGroup(selected.jid)) return; // segurança

    const body = text.trim();
    const nowSec = Math.floor(Date.now() / 1000);

    const temp = {
      id: `temp-${Date.now()}`,
      instance_name: instanceName,
      chat_jid: selected.jid,
      from_me: true,
      text: body,
      timestamp: nowSec,
    };
    setMessages((prev) => [...prev, temp]);
    pendingSendsRef.current.push({ text: body, createdAtMs: Date.now() });

    setChats((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, last_message: body, updated_at: new Date().toISOString() }
          : c
      )
    );

    setText("");
    setSending(true);

    const { error } = await supabase.functions.invoke("send-message", {
      body: { instanceName, to: selected.jid, text: body },
    });

    setSending(false);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      alert("Falha ao enviar: " + (error.message || ""));
      pendingSendsRef.current = pendingSendsRef.current.filter((p) => p.text !== body);
    } else {
      fetchMessagesOnce();
      fetchChatsOnce();
      scrollToBottom();
    }
  }

  async function toggleAI(val) {
    if (!selected) return;
    const { data, error } = await supabase
      .from("whatsapp_chats")
      .update({ ai_enabled: val })
      .eq("id", selected.id)
      .select()
      .single();

    if (!error && data) {
      setSelected(data);
      setChats((prev) =>
        prev.map((c) => (c.id === data.id ? { ...c, ai_enabled: data.ai_enabled } : c))
      );
    } else if (error) {
      alert("Erro ao salvar IA: " + error.message);
    }
  }

  async function setAgent(agentId) {
    if (!selected) return;
    const { data, error } = await supabase
      .from("whatsapp_chats")
      .update({ ai_agent_id: agentId || null })
      .eq("id", selected.id)
      .select()
      .single();

    if (!error && data) {
      setSelected(data);
      setChats((prev) =>
        prev.map((c) =>
          c.id === data.id ? { ...c, ai_agent_id: data.ai_agent_id } : c
        )
      );
    } else if (error) {
      alert("Erro ao salvar agente: " + error.message);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const currentAgent =
    agents.find((a) => a.id === selected?.ai_agent_id)?.name || "Agente Padrão";
  const iaOn = !!selected?.ai_enabled;

  /* ===================== RENDER ===================== */
  return (
    <div className="w-full h-[calc(100vh-80px)] bg-gradient-to-br from-[#3E007A] via-[#4B1BA6] to-[#7A1E9B] p-5 rounded-xl text-white">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* -------- LISTA -------- */}
        <div className="col-span-12 md:col-span-4 xl:col-span-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Caixa de Entrada</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-sm hover:bg-black/40 transition">
              <span className="inline-block w-4 h-4 rounded-md bg-white/50" />
              Recuperador 24h
            </button>
          </div>

          <div className="p-3 overflow-y-auto">
            {!chats.length && (
              <div className="text-white/70 text-sm px-3 py-2">Nenhuma conversa.</div>
            )}

            {chats.map((c) => {
              const isSelected = selected?.id === c.id;
              const time = c.updated_at
                ? new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
              const badge = !!c.unread_count;

              const platform = platformFromChat(c);
              const Icon = platformIcon(platform);
              const phoneRaw = phoneFromJid(c.jid);
              const phoneLabel = formatPhone(phoneRaw);
              const avatar = c.avatar_url || "";

              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectChat(c)}
                  className={[
                    "group w-full text-left rounded-xl p-4 mb-2 transition relative",
                    isSelected ? "bg-white/10" : "hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    {/* avatar ou letra */}
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={c.title || phoneLabel}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                        {(c.title || phoneLabel || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-white truncate">
                              {c.title || phoneLabel}
                            </span>
                            <span className="shrink-0 opacity-90">
                              <Icon className="w-4 h-4" />
                            </span>
                          </div>
                          {/* número abaixo do nome */}
                          <div className="text-[11px] text-white/60 truncate">
                            {phoneLabel}
                          </div>
                        </div>
                        <span className="text-[11px] text-white/70 shrink-0">{time}</span>
                      </div>

                      <div className="mt-1 text-sm text-white/80 truncate">
                        {c.last_message || ""}
                      </div>
                    </div>

                    {badge && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[22px] h-[22px] text-[11px] font-semibold rounded-full bg-pink-500 text-white px-2">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* -------- CONVERSA -------- */}
        <div className="col-span-12 md:col-span-8 xl:col-span-9 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          {/* topo */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                {(selected?.title || formatPhone(phoneFromJid(selected?.jid)) || "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {selected ? (selected.title || formatPhone(phoneFromJid(selected.jid))) : "Selecione um chat"}
                  {selected && (
                    <span className="opacity-90">
                      {React.createElement(platformIcon(platformFromChat(selected)), {
                        className: "w-4 h-4",
                      })}
                    </span>
                  )}
                </div>
                {selected && (
                  <div className="text-xs text-white/70">
                    {formatPhone(phoneFromJid(selected.jid))} · via {platformFromChat(selected)}
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div className="relative flex items-center gap-3">
                <button
                  onClick={() => setAgentMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-sm hover:bg-black/40 transition"
                >
                  <span className="inline-block w-4 h-4 rounded-md bg-white/50" />
                  {currentAgent}
                </button>

                {agentMenuOpen && (
                  <div
                    className="absolute right-20 top-12 z-20 min-w-[220px] rounded-xl border border-white/10 bg-[#2a1846]/95 backdrop-blur-xl shadow-lg overflow-hidden"
                    onMouseLeave={() => setAgentMenuOpen(false)}
                  >
                    <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">
                      Escolher Agente
                    </div>
                    <button
                      onClick={() => {
                        setAgent(null);
                        setAgentMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/10"
                    >
                      Agente Padrão
                    </button>
                    {agents
                      .filter((a) => a.is_active !== false)
                      .map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setAgent(a.id);
                            setAgentMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-white/10"
                        >
                          {a.name} {a.provider ? `— ${a.provider}` : ""}
                        </button>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-80">IA</span>
                  <button
                    onClick={() => toggleAI(!selected.ai_enabled)}
                    className={`relative w-12 h-6 rounded-full transition ${
                      selected.ai_enabled ? "bg-pink-500" : "bg-white/20"
                    }`}
                    aria-label="Alternar IA"
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition ${
                        selected.ai_enabled ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* mensagens */}
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-6">
            {!selected && <div className="text-white/70 text-sm">Selecione um chat ao lado.</div>}

            {selected && (
              <div className="max-w-4xl mx-auto space-y-3">
                {messages.map((m) => {
                  const mine = !!m.from_me;
                  const time = m.timestamp
                    ? new Date(m.timestamp * 1000).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  const body = m.text ?? m.body ?? "";

                  return (
                    <div key={m.id || m.message_id} className={mine ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm shadow-sm max-w-[75%] ${
                          mine
                            ? "bg-pink-500/95 text-white rounded-tr-sm"
                            : "bg-white/15 text-white rounded-tl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{body}</div>
                        <div className="text-[10px] opacity-80 mt-1 text-right">{time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* rodapé */}
          {selected && (
            iaOn ? (
              <div className="px-6 pb-6">
                <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-white/10 text-white/90 px-4 py-3 text-sm">
                  🤖 IA ativa neste chat. As mensagens do cliente serão respondidas automaticamente
                  pelo agente selecionado. Para assumir manualmente, desligue a IA no topo.
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder="Digite sua mensagem..."
                    className={[
                      "flex-1 resize-none rounded-xl px-4 py-3 outline-none",
                      "border border-white/10 placeholder-white/60 text-white",
                      "bg-white/10 focus:border-white/30",
                    ].join(" ")}
                  />
                  <button
                    onClick={send}
                    disabled={sending || !text.trim()}
                    className={[
                      "w-10 h-10 rounded-xl transition flex items-center justify-center shadow",
                      "bg-pink-500 hover:bg-pink-600",
                      sending ? "opacity-60" : "",
                    ].join(" ")}
                    title="Enviar"
                  >
                    <SendIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== ÍCONES ===================== */
function SendIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function platformIcon(platform) {
  switch (platform) {
    case "instagram":
      return InstagramIcon;
    case "facebook":
      return FacebookIcon;
    case "telegram":
      return TelegramIcon;
    case "whatsapp":
    default:
      return WhatsAppIcon;
  }
}

function WhatsAppIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#25D366" d="M12.04 2C6.56 2 2.1 6.46 2.1 11.95c0 2.1.62 4.04 1.68 5.67L2 22l4.51-1.71a9.9 9.9 0 0 0 5.53 1.62c5.48 0 9.94-4.46 9.94-9.95C22 6.46 17.52 2 12.04 2z"/>
      <path fill="#fff" d="M17.27 14.39c-.12.34-.71.67-.99.71-.26.04-.6.06-.96-.06a9.06 9.06 0 0 1-3.22-1.7c-1.1-.87-1.82-1.94-2.1-2.33-.28-.39-.5-.86-.5-1.48s.31-1.06.43-1.21c.12-.15.26-.18.35-.18h.25c.08 0 .19-.02.3.23.12.27.4.93.44 1 .04.07.06.15.01.24-.04.09-.07.15-.14.23-.07.08-.15.18-.21.24-.07.08-.15.16-.06.31.09.15.4.66.86 1.07.6.53 1.11.69 1.27.76.16.06.25.05.35-.03.1-.08.41-.47.52-.63.12-.15.22-.13.37-.08.15.05.93.44 1.09.52.16.08.26.12.3.19.04.07.04.4-.08.74z"/>
    </svg>
  );
}
function InstagramIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <radialGradient id="ig" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stopColor="#FFDC80"/><stop offset="25%" stopColor="#FCAF45"/>
        <stop offset="50%" stopColor="#F56040"/><stop offset="75%" stopColor="#E1306C"/><stop offset="100%" stopColor="#833AB4"/>
      </radialGradient>
      <path fill="url(#ig)" d="M7 2h10c2.76 0 5 2.24 5 5v10c0 2.76-2.24 5-5 5H7c-2.76 0-5-2.24-5-5V7c0-2.76 2.24-5 5-5z"/>
      <path fill="#fff" d="M12 7a5 5 0 100 10 5 5 0 000-10zm6-1.2a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/>
    </svg>
  );
}
function FacebookIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#1877F2" d="M22 12.07C22 6.53 17.52 2 12 2S2 6.53 2 12.07C2 17.1 5.66 21.22 10.44 22v-7.03H7.9v-2.9h2.54V9.41c0-2.5 1.5-3.89 3.8-3.89 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.62.77-1.62 1.56v1.86h2.76l-.44 2.9h-2.32V22C18.34 21.22 22 17.1 22 12.07z"/>
    </svg>
  );
}
function TelegramIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#2CA5E0" d="M22 12.04C22 6.5 17.52 2 12 2S2 6.5 2 12.04C2 17.1 5.66 21.22 10.44 22v-6.3l-2.5-2.43 8.58-5.01-5.54 6.9 5.54 2.66V22C18.34 21.22 22 17.1 22 12.04z"/>
    </svg>
  );
}

export { SupportChat };
