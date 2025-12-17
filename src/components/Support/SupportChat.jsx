// src/components/Support/SupportChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, Mic, FileText, Download, Square, Send, Loader2, Play, Pause, ChevronDown, Check, Sun, Palmtree, Bot } from "lucide-react";
import { EvolutionService } from "@/lib/whatsapp";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/customSupabaseClient";

/* ===================== CONFIG ===================== */
const CHATS_POLL_MS = 5000; // Increased poll time to avoid rate limits
const MSGS_POLL_MS = 3000;

/* ===================== HELPERS ===================== */
function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}
function phoneFromJid(jid) {
  return String(jid || "").replace(/@.*/, "");
}
function formatPhone(n) {
  const d = onlyDigits(n);
  if (d.length === 13) {
    return `+ ${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)} -${d.slice(9)} `;
  }
  if (d.length === 12) {
    return `+ ${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)} -${d.slice(8)} `;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)} -${d.slice(7)} `;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)} -${d.slice(6)} `;
  }
  return n;
}
const isGroup = (jid) => String(jid || "").endsWith("@g.us");
const isStatus = (jid) => String(jid || "").includes("@broadcast") || String(jid || "").includes("status");

// Limpar "Contato" do título e extrair número correto
function getCleanTitle(chat) {
  // Verificar se chat existe
  if (!chat) return "?";

  // Se tem title e não começa com "Contato", usar o title
  if (chat.title && !chat.title.toLowerCase().startsWith('contato')) {
    return chat.title;
  }

  // Extrair número do JID
  const jid = chat.jid || "";
  const phone = phoneFromJid(jid);

  // Retornar número formatado
  return formatPhone(phone);
}

// Função para tornar links clicáveis
function renderTextWithLinks(text) {
  if (!text) return null;

  // Regex para detectar URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-pink-300 transition-colors cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// Função para pegar iniciais do nome (ex: "Maicon Silva" -> "MS")
function getInitials(name) {
  if (!name) return "?";

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Se for uma palavra só, pega as 2 primeiras letras
    return name.substring(0, 2).toUpperCase();
  }

  // Se tiver 2+ palavras, pega primeira letra de cada
  return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
}


/* ===================== CHECK MARKS ===================== */


// Agrupa mensagens consecutivas do mesmo remetente
function groupMessages(messages) {
  const groups = [];
  let currentGroup = null;

  messages.forEach((msg, idx) => {
    const msgFromMe = !!msg.from_me;
    console.log(`[GROUP] Msg ${idx}: from_me = ${msg.from_me} (boolean: ${msgFromMe}), currentGroup.fromMe = ${currentGroup?.fromMe} `);

    if (!currentGroup || currentGroup.fromMe !== msgFromMe) {
      currentGroup = {
        fromMe: msgFromMe,
        messages: [msg]
      };
      groups.push(currentGroup);
      console.log(`[GROUP] Criou novo grupo #${groups.length}, fromMe = ${msgFromMe} `);
    } else {
      currentGroup.messages.push(msg);
      console.log(`[GROUP] Adicionou à grupo #${groups.length}, total msgs no grupo: ${currentGroup.messages.length} `);
    }
  });

  console.log(`[GROUP] Total de grupos criados: ${groups.length} `);
  groups.forEach((g, i) => console.log(`[GROUP] Grupo ${i + 1}: ${g.messages.length} msgs, fromMe = ${g.fromMe} `));

  return groups;
}

function formatMessageDate(timestamp) {
  if (!timestamp) return 'Invalid Date';

  let date;

  // Se for string (formato PostgreSQL: "2025-12-12T17:11:26.000Z")
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  }
  // Se for número (Unix timestamp em segundos ou millisegundos)
  else if (typeof timestamp === 'number') {
    const ts = timestamp > 10000000000 ? timestamp : timestamp * 1000;
    date = new Date(ts);
  }
  // Se já for objeto Date
  else if (timestamp instanceof Date) {
    date = timestamp;
  }
  else {
    return 'Invalid Date';
  }

  if (isNaN(date.getTime())) return 'Invalid Date';

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return time; // Hoje
  if (diffDays === 1) return `Ontem ${time} `;
  if (diffDays < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + time;
}

function CheckMarks({ status, fromMe }) {
  if (!fromMe) return null;

  return (
    <span className="inline-flex ml-1">
      {status === 'read' || status === 2 ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          </svg>
          <svg className="w-3 h-3 -ml-1.5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          </svg>
        </>
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
        </svg>
      )}
    </span>
  );
}

/* ===================== CUSTOM AUDIO PLAYER ===================== */
function CustomAudioPlayer({ src, fromMe = false }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Cores diferentes para mensagens enviadas vs recebidas
  const containerClass = fromMe
    ? "flex items-center gap-3 bg-white/20 p-3 rounded-xl border border-white/30 min-w-[280px]"
    : "flex items-center gap-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-3 rounded-xl border border-pink-500/20 min-w-[280px]";

  const buttonClass = fromMe
    ? "flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full hover:bg-white/90 transition-all transform hover:scale-105"
    : "flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-500 rounded-full hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105";

  const progressBarClass = fromMe
    ? "h-full bg-white rounded-full transition-all"
    : "h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all";

  const iconColor = fromMe ? "text-pink-500" : "text-white";

  return (
    <div className={containerClass}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <button
        onClick={togglePlay}
        className={buttonClass}
      >
        {isPlaying ? (
          <Pause className={`w-5 h-5 ${iconColor}`} fill="currentColor" />
        ) : (
          <Play className={`w-5 h-5 ${iconColor} ml-0.5`} fill="currentColor" />
        )}
      </button>

      <div className="flex-1 space-y-1">
        <div
          className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className={progressBarClass}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

/* ===================== MEDIA MESSAGE COMPONENT ===================== */
function RenderMediaMessage({ media_type, media_url, caption, filename, fromMe = false }) {
  if (!media_url) return null;

  return (
    <div className="space-y-2">
      {media_type === 'image' && (
        <img
          src={media_url}
          alt={caption || 'Imagem'}
          className="max-w-[280px] max-h-[200px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(media_url, '_blank')}
        />
      )}

      {media_type === 'video' && (
        <video
          src={media_url}
          controls
          className="max-w-[280px] max-h-[200px] rounded-lg"
        />
      )}

      {media_type === 'audio' && (
        <CustomAudioPlayer src={media_url} fromMe={fromMe} />
      )}

      {media_type === 'document' && (
        <a
          href={media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <FileText className="w-8 h-8 text-pink-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{filename || 'Documento'}</p>
            <p className="text-white/60 text-xs">Clique para baixar</p>
          </div>
          <Download className="w-5 h-5 text-white/60 flex-shrink-0" />
        </a>
      )}

      {caption && (
        <p className="text-sm whitespace-pre-wrap break-words">{caption}</p>
      )}
    </div>
  );
}

function platformFromChat(c) {
  const p = (c.platform || "").toLowerCase();
  if (p) return p;
  const jid = String(c.jid || "").toLowerCase();
  if (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us")) return "whatsapp";
  return "whatsapp";
}

/* ===================== COMPONENT ===================== */
function SupportChatComponent() {
  const { user } = useAuth();
  const [instanceName, setInstanceName] = useState(null);

  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [agents, setAgents] = useState([]);

  // Estados para preview antes de enviar
  const [filePreview, setFilePreview] = useState(null); // { file, type, url }
  const [audioPreview, setAudioPreview] = useState(null); // { blob, url }
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedInstances, setSelectedInstances] = useState([]); // Instâncias WhatsApp selecionadas
  const [availableInstances, setAvailableInstances] = useState([]); // Todas instâncias disponíveis
  const [isUserScrolling, setIsUserScrolling] = useState(false); // Controla se usuário está rolando manualmente
  const [whatsappDropdownOpen, setWhatsappDropdownOpen] = useState(false); // Controla dropdown de WhatsApp
  const [showGroups, setShowGroups] = useState(false); // Toggle para mostrar/ocultar grupos

  const pendingSendsRef = useRef([]);
  const chatsTimerRef = useRef(null);
  const msgsTimerRef = useRef(null);
  const scrollerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const lastScrollHeight = useRef(0);

  // Ref
  const messagesEndRef = useRef(null);
  const hasLoadedMessagesRef = useRef(false);
  const scrollableDivRef = useRef(null);


  /* ---------- boot: instancia + agentes ---------- */
  useEffect(() => {
    const initialize = async () => {
      // if (!user) return; // Allow working without user context if needed

      try {
        const connectedInstances = await EvolutionService.fetchInstances();
        if (connectedInstances && connectedInstances.length > 0) {
          setAvailableInstances(connectedInstances);
          // Prefer the one in local storage if it exists and is in the list
          const saved = localStorage.getItem("instance_name");
          const found = connectedInstances.find(i => i.instance_name === saved);
          setInstanceName(found ? found.instance_name : connectedInstances[0].instance_name);

          // Inicializar com todas as instâncias selecionadas
          const savedSelection = localStorage.getItem("selected_instances");
          if (savedSelection) {
            setSelectedInstances(JSON.parse(savedSelection));
          } else {
            setSelectedInstances(connectedInstances.map(i => i.instance_name));
          }
        } else {
          setInstanceName(null);
          setAvailableInstances([]);
        }

        // Fetch AI Agents
        const { data: agentsData } = await apiClient.get('/api/ai-agents');
        setAgents(agentsData || []);

      } catch (error) {
        console.error("Erro na inicialização do chat:", error);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [user]);

  /* ---------- fechar dropdown ao clicar fora ---------- */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (whatsappDropdownOpen && !event.target.closest('.whatsapp-dropdown-container')) {
        setWhatsappDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [whatsappDropdownOpen]);

  /* ---------- fetchers ---------- */
  async function fetchChatsOnce() {
    if (availableInstances.length === 0) return;

    try {
      // MODIFICADO: fetchChats agora busca TODOS os chats do usuário, independente da instância
      const allChats = await EvolutionService.fetchChats();

      // Adicionar o instance_displayName baseado no instance_name do chat
      const chatsWithDisplayName = allChats.map(chat => {
        const matchingInstance = availableInstances.find(inst => inst.instance_name === chat.instance_name);
        return {
          ...chat,
          instance_displayName: matchingInstance?.displayName || chat.instance_name
        };
      });

      // REMOVIDO: Filtro por selectedInstances - agora mostra TODOS os chats do usuário
      // O backend já garante que retorna apenas o chat mais recente de cada JID

      // Filtrar grupos e status
      let filtered = chatsWithDisplayName.filter((c) => {
        // Sempre filtrar status
        if (isStatus(c.jid)) return false;
        // Filtrar grupos baseado no toggle
        if (isGroup(c.jid)) return showGroups;
        // Incluir conversas diretas
        return true;
      });

      // Ordenar por data de atualização
      filtered.sort((a, b) => {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateB - dateA; // Mais recente primeiro
      });

      setChats(filtered);

      // Não auto-selecionar se já tem um chat selecionado
      if (!selected && filtered.length) {
        const saved = localStorage.getItem("nf:lastChatId");
        const target = (saved && filtered.find((c) => String(c.id) === saved)) || filtered[0] || null;
        if (target) setSelected(target);
      }
    } catch (error) {
      console.error("Erro ao buscar chats:", error);
    }
  }

  async function fetchMessagesOnce() {
    if (!selected) return;
    try {
      // Usar a instância correta do chat selecionado
      const instanceToUse = selected.instance_name || instanceName;
      const msgs = await EvolutionService.fetchMessages(instanceToUse, selected.jid);
      console.log('[FRONTEND] Mensagens recebidas do backend:', msgs.length);
      console.log('[FRONTEND] Primeira mensagem:', msgs[0]);
      console.log('[FRONTEND] Última mensagem:', msgs[msgs.length - 1]);
      console.log('[FRONTEND] Mensagens from_me=false:', msgs.filter(m => !m.from_me).length);
      console.log('[FRONTEND] Mensagens from_me=true:', msgs.filter(m => m.from_me).length);
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(msgs);
      scrollToBottom();
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    }
  }

  function scrollToBottom() {
    // Só fazer scroll automático se usuário não estiver navegando manualmente
    if (!isUserScrolling) {
      requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
          lastScrollHeight.current = scrollerRef.current.scrollHeight;
        }
      });
    }
  }

  // Detectar quando usuário rola manualmente
  function handleScroll() {
    if (!scrollerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollerRef.current;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50; // 50px de margem

    // Se usuário rolar para cima, marcar como scrolling manual
    if (!isAtBottom && scrollHeight === lastScrollHeight.current) {
      setIsUserScrolling(true);
    } else if (isAtBottom) {
      // Se voltar ao final, permitir auto-scroll novamente
      setIsUserScrolling(false);
    }
  }

  /* ---------- polling: CHATS & MESSAGES ---------- */
  useEffect(() => {
    if (availableInstances.length === 0) return;
    fetchChatsOnce();
    clearInterval(chatsTimerRef.current);
    chatsTimerRef.current = setInterval(fetchChatsOnce, CHATS_POLL_MS);
    return () => clearInterval(chatsTimerRef.current);
  }, [availableInstances, selectedInstances, showGroups]); // Recarregar quando selectedInstances OU showGroups mudar

  useEffect(() => {
    if (!selected) return;
    (async () => {
      await fetchMessagesOnce();
      if (selected.unread_count > 0) markChatRead(selected.id);
    })();
    clearInterval(msgsTimerRef.current);
    msgsTimerRef.current = setInterval(async () => {
      const lenBefore = messages.length;
      await fetchMessagesOnce();
      if (messages.length !== lenBefore) scrollToBottom();
    }, MSGS_POLL_MS);
    return () => clearInterval(msgsTimerRef.current);
  }, [selected, messages.length]); // Removido instanceName da dependência

  /* ---------- send message ---------- */
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!text.trim() || !selected) return;
    const msgText = text.trim();
    setText("");

    // Adiciona mensagem otimista imediatamente com ID temporário
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      id: tempId,
      message_id: tempId,
      text: msgText,
      from_me: true,
      timestamp: new Date(),
      status: 'sending', // sending -> sent -> delivered
      chat_jid: selected.jid,
      _isOptimistic: true // Flag para identificar mensagens otimistas
    };

    setMessages(prev => [...prev, tempMessage]);

    // Scroll suave para nova mensagem
    setTimeout(() => scrollToBottom(), 100);

    try {
      // Usar a instância correta do chat selecionado
      const instanceToUse = selected.instance_name || instanceName;
      await EvolutionService.sendMessage(instanceToUse, selected.jid, msgText);

      // Marcar como enviada (1 check) após 300ms
      setTimeout(() => {
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, status: 'sent' } : m
        ));
      }, 300);

      // Após 2s, busca do banco e marca como delivered (2 checks)
      setTimeout(async () => {
        await fetchMessagesOnce();
        await fetchChatsOnce();

        // Marcar como delivered antes de remover
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, status: 'delivered' } : m
        ));

        // Após mais 500ms, remove a temporária (a real já chegou)
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }, 500);
      }, 2000);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);

      // Marca mensagem como erro
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'error', _error: error.message } : m
      ));

      alert("Falha ao enviar: " + (error.response?.data?.message || error.message));
    }
  }


  /* ---------- upload media ---------- */
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type.startsWith('image/') ? 'image' :
      file.type.startsWith('audio/') ? 'audio' :
        file.type.startsWith('video/') ? 'video' : 'document';

    // Criar URL para preview
    const url = URL.createObjectURL(file);
    setFilePreview({ file, type, url });

    // Limpar input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function sendFilePreview() {
    if (!filePreview) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', filePreview.file);
    // Usar a instância correta do chat selecionado
    const instanceToUse = selected.instance_name || instanceName;
    formData.append('instanceName', instanceToUse);
    formData.append('to', selected.jid);
    formData.append('type', filePreview.type);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      // Limpar preview e fechar
      URL.revokeObjectURL(filePreview.url);
      setFilePreview(null);

      setTimeout(() => {
        fetchMessagesOnce();
        fetchChatsOnce();
      }, 2000);
    } catch (error) {
      console.error('[UPLOAD] Erro:', error);
      alert('Falha ao enviar arquivo: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  function cancelFilePreview() {
    if (filePreview) {
      URL.revokeObjectURL(filePreview.url);
      setFilePreview(null);
    }
  }

  /* ---------- audio recording ---------- */
  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function startRecording() {
    if (!selected || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];
      setRecordingTime(0);

      // Timer para mostrar tempo de gravação
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg' });
        const url = URL.createObjectURL(audioBlob);
        setAudioPreview({ blob: audioBlob, url });
        stream.getTracks().forEach(track => track.stop());

        // Limpar timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('[AUDIO] Erro ao iniciar gravação:', error);
      alert('Erro ao acessar microfone: ' + error.message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function sendAudioPreview() {
    if (!audioPreview) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', audioPreview.blob, `audio_${Date.now()}.ogg`);
    // Usar a instância correta do chat selecionado
    const instanceToUse = selected.instance_name || instanceName;
    formData.append('instanceName', instanceToUse);
    formData.append('to', selected.jid);
    formData.append('type', 'audio');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      console.log('[AUDIO] Áudio enviado com sucesso');

      // Limpar preview
      URL.revokeObjectURL(audioPreview.url);
      setAudioPreview(null);
      setRecordingTime(0);

      setTimeout(() => {
        fetchMessagesOnce();
        fetchChatsOnce();
      }, 2000);
    } catch (error) {
      console.error('[AUDIO] Erro ao enviar:', error);
      alert('Falha ao enviar áudio: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  function cancelAudioPreview() {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview.url);
      setAudioPreview(null);
      setRecordingTime(0);
    }
  }

  async function markChatRead(chatId) {
    if (!chatId || !selected) return;
    try {
      // Usar a instância correta do chat selecionado
      const instanceToUse = selected.instance_name || instanceName;
      await EvolutionService.markChatRead(instanceToUse, chatId);
      setChats(prev => prev.map(c => (c.id === chatId ? { ...c, unread_count: 0 } : c)));
      setSelected((prev) => (prev ? { ...prev, unread_count: 0 } : prev));
    } catch (error) {
      console.error("Erro ao marcar chat como lido:", error);
    }
  }

  function handleSelectChat(c) {
    setSelected(c);
    localStorage.setItem("nf:lastChatId", String(c.id));
    setAgentMenuOpen(false);

    // Sync AI State from backend (assumes backend returns these fields)
    setIaActive(!!c.is_ai_active);
    setSelectedAgentId(c.ai_agent_id || (agents.length > 0 ? agents[0].id : null));

    if (c.unread_count > 0) markChatRead(c.id);
    fetchMessagesOnce();
  }

  // Update backend when IA or Agent changes
  async function updateChatAIConfig(chatId, isActive, agentId) {
    if (!chatId) return;
    try {
      await apiClient.patch(`/api/whatsapp/chats/${chatId}`, {
        is_ai_active: isActive,
        ai_agent_id: agentId
      });
      // Update local chat list to reflect changes
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_ai_active: isActive, ai_agent_id: agentId } : c));
    } catch (error) {
      console.error("Erro ao atualizar config IA:", error);
      alert("Erro ao salvar configuração da IA.");
    }
  }

  async function send() {
    if (!text.trim() || !selected) return;
    handleSendMessage(); // Use the unified send message handler
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }


  // AI State Management
  const [iaActive, setIaActive] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  // Auto-select first agent if available
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents]);

  // Auto-sync: Atualizar estado local quando chat selecionado é atualizado no backend
  useEffect(() => {
    if (selected && chats.length > 0) {
      const updatedChat = chats.find(c => c.id === selected.id);
      if (updatedChat) {
        // Verificar se is_ai_active ou ai_agent_id mudaram
        if (updatedChat.is_ai_active !== iaActive || updatedChat.ai_agent_id !== selectedAgentId) {
          console.log('[SupportChat] 🔄 Auto-sincronizando estado IA do chat', updatedChat.id);
          setIaActive(!!updatedChat.is_ai_active);
          setSelectedAgentId(updatedChat.ai_agent_id || (agents.length > 0 ? agents[0].id : null));
          // Atualizar também o objeto selected
          setSelected(updatedChat);
        }
      }
    }
  }, [chats, selected?.id]); // Executa quando chats mudam ou quando selected.id muda

  /* ===================== RENDER ===================== */
  return (
    <div className="w-full h-full max-h-[calc(100vh-6rem)] bg-gradient-to-br from-[#3E007A] via-[#4B1BA6] to-[#7A1E9B] p-4 rounded-xl text-white overflow-hidden flex flex-col">
      <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
        {/* -------- LISTA -------- */}
        <div className="col-span-12 md:col-span-4 xl:col-span-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Caixa de Entrada</h2>
              {/* Removed Recuperador 24h button as requested */}
            </div>

            {/* Seletor de WhatsApp - Dropdown Verdadeiro */}
            {availableInstances.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs text-white/70 font-medium">Filtrar por WhatsApp:</label>
                <div className="relative whatsapp-dropdown-container">
                  <button
                    onClick={() => setWhatsappDropdownOpen(!whatsappDropdownOpen)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition flex items-center justify-between hover:bg-white/15"
                  >
                    <span>
                      {selectedInstances.length === 0
                        ? 'Selecione...'
                        : selectedInstances.length === availableInstances.length
                          ? `Todos (${availableInstances.length})`
                          : selectedInstances.length === 1
                            ? availableInstances.find(i => i.instance_name === selectedInstances[0])?.displayName || selectedInstances[0]
                            : `${selectedInstances.length} selecionados`
                      }
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${whatsappDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {whatsappDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          const allNames = availableInstances.map(i => i.instance_name);
                          const newSelection = selectedInstances.length === availableInstances.length ? [] : allNames;
                          setSelectedInstances(newSelection);
                          localStorage.setItem("selected_instances", JSON.stringify(newSelection));
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 transition flex items-center justify-between border-b border-white/10"
                      >
                        <span>Todos</span>
                        {selectedInstances.length === availableInstances.length && (
                          <Check className="w-4 h-4 text-pink-500" />
                        )}
                      </button>
                      {availableInstances.map(instance => {
                        const isSelected = selectedInstances.includes(instance.instance_name);
                        const displayName = instance.displayName || instance.instance_name;
                        return (
                          <button
                            key={instance.instance_name}
                            onClick={() => {
                              const newSelection = isSelected
                                ? selectedInstances.filter(i => i !== instance.instance_name)
                                : [...selectedInstances, instance.instance_name];
                              setSelectedInstances(newSelection);
                              localStorage.setItem("selected_instances", JSON.stringify(newSelection));
                            }}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 transition flex items-center justify-between"
                          >
                            <span>{displayName}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-pink-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Toggle para Exibir Grupos */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-xs text-white/70 font-medium">Exibir Grupos</span>
              <button
                onClick={() => setShowGroups(!showGroups)}
                className={`relative w-11 h-6 rounded-full transition-colors ${showGroups ? 'bg-pink-500' : 'bg-white/20'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${showGroups ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
          </div>
          <div className="p-3 overflow-y-auto flex-1">
            {!chats.length && (
              <div className="text-white/70 text-sm px-3 py-2">Nenhuma conversa.</div>
            )}
            {chats.map((c) => {
              const isSelected = selected?.id === c.id;
              const time = c.updated_at ? formatMessageDate(new Date(c.updated_at).getTime() / 1000) : "";
              const badge = !!c.unread_count;
              const platform = platformFromChat(c);
              const Icon = platformIcon(platform);
              const phoneRaw = phoneFromJid(c.jid);
              const phoneLabel = formatPhone(phoneRaw);
              const displayName = c.instance_displayName || c.instance_name || "";
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
                    {avatar ? (
                      <img src={avatar} alt={c.title || phoneLabel} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-bold text-white/90">
                        {getInitials(c.title || phoneLabel)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-white truncate">{getCleanTitle(c)}</span>
                            <span className="shrink-0 opacity-90"><Icon className="w-4 h-4" /></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] text-white/60 truncate">{phoneLabel}</div>
                            {availableInstances.length > 1 && displayName && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 shrink-0">
                                {displayName}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-white/70 shrink-0">{time}</span>
                      </div>
                      <div className="mt-1 text-sm text-white/80 truncate">{c.last_message || ""}</div>
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
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-bold text-white/90">
                {selected ? getInitials(getCleanTitle(selected)) : "?"}
              </div>
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {selected ? getCleanTitle(selected) : "Selecione um chat"}
                  {selected && (
                    <span className="opacity-90">
                      {React.createElement(platformIcon(platformFromChat(selected)), { className: "w-4 h-4" })}
                    </span>
                  )}
                </div>
                {selected && (<div className="text-xs text-white/70">{formatPhone(phoneFromJid(selected.jid))} · via {platformFromChat(selected)}</div>)}
              </div>
            </div>
            {selected && (
              <div className="flex items-center gap-4">
                {/* AI Agent Control */}
                <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5">
                  {/* Agent Selector Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedAgentId || ''}
                      onChange={(e) => {
                        const newAgentId = e.target.value;
                        setSelectedAgentId(newAgentId);
                        if (selected) updateChatAIConfig(selected.id, iaActive, newAgentId);
                      }}
                      className="bg-transparent text-sm text-white/90 border-r border-white/10 px-3 py-1 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors rounded-l-full pr-8"
                      disabled={iaActive} // Disable switching agent while active
                      style={{ maxWidth: '150px' }}
                    >
                      <option value="" disabled>Selecione um Agente</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id} className="bg-[#1a1a2e] text-white">
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-white/50 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 px-3">
                    <span className={`text-xs font-bold ${iaActive ? 'text-green-400' : 'text-gray-400'}`}>IA</span>
                    <button
                      onClick={() => {
                        if (!selectedAgentId && !iaActive) {
                          alert("Selecione um agente primeiro.");
                          return;
                        }
                        const newState = !iaActive;
                        setIaActive(newState);
                        updateChatAIConfig(selected.id, newState, selectedAgentId);
                      }}
                      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${iaActive ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-white/10 hover:bg-white/20"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${iaActive ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-6" onScroll={handleScroll}>
            {!selected && <div className="text-white/70 text-sm">Selecione um chat ao lado.</div>}
            {selected && (
              <div className="max-w-4xl mx-auto space-y-4">
                {groupMessages(messages).map((group, groupIdx) => {
                  const firstMsg = group.messages[0];
                  const mine = group.fromMe;
                  const avatar = selected.avatar_url || "";
                  const initial = (getCleanTitle(selected) || "?").slice(0, 1).toUpperCase();

                  return (
                    <div key={groupIdx} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                      {/* Avatar removido */}

                      {/* Mensagens agrupadas */}
                      <div className={`flex flex-col gap-1 max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                        {group.messages.map((m, msgIdx) => {
                          const time = formatMessageDate(m.timestamp);
                          const body = m.text || m.message_text || "";
                          const isSending = m.status === 'sending';
                          console.log('[DEBUG] Renderizando mensagem:', { id: m.id, text: m.text, body, fromMe: m.from_me });
                          return (
                            <motion.div
                              key={m.id || m.message_id}
                              initial={{ opacity: 0, x: mine ? 20 : -20, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{
                                duration: 0.3,
                                delay: msgIdx * 0.05,
                                type: "spring",
                                stiffness: 300,
                                damping: 25
                              }}
                              className={`px-3 py-1.5 rounded-xl text-sm shadow-sm min-w-[80px] max-w-[85%] sm:max-w-[450px] ${mine ? "bg-pink-500/95 text-white rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"} ${isSending ? 'opacity-70' : ''}`}
                            >
                              {/* Renderizar mídia ou texto */}
                              {(m.media_url || m.media_type) ? (
                                <RenderMediaMessage
                                  media_type={m.media_type}
                                  media_url={m.media_url}
                                  caption={m.caption}
                                  filename={m.filename}
                                  fromMe={mine}
                                />
                              ) : (
                                <div className="whitespace-pre-wrap break-words leading-snug">
                                  {renderTextWithLinks(body)}
                                </div>
                              )}
                              <div className="text-[10px] opacity-70 mt-0.5 text-right flex items-center justify-end gap-1">
                                {time}
                                <CheckMarks status={m.status} fromMe={mine} />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* -------- FOOTER (ALWAYS VISIBLE) v2.1 BUILD-20251214 -------- */}
          {selected && (
            <div className="flex-none w-full border-t border-white/10 bg-white/5 backdrop-blur-md"
              data-version="2.1"
            >
              {iaActive ? (
                /* Chill Mode - HORIZONTAL */
                <div className="w-full px-6 py-4">
                  <div className="flex items-center justify-between gap-6 max-w-5xl mx-auto bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl px-6 py-4 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Sun className="w-10 h-10 text-yellow-400 absolute -right-2 -top-2 animate-spin-slow" />
                        <Palmtree className="w-12 h-12 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base">Modo Automático Ativo</h3>
                        <p className="text-white/60 text-sm">
                          <span className="text-purple-300 font-semibold">{agents.find(a => a.id === selectedAgentId)?.name}</span> está gerenciando este chat.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIaActive(false);
                        updateChatAIConfig(selected.id, false, selectedAgentId);
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all border border-white/10"
                    >
                      Retomar Controle
                    </button>
                  </div>
                </div>
              ) : (
                /* Manual Mode - ALWAYS VISIBLE INPUT */
                <div className="w-full px-6 py-4">
                  <div className="flex items-end gap-3 max-w-5xl mx-auto">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isRecording}
                      className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 border border-white/10 shrink-0"
                      title="Anexar arquivo"
                    >
                      <Paperclip className="w-5 h-5 text-gray-300" />
                    </button>

                    <button
                      onClick={toggleRecording}
                      disabled={uploading || !selected || !!filePreview || !!audioPreview}
                      className={`p-3 rounded-full transition-all shrink-0 disabled:opacity-50 ${isRecording ? 'bg-red-500 animate-pulse text-white shadow-lg shadow-red-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'}`}
                      title={isRecording ? "Parar gravação" : "Gravar áudio"}
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    <div className="flex-1 relative">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        placeholder="Digite sua mensagem..."
                        className="w-full resize-none rounded-2xl px-4 py-3 outline-none border border-white/10 placeholder-white/40 text-white bg-black/20 focus:bg-black/30 focus:border-white/20 transition-all custom-scrollbar"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                      />
                    </div>

                    <button
                      onClick={send}
                      disabled={(!text.trim() && !filePreview && !audioPreview) || sending || uploading}
                      className={`p-3 rounded-full transition-all shrink-0 shadow-lg ${(!text.trim() && !filePreview && !audioPreview) || sending || uploading
                        ? "bg-white/5 text-gray-500 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white transform active:scale-95 hover:shadow-emerald-500/50"
                        }`}
                      title="Enviar"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Gravação em Andamento */}
      {
        isRecording && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl text-center min-w-[320px]"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-red-500 p-6 rounded-full">
                    <Mic className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-white text-xl font-bold mb-2">Gravando áudio</h3>
                  <p className="text-white/70 text-3xl font-mono tabular-nums">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <button
                  onClick={toggleRecording}
                  className="mt-4 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" fill="currentColor" />
                  Parar Gravação
                </button>
              </div>
            </motion.div>
          </div>
        )
      }

      {/* Modal de Preview de Arquivo */}
      {
        filePreview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl max-w-2xl w-full"
            >
              <h3 className="text-white text-lg font-bold mb-4">Preview do Arquivo</h3>

              <div className="bg-black/30 rounded-xl p-4 mb-4 max-h-96 overflow-auto">
                {filePreview.type === 'image' && (
                  <img src={filePreview.url} alt="Preview" className="w-full rounded-lg" />
                )}
                {filePreview.type === 'video' && (
                  <video src={filePreview.url} controls className="w-full rounded-lg" />
                )}
                {(filePreview.type === 'document' || filePreview.type === 'audio') && (
                  <div className="text-center py-8">
                    <Paperclip className="w-16 h-16 text-white/50 mx-auto mb-4" />
                    <p className="text-white font-medium">{filePreview.file.name}</p>
                    <p className="text-white/60 text-sm mt-1">
                      {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelFilePreview}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendFilePreview}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )
      }

      {/* Modal de Preview de Áudio */}
      {
        audioPreview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full"
            >
              <h3 className="text-white text-lg font-bold mb-4">Preview do Áudio</h3>

              <div className="bg-black/30 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-pink-500/20 p-3 rounded-full">
                    <Mic className="w-6 h-6 text-pink-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Áudio Gravado</p>
                    <p className="text-white/60 text-sm">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>

                {/* Player de áudio customizado */}
                <CustomAudioPlayer src={audioPreview.url} />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelAudioPreview}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendAudioPreview}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
}

/* ===================== ÍCONES ===================== */
function SendIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function platformIcon(platform) {
  switch (platform) {
    case "instagram": return InstagramIcon;
    case "facebook": return FacebookIcon;
    case "telegram": return TelegramIcon;
    case "whatsapp": default: return WhatsAppIcon;
  }
}
function WhatsAppIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#25D366" d="M12.04 2C6.56 2 2.1 6.46 2.1 11.95c0 2.1.62 4.04 1.68 5.67L2 22l4.51-1.71a9.9 9.9 0 0 0 5.53 1.62c5.48 0 9.94-4.46 9.94-9.95C22 6.46 17.52 2 12.04 2z" />
      <path fill="#fff" d="M17.27 14.39c-.12.34-.71.67-.99.71-.26.04-.6.06-.96-.06a9.06 9.06 0 0 1-3.22-1.7c-1.1-.87-1.82-1.94-2.1-2.33-.28-.39-.5-.86-.5-1.48s.31-1.06.43-1.21c.12-.15.26-.18.35-.18h.25c.08 0 .19-.02.3.23.12.27.4.93.44 1 .04.07.06.15.01.24-.04.09-.07.15-.14.23-.07.08-.15.18-.21.24-.07.08-.15.16-.06.31.09.15.4.66.86 1.07.6.53 1.11.69 1.27.76.16.06.25.05.35-.03.1-.08.41-.47.52-.63.12-.15.22-.13.37-.08.15.05.93.44 1.09.52.16.08.26.12.3.19.04.07.04.4-.08.74z" />
    </svg>
  );
}
function InstagramIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <radialGradient id="ig" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stopColor="#FFDC80" /><stop offset="25%" stopColor="#FCAF45" />
        <stop offset="50%" stopColor="#F56040" /><stop offset="75%" stopColor="#E1306C" /><stop offset="100%" stopColor="#833AB4" />
      </radialGradient>
      <path fill="url(#ig)" d="M7 2h10c2.76 0 5 2.24 5 5v10c0 2.76-2.24 5-5 5H7c-2.76 0-5-2.24-5-5V7c0-2.76 2.24-5 5-5z" />
      <path fill="#fff" d="M12 7a5 5 0 100 10 5 5 0 000-10zm6-1.2a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" />
    </svg>
  );
}
function FacebookIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#1877F2" d="M22 12.07C22 6.53 17.52 2 12 2S2 6.53 2 12.07C2 17.1 5.66 21.22 10.44 22v-7.03H7.9v-2.9h2.54V9.41c0-2.5 1.5-3.89 3.8-3.89 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.62.77-1.62 1.56v1.86h2.76l-.44 2.9h-2.32V22C18.34 21.22 22 17.1 22 12.07z" />
    </svg>
  );
}
function TelegramIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path fill="#2CA5E0" d="M22 12.04C22 6.5 17.52 2 12 2S2 6.5 2 12.04C2 17.1 5.66 21.22 10.44 22v-6.3l-2.5-2.43 8.58-5.01-5.54 6.9 5.54 2.66V22C18.34 21.22 22 17.1 22 12.04z" />
    </svg>
  );
}

export { SupportChatComponent as SupportChat };
export default SupportChatComponent;