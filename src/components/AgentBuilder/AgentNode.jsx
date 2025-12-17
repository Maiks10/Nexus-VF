import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Cpu } from 'lucide-react';

export default function AgentNode({ name, provider }) {
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative group"
        >
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-40 group-hover:opacity-75 transition duration-500" />

            {/* Card Content */}
            <div className="relative w-80 bg-[#161b22] border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 flex items-center justify-center shadow-lg transform group-hover:-translate-y-2 transition duration-300">
                    <Bot className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">{name}</h2>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <Cpu className="w-3 h-3 text-purple-400" />
                    <span className="text-xs font-medium text-gray-300">{provider}</span>
                </div>

                <div className="mt-6 flex gap-2 w-full">
                    <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 opacity-60" />
                    <div className="h-1.5 flex-1 rounded-full bg-gray-700" />
                    <div className="h-1.5 flex-1 rounded-full bg-gray-700" />
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Health: 98% • Latency: 45ms</p>
            </div>
        </motion.div>
    );
}
