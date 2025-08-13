import React from 'react';
import { Button } from '@/components/ui/button';
import { MousePointer } from 'lucide-react';
import { availableElements, elementConfig } from '@/components/FunnelBuilder/elements';

function ElementSidebar({ onAddNode }) {
  return (
    <div className="w-80 border-l border-white/10 p-4 space-y-6 overflow-y-auto z-20 bg-slate-900">
      <h3 className="text-white text-lg font-bold">Elementos</h3>
      {Object.entries(availableElements).map(([category, elements]) => (
        <div key={category}>
          <h4 className="text-purple-400 text-md font-semibold mb-2 capitalize">
            {category === 'triggers' ? 'Gatilhos' : (category === 'actions' ? 'Ações' : 'Lógica')}
          </h4>
          <div className="space-y-3">
            {elements.map((element) => {
              const config = elementConfig[element.type] || {};
              const Icon = config.icon;
              return (
                <Button key={element.type} variant="ghost" className="w-full justify-start gap-3 text-white h-auto py-2" onClick={() => onAddNode(element.type)}>
                  <div className={`w-8 h-8 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    {config.logo ? (
                      <img-replace src={config.logo} alt={`${element.label} logo`} className="w-5 h-5 object-contain" />
                    ) : (
                      <Icon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{element.label}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="p-4 bg-white/5 rounded-lg text-center">
        <MousePointer className="mx-auto w-8 h-8 text-purple-400 mb-2" />
        <p className="text-gray-400 text-sm">Arraste os elementos para o quadro e conecte os pontos para criar seu funil.</p>
      </div>
    </div>
  );
}

export default ElementSidebar;