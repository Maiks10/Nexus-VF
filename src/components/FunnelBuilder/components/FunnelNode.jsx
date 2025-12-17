// Custom Node com contador de leads em tempo real
import React from 'react';
import { Handle, Position } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { elementConfig } from '../elements';
import { Zap, Clock, TrendingUp, Trash2 } from 'lucide-react';

function FunnelNode({ data, selected }) {
    const config = elementConfig[data.type] || {};
    const Icon = config.icon || Zap;
    const isLogic = data.type === 'wait' || data.type === 'condition' || data.type === 'split_test';

    // Contadores de leads
    const activeCount = data.liveStats?.active_count || 0;
    const waitingCount = data.liveStats?.waiting_count || 0;
    const totalActive = data.liveStats?.total_active || 0;

    const hasActiveLeads = totalActive > 0;

    // Definir handles baseado no tipo de nó
    const getHandles = () => {
        if (data.type === 'condition' || data.type === 'split_test') {
            return {
                source: [
                    { id: 'yes', position: Position.Right, style: { top: '30%' }, label: 'Sim' },
                    { id: 'no', position: Position.Right, style: { top: '70%' }, label: 'Não' }
                ],
                target: [{ id: 'in', position: Position.Left }]
            };
        }

        return {
            source: [{ id: 'out', position: Position.Right }],
            target: [{ id: 'in', position: Position.Left }]
        };
    };

    const handles = getHandles();

    return (
        <div className="relative group">
            {/* Badge de contagem de leads */}
            <AnimatePresence>
                {hasActiveLeads && (
                    <motion.div
                        initial={{ scale: 0, y: -10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: -10 }}
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10"
                    >
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 text-xs font-bold">
                            <TrendingUp className="w-3 h-3" />
                            <span>{totalActive}</span>
                            {waitingCount > 0 && (
                                <span className="ml-1 opacity-75 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {waitingCount}
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botão de deletar */}
            <motion.button
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Deseja realmente remover o elemento "${data.title}"?`)) {
                        data.onRemove?.(data.id);
                    }
                }}
                className="absolute -top-2 -right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                    opacity: selected ? 1 : undefined
                }}
            >
                <div className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg border-2 border-white">
                    <Trash2 className="w-3.5 h-3.5" />
                </div>
            </motion.button>

            {/* Pulsação quando tem leads ativos */}
            {hasActiveLeads && (
                <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{
                        boxShadow: [
                            '0 0 0 0px rgba(34, 197, 94, 0.4)',
                            '0 0 0 10px rgba(34, 197, 94, 0)',
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                    }}
                />
            )}

            <motion.div
                whileHover={{ scale: 1.02 }}
                className={`
          min-w-[200px] rounded-lg shadow-lg backdrop-blur-sm border-2 
          ${selected
                        ? 'border-blue-500 shadow-blue-500/50'
                        : hasActiveLeads
                            ? 'border-green-500/50 shadow-green-500/20'
                            : 'border-white/10'
                    }
          bg-gradient-to-br ${config.color || 'from-gray-700 to-gray-800'} bg-opacity-90
          transition-all duration-200
        `}
            >
                {/* Handles de entrada */}
                {handles.target.map(handle => (
                    <Handle
                        key={handle.id}
                        type="target"
                        position={handle.position}
                        id={handle.id}
                        style={handle.style}
                        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
                    />
                ))}

                <div className="p-4 flex items-center gap-3">
                    {/* Ícone */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/10">
                        <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-sm leading-tight truncate">
                            {data.title}
                        </h4>
                        <p className="text-white/60 text-xs mt-0.5 truncate">
                            {data.subtitle || data.type}
                        </p>
                    </div>

                    {/* Indicador de atividade */}
                    {hasActiveLeads && (
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            <Zap className="w-4 h-4 text-green-400" />
                        </motion.div>
                    )}
                </div>

                {/* Configuração preview (se existir) */}
                {data.config && Object.keys(data.config).length > 0 && (
                    <div className="px-4 pb-3 border-t border-white/10">
                        <div className="text-white/50 text-xs mt-2 space-y-1">
                            {data.type === 'wait' && data.config.wait_value && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{data.config.wait_value} {data.config.wait_unit}</span>
                                </div>
                            )}
                            {data.type === 'send_whatsapp' && data.config.message && (
                                <p className="truncate">"{data.config.message.substring(0, 30)}..."</p>
                            )}
                            {data.type === 'add_tag' && data.config.tag_name && (
                                <span className="inline-block bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                                    {data.config.tag_name}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Handles de saída */}
                {handles.source.map(handle => (
                    <Handle
                        key={handle.id}
                        type="source"
                        position={handle.position}
                        id={handle.id}
                        style={handle.style}
                        className={`w-3 h-3 !border-2 !border-white ${handle.id === 'yes' ? '!bg-green-500' :
                            handle.id === 'no' ? '!bg-red-500' :
                                '!bg-purple-500'
                            }`}
                    >
                        {handle.label && (
                            <div className={`
                absolute text-xs font-medium px-2 py-0.5 rounded
                ${handle.id === 'yes'
                                    ? 'bg-green-500 -right-12 top-1/2 -translate-y-1/2'
                                    : 'bg-red-500 -right-11 top-1/2 -translate-y-1/2'
                                }
                text-white whitespace-nowrap
              `}>
                                {handle.label}
                            </div>
                        )}
                    </Handle>
                ))}
            </motion.div>
        </div>
    );
}

export default FunnelNode;
