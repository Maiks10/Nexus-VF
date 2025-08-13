
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';
import { elementConfig } from '@/components/FunnelBuilder/elements';

const CustomNode = ({ data, selected }) => {
  const { id, type, title, config, onSelect, onRemove } = data;
  const nodeConfig = elementConfig[type] || { icon: () => null, color: 'from-gray-500 to-gray-600', logo: null };
  const Icon = nodeConfig.icon;

  const selectedEvent = type.startsWith('trigger_') && config.triggerEvent 
    ? (nodeConfig.options || []).find(o => o.value === config.triggerEvent)?.label 
    : null;

  return (
    <Card className={`glass-effect border-2 rounded-xl w-64 relative transition-colors ${selected ? 'border-purple-500' : 'border-white/10'}`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 bg-gradient-to-r ${nodeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {nodeConfig.logo ? (
            <img src={nodeConfig.logo} alt={`${title} logo`} className="w-6 h-6 object-contain" />
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="w-40">
          <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
          <p className="text-gray-400 text-xs truncate">{selectedEvent || type}</p>
        </div>
      </div>
      <Button size="icon" variant="ghost" className="absolute top-1 right-1 w-6 h-6" onClick={(e) => { e.stopPropagation(); onSelect(id); }}><Settings className="w-4 h-4 text-gray-400 hover:text-white" /></Button>
      <Button size="icon" variant="ghost" className="absolute bottom-1 right-1 w-6 h-6" onClick={(e) => { e.stopPropagation(); onRemove(id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
      
      {!type.startsWith('trigger_') && (
        <Handle
          type="target"
          position={Position.Left}
          id={`${id}_input`}
          style={{ background: '#556688', width: 12, height: 12 }}
        />
      )}
      
      {type === 'condition' ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id={`${id}_output_yes`}
            style={{ top: '33%', background: '#22c55e', width: 12, height: 12 }}
          />
           <Handle
            type="source"
            position={Position.Right}
            id={`${id}_output_no`}
            style={{ top: '66%', background: '#ef4444', width: 12, height: 12 }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          id={`${id}_output`}
          style={{ background: '#556688', width: 12, height: 12 }}
        />
      )}
    </Card>
  );
};

export default React.memo(CustomNode);
