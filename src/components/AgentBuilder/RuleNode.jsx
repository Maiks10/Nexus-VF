import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';

export default function RuleNode({ rule, onDelete }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3 group hover:bg-white/10 transition-colors"
        >
            <ShieldCheck className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm text-gray-300 flex-1">{rule}</span>
            <button
                onClick={onDelete}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
