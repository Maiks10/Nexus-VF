/**
 * FUNNEL SCHEDULER
 * Sistema de agendamento para processar nós de Wait e verificar triggers
 */

const FunnelEngine = require('./FunnelEngine');

class FunnelScheduler {
    constructor(pool) {
        this.pool = pool;
        this.funnelEngine = new FunnelEngine(pool);
        this.isRunning = false;
        this.interval = null;
    }

    /**
     * Iniciar o scheduler (executa a cada minuto)
     */
    start() {
        if (this.isRunning) {
            console.log('[FunnelScheduler] ⚠️ Scheduler já está rodando');
            return;
        }

        console.log('[FunnelScheduler] 🚀 Iniciando scheduler...');
        this.isRunning = true;

        // Executar imediatamente
        this.processWaitingExecutions();
        this.checkNoResponseTriggers();

        // Executar a cada 1 minuto (wait triggers)
        this.interval = setInterval(() => {
            this.processWaitingExecutions();
        }, 60 * 1000);

        // Executar a cada 5 minutos (no_response triggers)
        this.noResponseInterval = setInterval(() => {
            this.checkNoResponseTriggers();
        }, 5 * 60 * 1000); // 300 segundos

        console.log('[FunnelScheduler] ✅ Scheduler iniciado - wait: 1min, no_response: 5min');
    }

    /**
     * Parar o scheduler
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.noResponseInterval) {
            clearInterval(this.noResponseInterval);
            this.noResponseInterval = null;
        }
        this.isRunning = false;
        console.log('[FunnelScheduler] 🛑 Scheduler parado');
    }

    /**
     * Processar execuções que estão aguardando (status = 'waiting')
     */
    async processWaitingExecutions() {
        try {
            console.log('[FunnelScheduler] ⏰ Verificando execuções aguardando...');

            // Buscar execuções em estado 'waiting' que já podem continuar
            const result = await this.pool.query(`
                SELECT fe.*, f.config, f.user_id, c.phone, c.name as contact_name
                FROM funnel_executions fe
                JOIN funnels f ON f.id = fe.funnel_id
                JOIN contacts c ON c.id = fe.contact_id
                WHERE fe.status = 'waiting'
                AND fe.last_action_at IS NOT NULL
                ORDER BY fe.last_action_at ASC
                LIMIT 100
            `);

            if (result.rows.length === 0) {
                console.log('[FunnelScheduler] ℹ️ Nenhuma execução aguardando');
                return;
            }

            console.log(`[FunnelScheduler] 📋 ${result.rows.length} execução(ões) em espera encontrada(s)`);

            for (const execution of result.rows) {
                try {
                    // Encontrar o nó atual
                    const currentNode = execution.config.nodes.find(n => n.id === execution.current_node_id);

                    if (!currentNode) {
                        console.log(`[FunnelScheduler] ⚠️ Nó atual não encontrado para execução ${execution.id}`);
                        continue;
                    }

                    // Verificar se é um nó de wait
                    if (currentNode.type === 'wait') {
                        const config = currentNode.config || {};
                        const waitValue = parseInt(config.wait_value) || 1;
                        const waitUnit = config.wait_unit || 'minutes';

                        // Calcular quanto tempo passou desde last_action_at
                        const lastActionTime = new Date(execution.last_action_at).getTime();
                        const now = Date.now();
                        const elapsedMs = now - lastActionTime;

                        // Calcular tempo necessário
                        const timeMap = {
                            'minutes': waitValue * 60 * 1000,
                            'hours': waitValue * 60 * 60 * 1000,
                            'days': waitValue * 24 * 60 * 60 * 1000
                        };

                        const requiredWaitMs = timeMap[waitUnit] || timeMap['minutes'];

                        // Se já passou o tempo necessário, continuar
                        if (elapsedMs >= requiredWaitMs) {
                            console.log(`[FunnelScheduler] ⏰ Tempo de espera completado para execução ${execution.id} (${waitValue} ${waitUnit})`);

                            // Atualizar status para running
                            await this.pool.query(
                                'UPDATE funnel_executions SET status = $1 WHERE id = $2',
                                ['running', execution.id]
                            );

                            // Continuar para o próximo nó
                            await this.funnelEngine.moveToNextNode(execution.id, currentNode.id);

                            console.log(`[FunnelScheduler] ✅ Execução ${execution.id} retomada`);
                        } else {
                            const remainingMs = requiredWaitMs - elapsedMs;
                            const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
                            console.log(`[FunnelScheduler] ⏳ Execução ${execution.id} ainda aguardando (${remainingMinutes} min restantes)`);
                        }
                    } else {
                        // Não é wait, algo deu errado - atualizar status
                        console.log(`[FunnelScheduler] ⚠️ Execução ${execution.id} está em 'waiting' mas nó não é do tipo 'wait'`);

                        await this.pool.query(
                            'UPDATE funnel_executions SET status = $1 WHERE id = $2',
                            ['running', execution.id]
                        );
                    }

                } catch (execError) {
                    console.error(`[FunnelScheduler] ❌ Erro ao processar execução ${execution.id}:`, execError.message);
                }
            }

        } catch (error) {
            console.error('[FunnelScheduler] ❌ Erro ao processar execuções:', error.message);
        }
    }

    /**
     * Verificar e acionar funnels baseados em triggers de palavra-chave
     * @param {number} userId - ID do usuário
     * @param {number} contactId - ID do contato
     * @param {string} messageText - Texto da mensagem recebida
     */
    async checkAndTriggerFunnels(userId, contactId, messageText) {
        try {
            if (!messageText || messageText.trim() === '') return;

            const lowerMessage = messageText.toLowerCase().trim();

            console.log(`[FunnelScheduler] 🔍 Verificando funnels ativos para palavra: "${lowerMessage}"`);

            // Buscar funnels ativos do usuário
            const result = await this.pool.query(`
                SELECT * FROM funnels 
                WHERE company_id = $1 AND is_active = true
                ORDER BY created_at DESC
            `, [userId]);

            if (result.rows.length === 0) {
                console.log(`[FunnelScheduler] ℹ️ Nenhum funnel ativo encontrado para usuário ${userId}`);
                return;
            }

            console.log(`[FunnelScheduler] 📋 ${result.rows.length} funnel(s) ativo(s) encontrado(s)`);

            for (const funnel of result.rows) {
                const config = funnel.config;
                if (!config || !config.nodes) {
                    console.log(`[FunnelScheduler] ⚠️ Funnel "${funnel.name}" sem config ou nodes`);
                    continue;
                }

                console.log(`[FunnelScheduler] 🔎 Analisando funnel: "${funnel.name}"`);
                console.log(`[FunnelScheduler]    Nodes: ${config.nodes.map(n => n.type).join(', ')}`);

                // Encontrar nó de trigger (pode ser trigger_keyword ou whatsapp)
                const triggerNode = config.nodes.find(n =>
                    n.type === 'trigger_keyword' ||
                    n.type === 'whatsapp' ||
                    n.type.startsWith('trigger_')
                );

                if (!triggerNode) {
                    console.log(`[FunnelScheduler] ⚠️ Funnel "${funnel.name}" não possui nó de trigger`);
                    continue;
                }

                console.log(`[FunnelScheduler]    Trigger type: ${triggerNode.type}`);
                console.log(`[FunnelScheduler]    Trigger config:`, JSON.stringify(triggerNode.config));

                // Verificar tipo de trigger
                const triggerEvent = triggerNode.config?.triggerEvent || 'received_message_keyword';

                let isMatch = false;

                // TRIGGER: NOVA CONVERSA
                if (triggerEvent === 'new_conversation') {
                    // Verificar se é a primeira mensagem do contato
                    const contactCheck = await this.pool.query(
                        'SELECT last_user_message_at FROM contacts WHERE id = $1',
                        [contactId]
                    );

                    if (contactCheck.rows.length > 0) {
                        const lastMessage = contactCheck.rows[0].last_user_message_at;

                        // É nova conversa se nunca enviou mensagem antes
                        if (!lastMessage) {
                            isMatch = true;
                            console.log(`[FunnelScheduler]    ✅ NOVA CONVERSA detectada!`);
                        } else {
                            console.log(`[FunnelScheduler]    ℹ️ Contato já conversou antes (${lastMessage})`);
                        }
                    }
                }
                // TRIGGER: PALAVRA-CHAVE
                else if (triggerEvent === 'received_message_keyword') {
                    // Extrair keywords - pode ser string ou array
                    let keywords = triggerNode.config?.keywords ||
                        triggerNode.config?.keyword ||
                        triggerNode.config?.expected_word ||
                        [];

                    // Garantir que keywords seja sempre um array
                    if (typeof keywords === 'string') {
                        keywords = [keywords];
                    } else if (!Array.isArray(keywords)) {
                        keywords = [];
                    }

                    const matchType = triggerNode.config?.match_type || 'exact';

                    console.log(`[FunnelScheduler]    Keywords: ${JSON.stringify(keywords)}`);
                    console.log(`[FunnelScheduler]    Match Type: ${matchType}`);

                    if (keywords.length > 0) {
                        if (matchType === 'exact') {
                            isMatch = keywords.some(keyword =>
                                lowerMessage === keyword.toLowerCase().trim()
                            );
                        } else if (matchType === 'contains') {
                            isMatch = keywords.some(keyword =>
                                lowerMessage.includes(keyword.toLowerCase().trim())
                            );
                        }
                    } else {
                        console.log(`[FunnelScheduler]    ⚠️ Nenhuma keyword configurada`);
                    }
                }

                console.log(`[FunnelScheduler]    Match result: ${isMatch}`);

                if (isMatch) {
                    console.log(`[FunnelScheduler] 🎯 MATCH! Funnel "${funnel.name}" disparado pela palavra "${lowerMessage}"`);

                    // Verificar se já existe uma execução ativa para este contato neste funnel
                    const existingExecution = await this.pool.query(`
                        SELECT id FROM funnel_executions 
                        WHERE funnel_id = $1 AND contact_id = $2 AND status IN ('running', 'waiting')
                        LIMIT 1
                    `, [funnel.id, contactId]);


                    if (existingExecution.rows.length > 0) {
                        console.log(`[FunnelScheduler] ⚠️ Execução já em andamento para este contato no funnel ${funnel.name}`);

                        // Auto-limpar execuções travadas (sem progresso há mais de 5 minutos)
                        const cleanupResult = await this.pool.query(`
                            UPDATE funnel_executions 
                            SET status = 'failed', 
                                error_message = 'Auto-limpeza: execução travada sem progresso'
                            WHERE id = $1 
                              AND status IN ('running', 'waiting')
                              AND (last_action_at IS NULL OR last_action_at < NOW() - INTERVAL '5 minutes')
                            RETURNING id
                        `, [existingExecution.rows[0].id]);

                        if (cleanupResult.rows.length > 0) {
                            console.log(`[FunnelScheduler] 🧹 Execução travada limpa automaticamente, tentando novamente...`);
                            // Não usar continue, deixar executar abaixo
                        } else {
                            continue; // Execução ainda está válida
                        }
                    }

                    // Iniciar execução do funnel
                    try {
                        await this.funnelEngine.startFunnelForContact(
                            funnel.id,
                            contactId,
                            { triggeredBy: 'keyword', keyword: lowerMessage, messageText }
                        );

                        console.log(`[FunnelScheduler] ✅ Funnel "${funnel.name}" iniciado para contato ${contactId}`);
                    } catch (startError) {
                        console.error(`[FunnelScheduler] ❌ Erro ao iniciar funnel ${funnel.name}:`, startError.message);
                    }
                }
            }

        } catch (error) {
            console.error('[FunnelScheduler] ❌ Erro ao verificar triggers:', error.message);
        }
    }

    /**
     * Verificar e disparar funnels por "sem resposta há X tempo"
     */
    async checkNoResponseTriggers() {
        try {
            console.log('[FunnelScheduler] 🕐 Verificando triggers "sem resposta"...');

            // 1. Buscar funnels ativos com trigger no_response
            const funnelsResult = await this.pool.query(`
                SELECT id, name, config, user_id
                FROM funnels
                WHERE is_active = true
            `);

            if (funnelsResult.rows.length === 0) {
                console.log('[FunnelScheduler] ℹ️ Nenhum funnel ativo com trigger no_response');
                return;
            }

            for (const funnel of funnelsResult.rows) {
                const config = funnel.config;

                // Encontrar o nó trigger
                const triggerNode = config.nodes?.find(n => n.type === 'trigger_whatsapp');

                if (!triggerNode) continue;

                const triggerConfig = triggerNode.config || {};

                // Verificar se é trigger no_response
                if (triggerConfig.triggerEvent !== 'no_response') continue;

                const timeAmount = parseInt(triggerConfig.noResponseTime) || 60;
                const timeUnit = triggerConfig.noResponseUnit || 'minutes';

                console.log(`[FunnelScheduler] 📋 Funnel "${funnel.name}": sem resposta há ${timeAmount} ${timeUnit}`);

                // 2. Converter para intervalo PostgreSQL
                const interval = `${timeAmount} ${timeUnit}`;

                // 3. Buscar contatos sem resposta (limit 100 para evitar sobrecarga)
                // IMPORTANTE: Não dispara se já foi executado nas últimas 24h (evita loop infinito)
                const contactsResult = await this.pool.query(`
                    SELECT c.id, c.phone, c.name
                    FROM contacts c
                    WHERE c.last_user_message_at < NOW() - INTERVAL '${interval}'
                    AND c.last_user_message_at IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1 FROM funnel_executions fe
                        WHERE fe.funnel_id = $1
                        AND fe.contact_id = c.id
                        AND (
                            fe.status IN ('running', 'waiting')
                            OR (fe.status = 'completed' AND fe.created_at > NOW() - INTERVAL '24 hours')
                        )
                    )
                    LIMIT 100
                `, [funnel.id]);

                if (contactsResult.rows.length === 0) {
                    console.log(`[FunnelScheduler] ℹ️ Nenhum contato sem resposta para "${funnel.name}"`);
                    continue;
                }

                console.log(`[FunnelScheduler] 🎯 ${contactsResult.rows.length} contato(s) sem resposta para "${funnel.name}"`);

                // 4. Iniciar funnel para cada contato
                for (const contact of contactsResult.rows) {
                    try {
                        await this.funnelEngine.startFunnelForContact(
                            funnel.id,
                            contact.id,
                            { triggeredBy: 'no_response', timeAmount, timeUnit }
                        );

                        console.log(`[FunnelScheduler] ✅ Funnel "${funnel.name}" iniciado para ${contact.name || contact.phone} (sem resposta)`);
                    } catch (startError) {
                        console.error(`[FunnelScheduler] ❌ Erro ao iniciar funnel para contato ${contact.id}:`, startError.message);
                    }
                }
            }

        } catch (error) {
            console.error('[FunnelScheduler] ❌ Erro ao verificar no_response triggers:', error.message);
        }
    }

    /**
     * Verificar e disparar funnels por triggers CRM
     * @param {number} userId - ID do usuário
     * @param {number} contactId - ID do contato
     * @param {object} eventData - { event, from, to, tag, data }
     */
    async checkCRMTriggers(userId, contactId, eventData) {
        try {
            const { event, from, to, tag, data } = eventData;

            console.log(`[FunnelScheduler] 🔔 CRM Trigger: ${event}`, { contactId, from, to, tag });

            // Buscar funnels ativos do usuário com trigger_crm
            const funnelsResult = await this.pool.query(`
                SELECT id, name, config
                FROM funnels
                WHERE company_id = $1 AND is_active = true
            `, [userId]);

            if (funnelsResult.rows.length === 0) {
                console.log('[FunnelScheduler] ℹ️ Nenhum funnel ativo encontrado');
                return;
            }

            console.log(`[FunnelScheduler] 📋 ${funnelsResult.rows.length} funnel(s) ativo(s) encontrado(s)`);

            for (const funnel of funnelsResult.rows) {
                const config = funnel.config;

                // Encontrar nó trigger_crm
                const triggerNode = config.nodes?.find(n => n.type === 'trigger_crm');

                if (!triggerNode) {
                    console.log(`[FunnelScheduler]    ⚠️ Funnel "${funnel.name}" não tem trigger_crm`);
                    continue;
                }

                const triggerConfig = triggerNode.config || {};
                console.log(`[FunnelScheduler] 🔎 Analisando funnel: "${funnel.name}"`);
                console.log(`[FunnelScheduler]    Trigger Event: ${triggerConfig.triggerEvent}`);
                console.log(`[FunnelScheduler]    Trigger Config:`, JSON.stringify(triggerConfig));

                let isMatch = false;

                // LEAD CRIADO
                if (event === 'lead_created' && triggerConfig.triggerEvent === 'lead_created') {
                    isMatch = true;
                    console.log(`[FunnelScheduler] ✅ Match: Lead criado para funnel "${funnel.name}"`);
                }

                // TEMPERATURA MUDOU
                if (event === 'temperature_changed' && triggerConfig.triggerEvent === 'temperature_changed') {
                    console.log(`[FunnelScheduler]    Verificando temperatura:`);
                    console.log(`[FunnelScheduler]      - Esperado FROM: ${triggerConfig.fromTemperature}`);
                    console.log(`[FunnelScheduler]      - Recebido FROM: ${from}`);
                    console.log(`[FunnelScheduler]      - Esperado TO: ${triggerConfig.toTemperature}`);
                    console.log(`[FunnelScheduler]      - Recebido TO: ${to}`);

                    const fromMatch = triggerConfig.fromTemperature === 'any' || triggerConfig.fromTemperature === from;
                    const toMatch = triggerConfig.toTemperature === to;

                    console.log(`[FunnelScheduler]      - FROM Match: ${fromMatch}`);
                    console.log(`[FunnelScheduler]      - TO Match: ${toMatch}`);

                    if (fromMatch && toMatch) {
                        isMatch = true;
                        console.log(`[FunnelScheduler] ✅ Match: Temperatura mudou ${from} → ${to} para funnel "${funnel.name}"`);
                    } else {
                        console.log(`[FunnelScheduler] ❌ Sem match: Temperatura não corresponde`);
                    }
                }

                // TAG ADICIONADA
                if (event === 'tag_added' && triggerConfig.triggerEvent === 'tag_added') {
                    if (triggerConfig.tagName === tag) {
                        isMatch = true;
                        console.log(`[FunnelScheduler] ✅ Match: Tag "${tag}" adicionada para funnel "${funnel.name}"`);
                    }
                }

                // Se houver match, verificar se já existe execução ativa
                if (isMatch) {
                    const existingExecution = await this.pool.query(`
                        SELECT id FROM funnel_executions
                        WHERE funnel_id = $1 AND contact_id = $2
                        AND status IN ('running', 'waiting')
                        LIMIT 1
                    `, [funnel.id, contactId]);


                    if (existingExecution.rows.length > 0) {
                        console.log(`[FunnelScheduler] ⚠️ Execução já em andamento para "${funnel.name}"`);

                        // Auto-limpar execuções travadas (sem progresso há mais de 5 minutos)
                        const cleanupResult = await this.pool.query(`
                            UPDATE funnel_executions 
                            SET status = 'failed', 
                                error_message = 'Auto-limpeza: execução travada sem progresso'
                            WHERE id = $1 
                              AND status IN ('running', 'waiting')
                              AND (last_action_at IS NULL OR last_action_at < NOW() - INTERVAL '5 minutes')
                            RETURNING id
                        `, [existingExecution.rows[0].id]);

                        if (cleanupResult.rows.length > 0) {
                            console.log(`[FunnelScheduler] 🧹 Execução travada limpa automaticamente, tentando novamente...`);
                            // Não usar continue, deixar executar abaixo
                        } else {
                            continue; // Execução ainda está válida
                        }
                    }

                    // Disparar funnel
                    try {
                        await this.funnelEngine.startFunnelForContact(
                            funnel.id,
                            contactId,
                            { triggeredBy: event, ...eventData }
                        );

                        console.log(`[FunnelScheduler] ✅ Funnel "${funnel.name}" iniciado para contato ${contactId}`);
                    } catch (startError) {
                        console.error(`[FunnelScheduler] ❌ Erro ao iniciar funnel "${funnel.name}":`, startError.message);
                    }
                }
            }

        } catch (error) {
            console.error('[FunnelScheduler] ❌ Erro ao verificar CRM triggers:', error.message);
        }
    }
}

module.exports = FunnelScheduler;

