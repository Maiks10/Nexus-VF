import React from 'react';
import { motion } from 'framer-motion';
import { FileText, MoreVertical } from 'lucide-react';

export default function KnowledgeNode({ data, onDelete }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4 hover:border-green-500/30 transition-colors group cursor-pointer"
        >
            <div className="p-2.5 bg-green-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-green-400" />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">{data.name}</h4>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {data.summary || "Documento importado contendo informações relevantes."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">PDF</span>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">2.4 MB</span>
                </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
