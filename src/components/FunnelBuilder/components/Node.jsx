import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';
import { elementConfig } from '@/components/FunnelBuilder/elements';

const Node = ({ node, isSelected, onSelect, onRemove, onStartConnection, onFinishConnection, updateNodePosition }) => {
  const config = elementConfig[node.type] || { icon: () => null, color: 'from-gray-500 to-gray-600', logo: null };
  const Icon = config.icon;

  const handleStopDrag = (e, info) => {
    updateNodePosition({ x: info.point.x, y: info.point.y });
  };
  
  const selectedEvent = node.type.startsWith('trigger_') && node.config.triggerEvent 
    ? (config.options || []).find(o => o.value === node.config.triggerEvent)?.label 
    : null;

  return (
    <motion.div
      id={node.id}
      drag
      dragConstraints={{ left: 0, top: 0, right: 2000, bottom: 2000 }} // Aumentar as constraints
      dragElastic={0.1}
      dragMomentum={false}
      onDragEnd={handleStopDrag}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        zIndex: isSelected ? 11 : 10,
      }}
      className="cursor-grab active:cursor-grabbing"
      onClick={onSelect}
      onDragStart={(e) => e.stopPropagation()}
    >
      <Card className={`glass-effect border-2 rounded-xl w-64 relative transition-colors ${isSelected ? 'border-purple-500' : 'border-white/10'}`}>
        <div className="flex items-center gap-3 p-4">
          <div className={`w-10 h-10 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            {config.logo ? (
              <img src={config.logo} alt={`${node.title} logo`} className="w-6 h-6 object-contain" />
            ) : (
              <Icon className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="w-40">
            <h3 className="text-white font-semibold text-sm truncate">{node.title}</h3>
            <p className="text-gray-400 text-xs truncate">{selectedEvent || node.type}</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="absolute top-1 right-1 w-6 h-6" onClick={(e) => { e.stopPropagation(); onSelect(); }}><Settings className="w-4 h-4 text-gray-400 hover:text-white" /></Button>
        <Button size="icon" variant="ghost" className="absolute bottom-1 right-1 w-6 h-6" onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>

        <div
          id={`${node.id}_input`}
          className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-500 rounded-full border-2 border-slate-800 hover:bg-green-400"
          onMouseUp={(e) => { e.stopPropagation(); onFinishConnection(`${node.id}_input`); }}
        />

        {node.type === 'condition' ? (
          <>
            <div
              id={`${node.id}_output_yes`}
              className="absolute right-[-8px] top-1/3 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 cursor-crosshair hover:bg-green-400 flex items-center justify-center text-white text-[8px] font-bold"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnection(`${node.id}_output_yes`); }}
            >S</div>
            <div
              id={`${node.id}_output_no`}
              className="absolute right-[-8px] top-2/3 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-800 cursor-crosshair hover:bg-red-400 flex items-center justify-center text-white text-[8px] font-bold"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnection(`${node.id}_output_no`); }}
            >N</div>
          </>
        ) : (
          <div
            id={`${node.id}_output`}
            className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-500 rounded-full border-2 border-slate-800 cursor-crosshair hover:bg-blue-400"
            onMouseDown={(e) => { e.stopPropagation(); onStartConnection(`${node.id}_output`); }}
          />
        )}
      </Card>
    </motion.div>
  );
};

export default Node;