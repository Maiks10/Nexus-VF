// Custom Edge com animação quando funil está ativo
import React from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { motion } from 'framer-motion';

function AnimatedEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data
}) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isActive = data?.isActive || false;

    return (
        <>
            {/* Caminho base */}
            <path
                id={id}
                style={style}
                className={`react-flow__edge-path ${isActive ? 'stroke-green-400' : 'stroke-slate-600'}`}
                d={edgePath}
                markerEnd={markerEnd}
                strokeWidth={2}
            />

            {/* Animação de fluxo quando ativo */}
            {isActive && (
                <>
                    {/* Partículas fluindo */}
                    <motion.circle
                        r="4"
                        fill="#22c55e"
                        filter="url(#glow)"
                        initial={{ offsetDistance: '0%', opacity: 0 }}
                        animate={{
                            offsetDistance: ['0%', '100%'],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                        style={{
                            offsetPath: `path('${edgePath}')`,
                        }}
                    />

                    {/* Segunda partícula com delay */}
                    <motion.circle
                        r="3"
                        fill="#10b981"
                        filter="url(#glow)"
                        initial={{ offsetDistance: '0%', opacity: 0 }}
                        animate={{
                            offsetDistance: ['0%', '100%'],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: 0.5
                        }}
                        style={{
                            offsetPath: `path('${edgePath}')`,
                        }}
                    />

                    {/* Linha pulsante */}
                    <motion.path
                        d={edgePath}
                        stroke="#22c55e"
                        strokeWidth="3"
                        fill="none"
                        initial={{ opacity: 0.3 }}
                        animate={{
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </>
            )}

            {/* Label opcional */}
            {data?.label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className={`
              px-2 py-1 rounded text-xs font-medium
              ${isActive
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-700 text-slate-300'
                            }
            `}
                    >
                        {data.label}
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* Definição do filtro de glow */}
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </>
    );
}

export default AnimatedEdge;
