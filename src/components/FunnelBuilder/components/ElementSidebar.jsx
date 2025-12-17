import React from 'react';
import { Button } from '@/components/ui/button';
import { MousePointer, ChevronLeft, ChevronRight } from 'lucide-react';
import { availableElements, elementConfig } from '@/components/FunnelBuilder/elements';

function ElementSidebar({ onAddNode, isCollapsed, onToggleCollapsed }) {
  const handleDragStart = (event, elementType) => {
    event.dataTransfer.setData('application/reactflow', elementType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="relative h-screen bg-slate-900 border-l border-white/10 transition-all duration-300 ease-in-out overflow-hidden"
      style={{ width: isCollapsed ? '48px' : '320px' }}
    >
      {/* Botão Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapsed}
        className="absolute top-4 right-2 z-30 bg-slate-800 hover:bg-slate-700 border border-white/10"
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white" />}
      </Button>

      {/* Conteúdo da Sidebar - só visível quando não está colapsado */}
      <div
        className="max-h-screen p-4 pb-8 space-y-6 overflow-y-auto transition-opacity duration-300 custom-scrollbar"
        style={{
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? 'none' : 'auto'
        }}
      >
        <h3 className="text-white text-lg font-bold mt-12">Elementos</h3>
        {Object.entries(availableElements).map(([category, elements]) => (
          <div key={category}>
            <h4 className="text-purple-400 text-md font-semibold mb-2 capitalize">
              {category === 'triggers' ? 'Gatilhos' : (category === 'actions' ? 'Ações' : 'Lógica')}
            </h4>
            <div className="space-y-3">
              {elements.map((element) => {
                const config = elementConfig[element.type] || {};
                const Icon = config.icon || MousePointer;
                return (
                  <Button
                    key={element.type}
                    variant="ghost"
                    className="w-full justify-start gap-3 text-white h-auto py-2 cursor-grab active:cursor-grabbing hover:bg-white/10"
                    onClick={() => onAddNode(element.type)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, element.type)}
                  >
                    <div className={`w-8 h-8 bg-gradient-to-r ${config.color || 'from-gray-500 to-gray-600'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
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
          <p className="text-gray-400 text-sm">Arraste os elementos para o quadro ou clique para adicionar.</p>
        </div>
      </div>
    </div>
  );
}

export default ElementSidebar;