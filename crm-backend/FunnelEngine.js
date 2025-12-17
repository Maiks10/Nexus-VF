/**
 * FUNNEL EXECUTION ENGINE
 * Sistema de execução de automações de funil
 * Processa triggers, actions, conditions e waits
 */

const { Pool } = require('pg');
const axios = require('axios');
const { sendEvolutionTextMessage } = require('./evolutionHelpers');

class FunnelEngine {
    constructor(pool) {
        this.pool = pool;
        this.runningExecutions = new Map(); // Cache de execuções em andamento
    }

    /**
     * Iniciar uma execução de funil para um contato
     */
    async startFunnelForContact(funnelId, contactId, triggerData = {}) {
        try {
            // 1. Buscar funil
            const funnelResult = await this.pool.query(
                'SELECT * FROM funnels WHERE id = $1 AND is_active = true',
                [funnelId]
            );

            if (funnelResult.rows.length === 0) {
                throw new Error('Funil não encontrado ou inativo');
            }

            const funnel = funnelResult.rows[0];
            const config = funnel.config;

            // 2. Encontrar nó inicial (primeiro trigger)
            const startNode = config.nodes.find(n => n.type.startsWith('trigger_'));

            if (!startNode) {
                throw new Error('Funil não possui nó de trigger inicial');
            }

            // 3. Criar execução
            const executionResult = await this.pool.query(
                `INSERT INTO funnel_executions 
                (funnel_id, contact_id, current_node_id, status, context_data) 
                VALUES ($1, $2, $3, 'running', $4) 
                RETURNING *`,
                [funnelId, contactId, startNode.id, JSON.stringify({ trigger: triggerData })]
            );

            const execution = executionResult.rows[0];

            // 4. Atualizar estatísticas do funil
            await this.pool.query(
                `UPDATE funnels 
                SET stats = jsonb_set(stats, '{total_executions}', (COALESCE((stats->>'total_executions')::int, 0) + 1)::text::jsonb)
                WHERE id = $1`,
                [funnelId]
            );

            // 5. Processar primeiro nó
            await this.processNode(execution.id, startNode.id);

            return execution;

        } catch (error) {
            console.error('[FunnelEngine] Erro ao iniciar funil:', error);
            throw error;
        }
    }

    /**
     * Processar um nó específico
     */
    async processNode(executionId, nodeId) {
        try {
            // Buscar execução
            const execResult = await this.pool.query(
                `SELECT fe.*, f.config, f.user_id, c.phone, c.name as contact_name, c.email as contact_email
                FROM funnel_executions fe
                JOIN funnels f ON f.id = fe.funnel_id
                JOIN contacts c ON c.id = fe.contact_id
                WHERE fe.id = $1`,
                [executionId]
            );

            if (execResult.rows.length === 0) return;

            const execution = execResult.rows[0];
            const config = execution.config;
            const node = config.nodes.find(n => n.id === nodeId);

            if (!node) {
                console.error('[FunnelEngine] Nó não encontrado:', nodeId);
                return;
            }

            console.log(`[FunnelEngine] 🔄 Processando nó: ${node.title} (${node.type})`);

            // Log do início da ação
            const logId = await this.createActionLog(executionId, node);

            const startTime = Date.now();
            let result = { success: true, data: {} };

            try {
                // Processar baseado no tipo de nó
                if (node.type.startsWith('trigger_')) {
                    result = await this.processTrigger(node, execution);
                } else if (this.isAction(node.type)) {
                    result = await this.processAction(node, execution);
                } else if (node.type === 'wait') {
                    result = await this.processWait(node, execution);
                } else if (node.type === 'condition') {
                    result = await this.processCondition(node, execution);
                } else if (node.type === 'filter_by_tags') {
                    result = await this.processFilterByTags(node, execution);
                } else if (node.type === 'remove_from_funnel') {
                    result = await this.processRemoveFromFunnel(node, execution);
                }

                // Update log com sucesso
                const duration = Date.now() - startTime;
                await this.updateActionLog(logId, 'success', result.data, null, duration);

                // Atualizar execução
                await this.pool.query(
                    'UPDATE funnel_executions SET current_node_id = $1, last_action_at = NOW() WHERE id = $2',
                    [nodeId, executionId]
                );

                // Processar próximo nó APENAS se não retornou stopExecution
                if (!result.stopExecution) {
                    await this.moveToNextNode(executionId, nodeId, result);
                } else {
                    console.log(`[FunnelEngine] ⏸️ Execução pausada por stopExecution`);
                }

            } catch (error) {
                const duration = Date.now() - startTime;
                await this.updateActionLog(logId, 'failed', null, error.message, duration);

                // Marcar execução como falha
                await this.pool.query(
                    'UPDATE funnel_executions SET status = $1, error_message = $2 WHERE id = $3',
                    ['failed', error.message, executionId]
                );

                throw error;
            }

        } catch (error) {
            console.error('[FunnelEngine] Erro ao processar nó:', error);
        }
    }

    /**
     * Mover para próximo nó baseado nas conexões
     */
    async moveToNextNode(executionId, currentNodeId, result = {}) {
        const execResult = await this.pool.query(
            'SELECT fe.*, f.config FROM funnel_executions fe JOIN funnels f ON f.id = fe.funnel_id WHERE fe.id = $1',
            [executionId]
        );

        if (execResult.rows.length === 0) return;

        const execution = execResult.rows[0];
        const config = execution.config;

        // Encontrar conexões saindo deste nó
        const connections = config.connections.filter(c => c.start.startsWith(currentNodeId));

        if (connections.length === 0) {
            // Fim do funil
            await this.pool.query(
                'UPDATE funnel_executions SET status = $1, completed_at = NOW() WHERE id = $2',
                ['completed', executionId]
            );
            console.log('[FunnelEngine] ✅ Funil completado!');
            return;
        }

        // Para condições, usar o resultado para escolher o caminho
        let nextConnection = connections[0];

        if (result.path) {
            // Condition retornou um path específico
            nextConnection = connections.find(c =>
                c.start.includes(result.path) || c.sourceHandle?.includes(result.path)
            ) || connections[0];
        }


        // Extrair ID do próximo nó (formato: nodeId_handleId)
        const nextNodeId = nextConnection.end.split('_')[0];

        // Processar próximo nó
        const nodeResult = await this.processNode(executionId, nextNodeId);

        // Se retornou stopExecution (ex: wait), não continuar
        if (nodeResult?.stopExecution) {
            console.log(`[FunnelEngine] ⏸️ Execução pausada - aguardando scheduler`);
            return nodeResult;
        }

        return nodeResult;
    }

    /**
     * Process TRIGGER node
     */
    async processTrigger(node, execution) {
        // Triggers são pontos de entrada, não precisam processar nada
        console.log(`[FunnelEngine] ⚡ Trigger: ${node.title}`);
        return { success: true, data: { triggered: true } };
    }

    /**
     * Process ACTION nodes
     */
    async processAction(node, execution) {
        const actionType = node.type;
        const config = node.config || {};

        console.log(`[FunnelEngine] 🎬 Action: ${actionType}`);

        switch (actionType) {
            case 'send_whatsapp':
                return await this.sendWhatsAppAction(config, execution);

            case 'send_email':
                return await this.sendEmailAction(config, execution);

            case 'send_telegram':
                return await this.sendTelegramAction(config, execution);

            case 'assign_agent':
                return await this.assignAgentAction(config, execution);

            case 'add_tag':
                return await this.addTagAction(config, execution);

            case 'remove_tag':
                return await this.removeTagAction(config, execution);

            case 'update_lead':
                return await this.updateLeadAction(config, execution);

            case 'update_temperature':
                return await this.updateTemperatureAction(config, execution);



            default:
                console.warn(`[FunnelEngine] ⚠️ Action type não implementado: ${actionType}`);
                return { success: true, data: { skipped: true } };
        }
    }

    /**
     * Process WAIT node
     */
    async processWait(node, execution) {
        const config = node.config || {};
        const waitValue = parseInt(config.wait_value) || 1;
        const waitUnit = config.wait_unit || 'hours';

        // Calcular tempo em milissegundos
        const timeMap = {
            'minutes': waitValue * 60 * 1000,
            'hours': waitValue * 60 * 60 * 1000,
            'days': waitValue * 24 * 60 * 60 * 1000
        };

        const waitTime = timeMap[waitUnit] || timeMap['hours'];

        console.log(`[FunnelEngine] ⏳ Aguardando ${waitValue} ${waitUnit}...`);

        // Atualizar status para waiting
        // O FunnelScheduler vai verificar a cada minuto e continuar quando o tempo passar
        await this.pool.query(
            `UPDATE funnel_executions 
             SET status = $1, last_action_at = NOW() 
             WHERE id = $2`,
            ['waiting', execution.id]
        );

        console.log(`[FunnelEngine] ✅ Execução ${execution.id} marcada como 'waiting'. Scheduler processará em ${waitValue} ${waitUnit}.`);

        // IMPORTANTE: stopExecution impede continuar para próximo nó - scheduler vai retomar
        return { success: true, data: { waiting: true, duration: waitTime, waitValue, waitUnit }, stopExecution: true };
    }

    /**
     * Process CONDITION node
     */
    async processCondition(node, execution) {
        const config = node.config || {};

        console.log(`[FunnelEngine] 🔀 Condition: ${config.condition_type || 'generic'}`);

        // Buscar dados do contato
        const contact = await this.pool.query('SELECT * FROM contacts WHERE id = $1', [execution.contact_id]);
        const contactData = contact.rows[0];

        let conditionMet = false;

        // Diferentes tipos de condição
        switch (config.condition_type) {
            case 'tag_check':
                conditionMet = contactData.tags?.includes(config.tag_check);
                break;

            case 'temperature_check':
                conditionMet = contactData.temperature === config.temperature_value;
                break;

            case 'custom_field':
                conditionMet = contactData.custom_fields?.[config.field_name] === config.field_value;
                break;

            case 'lead_score':
                const score = contactData.lead_score || 0;
                conditionMet = this.evaluateComparison(score, config.operator, parseInt(config.score_value));
                break;

            default:
                // Fallback: verificar tag_check (compatibilidade)
                conditionMet = contactData.tags?.includes(config.tag_check);
        }

        return {
            success: true,
            data: { conditionMet },
            path: conditionMet ? 'yes' : 'no'
        };
    }

    /**
     * Process FILTER BY TAGS node
     */
    async processFilterByTags(node, execution) {
        const config = node.config || {};
        const filterMode = config.filter_mode || 'has_all';
        const filterTagsStr = config.filter_tags || '';
        const filterTags = filterTagsStr.split(',').map(t => t.trim()).filter(t => t);

        if (filterTags.length === 0) {
            console.warn('[FunnelEngine] ⚠️ Filtro sem tags configuradas, permitindo passagem');
            return {
                success: true,
                data: { passed: true },
                path: 'yes'
            };
        }

        console.log(`[FunnelEngine] 🔍 Filtro: ${filterMode} - Tags: ${filterTags.join(', ')}`);

        // Buscar dados do contato
        const contact = await this.pool.query('SELECT tags FROM contacts WHERE id = $1', [execution.contact_id]);
        const contactData = contact.rows[0];
        const contactTags = contactData?.tags || [];

        let passed = false;

        switch (filterMode) {
            case 'has_all':
                // Lead deve ter TODAS as tags
                passed = filterTags.every(tag => contactTags.includes(tag));
                break;

            case 'has_any':
                // Lead deve ter QUALQUER uma das tags
                passed = filterTags.some(tag => contactTags.includes(tag));
                break;

            case 'has_none':
                // Lead NÃO deve ter NENHUMA das tags
                passed = !filterTags.some(tag => contactTags.includes(tag));
                break;

            default:
                passed = false;
        }

        console.log(`[FunnelEngine] ${passed ? '✅ Passou no filtro' : '❌ Não passou no filtro'}`);

        return {
            success: true,
            data: { passed, contactTags, filterTags, mode: filterMode },
            path: passed ? 'yes' : 'no'
        };
    }

    /**
     * Process REMOVE FROM FUNNEL node
     */
    async processRemoveFromFunnel(node, execution) {
        const config = node.config || {};
        const removalMode = config.removal_mode || 'has_any';
        const removalTagsStr = config.removal_tags || '';
        const removalTags = removalTagsStr.split(',').map(t => t.trim()).filter(t => t);

        if (removalTags.length === 0) {
            console.warn('[FunnelEngine] ⚠️ Remoção sem tags configuradas, continuando execução');
            return {
                success: true,
                data: { removed: false }
            };
        }

        console.log(`[FunnelEngine] 🚫 Verificando remoção: ${removalMode} - Tags: ${removalTags.join(', ')}`);

        // Buscar dados do contato
        const contact = await this.pool.query('SELECT tags, name, phone FROM contacts WHERE id = $1', [execution.contact_id]);
        const contactData = contact.rows[0];
        const contactTags = contactData?.tags || [];

        let shouldRemove = false;

        switch (removalMode) {
            case 'has_any':
                // Remove se tiver QUALQUER uma das tags
                shouldRemove = removalTags.some(tag => contactTags.includes(tag));
                break;

            case 'has_all':
                // Remove se tiver TODAS as tags
                shouldRemove = removalTags.every(tag => contactTags.includes(tag));
                break;

            default:
                shouldRemove = false;
        }

        if (shouldRemove) {
            console.log(`[FunnelEngine] 🛑 Removendo ${contactData.name || contactData.phone} do funil`);

            // Marcar execução como completada (removida)
            await this.pool.query(
                `UPDATE funnel_executions 
                 SET status = 'completed', 
                     completed_at = NOW(), 
                     context_data = jsonb_set(context_data, '{removed}', 'true'::jsonb)
                 WHERE id = $1`,
                [execution.id]
            );

            return {
                success: true,
                data: { removed: true, reason: 'tag_match', tags: removalTags },
                stopExecution: true  // PARA a execução
            };
        } else {
            console.log(`[FunnelEngine] ✅ Lead continua no funil (tags não batem)`);
            return {
                success: true,
                data: { removed: false }
            };
        }
    }

    /**
     * ACTIONS IMPLEMENTATION
     */

    async sendWhatsAppAction(config, execution) {
        try {
            console.log(`[FunnelEngine] 🔍 DEBUG sendWhatsAppAction:`);
            console.log(`[FunnelEngine]    execution.user_id: ${execution.user_id}`);
            console.log(`[FunnelEngine]    execution.contact_id: ${execution.contact_id}`);

            // Buscar instância do usuário COM TOKEN
            const instanceResult = await this.pool.query(
                'SELECT instance_name, token FROM whatsapp_instances WHERE company_id = $1 LIMIT 1',
                [execution.company_id]
            );

            const instance = instanceResult.rows[0];
            const instanceName = instance.instance_name;
            const instanceToken = instance.token;

            console.log(`[FunnelEngine]    Instância: ${instanceName}`);
            console.log(`[FunnelEngine]    Token: ${instanceToken ? instanceToken.substring(0, 10) + '...' : 'NULL'}`);

            if (!instanceToken) {
                throw new Error(`Instância ${instanceName} não possui token configurado`);
            }

            // Buscar telefone do contato
            const contact = await this.pool.query('SELECT phone FROM contacts WHERE id = $1', [execution.contact_id]);
            const phone = contact.rows[0]?.phone;

            if (!phone) {
                throw new Error('Telefone do contato não encontrado');
            }

            // Limpar número (remover caracteres não numéricos)
            const cleanPhone = phone.replace(/\D/g, '');

            // Pegar mensagem do config e substituir variáveis
            let message = config.message || 'Mensagem do funil';
            message = message.replace(/\{\{nome\}\}/gi, execution.contact_name || 'Cliente');
            message = message.replace(/\{\{telefone\}\}/gi, cleanPhone);

            console.log(`[FunnelEngine] 📱 Enviando WhatsApp para ${cleanPhone}: ${message.substring(0, 50)}...`);

            // Enviar com TOKEN da instância (não apikey global!)
            const axios = require('axios');
            const response = await axios.post(`${process.env.EVOLUTION_API_URL || 'https://evo.nexusflow.info'}/send/text`, {
                number: cleanPhone,
                text: message
            }, {
                headers: {
                    'apikey': instanceToken,  // TOKEN da instância!
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[FunnelEngine] ✅ Mensagem enviada com sucesso!`);

            return {
                success: true,
                data: { sent: true, phone: cleanPhone, message }
            };

        } catch (error) {
            console.error(`[FunnelEngine] ❌ Erro ao enviar WhatsApp:`, error.message);
            throw error;
        }
    }

    async sendEmailAction(config, execution) {
        const contact = await this.pool.query('SELECT email, name FROM contacts WHERE id = $1', [execution.contact_id]);
        const email = contact.rows[0]?.email;

        if (!email) {
            throw new Error('Contato não possui email');
        }

        const subject = this.replaceVariables(config.subject, execution);
        const body = this.replaceVariables(config.body, execution);

        console.log(`[FunnelEngine] 📧 Enviando email para ${email}: ${subject}`);

        // TODO: Integrar com serviço de email

        return { success: true, data: { sent: true, to: email } };
    }

    async sendTelegramAction(config, execution) {
        const contact = await this.pool.query('SELECT phone, name FROM contacts WHERE id = $1', [execution.contact_id]);
        const phone = contact.rows[0]?.phone;

        if (!phone) {
            throw new Error('Telefone do contato não encontrado');
        }

        const message = this.replaceVariables(config.message, execution);

        console.log(`[FunnelEngine] 📨 Enviando Telegram para ${phone}: ${message.substring(0, 50)}...`);

        // TODO: Integrar com serviço de Telegram

        return { success: true, data: { sent: true, to: phone } };
    }


    async assignAgentAction(config, execution) {
        const agentId = config.agent_id;

        if (!agentId) {
            throw new Error('Agent ID não especificado');
        }

        try {
            // 1. Buscar telefone do contato
            const contactResult = await this.pool.query(
                'SELECT phone FROM contacts WHERE id = $1',
                [execution.contact_id]
            );

            if (contactResult.rows.length === 0) {
                throw new Error(`Contato ${execution.contact_id} não encontrado`);
            }

            const phone = contactResult.rows[0].phone;
            const jid = `${phone}@s.whatsapp.net`;

            console.log(`[FunnelEngine] 🤖 Atribuindo agente IA ${agentId} para ${jid}`);

            // 2. UPDATE assíncrono (fire-and-forget)
            // Frontend faz polling e pega automaticamente via auto-sync
            this.pool.query(
                `UPDATE whatsapp_chats 
                 SET is_ai_active = true, ai_agent_id = $1
                 WHERE user_id = $2 AND jid = $3`,
                [agentId, execution.user_id, jid]
            ).then(() => {
                console.log(`[FunnelEngine] ✅ Agente IA ${agentId} atribuído com sucesso para ${phone}`);
            }).catch(err => {
                console.error(`[FunnelEngine] ⚠️ Erro ao atribuir agente (não bloqueante):`, err.message);
            });

            // Retorna imediatamente (não espera UPDATE)
            console.log(`[FunnelEngine] 📤 Comando UPDATE enviado (assíncrono)`);
            return { success: true, data: { agent_id: agentId, jid, phone, async: true } };

        } catch (error) {
            console.error(`[FunnelEngine] ❌ Erro ao atribuir agente IA:`, error.message);
            throw error;
        }
    }

    async addTagAction(config, execution) {
        const tagName = config.tag_name;

        if (!tagName) {
            throw new Error('Tag name não especificado');
        }

        // Adicionar tag ao array
        await this.pool.query(
            `UPDATE contacts 
            SET tags = array_append(tags, $1)
            WHERE id = $2 AND NOT ($1 = ANY(tags))`,
            [tagName, execution.contact_id]
        );

        console.log(`[FunnelEngine] 🏷️ Tag adicionada: ${tagName}`);

        return { success: true, data: { tag: tagName } };
    }

    async removeTagAction(config, execution) {
        const tagName = config.tag_name;

        await this.pool.query(
            `UPDATE contacts 
            SET tags = array_remove(tags, $1)
            WHERE id = $2`,
            [tagName, execution.contact_id]
        );

        console.log(`[FunnelEngine] 🏷️ Tag removida: ${tagName}`);

        return { success: true, data: { tag: tagName } };
    }

    async updateLeadAction(config, execution) {
        console.log('[FunnelEngine] 🔍 DEBUG updateLeadAction - config recebido:', JSON.stringify(config, null, 2));
        const updates = {};

        // Campos básicos
        if (config.name) updates.name = config.name;
        if (config.email) updates.email = config.email;
        if (config.phone) updates.phone = config.phone;

        // Temperatura
        if (config.temperature) updates.temperature = config.temperature;

        // Fonte
        if (config.source) updates.source = config.source;

        // Tags (adicionar/substituir)
        if (config.tags_action === 'add' && config.tags) {
            // Buscar tags atuais e adicionar novas
            const result = await this.pool.query('SELECT tags FROM contacts WHERE id = $1', [execution.contact_id]);
            const currentTags = result.rows[0]?.tags || [];
            const newTags = Array.isArray(config.tags) ? config.tags : [config.tags];
            updates.tags = [...new Set([...currentTags, ...newTags])]; // Remove duplicatas
        } else if (config.tags_action === 'replace' && config.tags) {
            // Substituir todas as tags
            updates.tags = Array.isArray(config.tags) ? config.tags : [config.tags];
        } else if (config.tags_action === 'remove' && config.tags) {
            // Remover tags específicas
            const result = await this.pool.query('SELECT tags FROM contacts WHERE id = $1', [execution.contact_id]);
            const currentTags = result.rows[0]?.tags || [];
            const tagsToRemove = Array.isArray(config.tags) ? config.tags : [config.tags];
            updates.tags = currentTags.filter(t => !tagsToRemove.includes(t));
        }

        // Custom fields (merge com existentes)
        if (config.custom_fields) {
            const result = await this.pool.query('SELECT custom_fields FROM contacts WHERE id = $1', [execution.contact_id]);
            const currentFields = result.rows[0]?.custom_fields || {};
            updates.custom_fields = { ...currentFields, ...config.custom_fields };
        }

        // Construir query dinâmica
        const setClause = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');

        if (setClause) {
            await this.pool.query(
                `UPDATE contacts SET ${setClause}, updated_at = NOW() WHERE id = $1`,
                [execution.contact_id, ...Object.values(updates)]
            );

            console.log(`[FunnelEngine] 👤 Lead atualizado:`, Object.keys(updates).join(', '));
        } else {
            console.log(`[FunnelEngine] ⚠️ Nenhum campo para atualizar`);
        }

        return { success: true, data: updates };
    }

    async updateTemperatureAction(config, execution) {
        const temperature = config.temperature_value || 'warm';

        await this.pool.query(
            'UPDATE contacts SET temperature = $1, updated_at = NOW() WHERE id = $2',
            [temperature, execution.contact_id]
        );

        console.log(`[FunnelEngine] 🌡️ Temperatura atualizada: ${temperature}`);

        return { success: true, data: { temperature } };
    }



    /**
     * HELPERS
     */

    isAction(type) {
        const actionTypes = [
            'send_whatsapp', 'send_email', 'send_telegram',
            'assign_agent', 'add_tag', 'remove_tag', 'update_lead',
            'update_temperature'
        ];
        return actionTypes.includes(type);
    }

    async createActionLog(executionId, node) {
        const result = await this.pool.query(
            `INSERT INTO funnel_action_logs 
            (execution_id, node_id, node_type, action_type, status, input_data) 
            VALUES ($1, $2, $3, $4, 'pending', $5) 
            RETURNING id`,
            [executionId, node.id, node.type, node.type, JSON.stringify(node.config)]
        );

        return result.rows[0].id;
    }

    async updateActionLog(logId, status, outputData, errorMessage, durationMs) {
        await this.pool.query(
            `UPDATE funnel_action_logs 
            SET status = $1, output_data = $2, error_message = $3, duration_ms = $4
            WHERE id = $5`,
            [status, JSON.stringify(outputData), errorMessage, durationMs, logId]
        );
    }

    replaceVariables(text, execution) {
        if (!text) return '';

        // TODO: Buscar dados do contato e substituir variáveis
        // {{contact.name}}, {{contact.email}}, etc

        return text;
    }

    evaluateComparison(value, operator, target) {
        switch (operator) {
            case 'equals': return value === target;
            case 'not_equals': return value !== target;
            case 'greater_than': return value > target;
            case 'less_than': return value < target;
            case 'greater_or_equal': return value >= target;
            case 'less_or_equal': return value <= target;
            default: return false;
        }
    }
}

module.exports = FunnelEngine;

