import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactFlow, { Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, Zap, ZapOff } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { availableElements } from '@/components/FunnelBuilder/elements';
import ElementSidebar from '@/components/FunnelBuilder/components/ElementSidebar';
import NodeConfigurationPanel from '@/components/FunnelBuilder/components/NodeConfigurationPanel';
import CustomNode from '@/components/FunnelBuilder/components/CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

function FunnelEditor({ funnel, onBack, onSave }) {
  const [localFunnel, setLocalFunnel] = useState(funnel);
  const [nodes, setNodes, onNodesChange] = useNodesState(funnel.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(funnel.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const { toast } = useToast();

  // Busca agentes de IA ao montar o componente
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase.from('ai_agents').select('id, name');
      if (data) setAgents(data);
    };
    fetchAgents();
  }, []);

  // Popula o editor com os nós e conexões do funil selecionado
  useEffect(() => {
    const initialNodes = (localFunnel.nodes || []).map(node => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        ...node, // Passa todos os dados do nó
        onSelect: setSelectedNodeId,
        onRemove: removeNode,
      },
    }));
    const initialEdges = (localFunnel.connections || []).map(edge => ({
      id: `e-${edge.start}-${edge.end}`,
      source: edge.start.split('_')[0],
      target: edge.end.split('_')[0],
      sourceHandle: edge.start,
      targetHandle: edge.end,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
      style: { stroke: '#a78bfa', strokeWidth: 2 },
    }));
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [localFunnel.id]); // Roda apenas quando o ID do funil muda

  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      id: `e-${params.sourceHandle}-${params.targetHandle}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
      style: { stroke: '#a78bfa', strokeWidth: 2 },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Função para adicionar um novo nó ao canvas
  const addNode = (elementType) => {
    const allElements = [...availableElements.triggers, ...availableElements.actions, ...availableElements.logic];
    const element = allElements.find(e => e.type === elementType);
    const position = reactFlowInstance.project({
      x: window.innerWidth / 3, // Posição mais centralizada
      y: window.innerHeight / 3,
    });
    const newNode = {
      id: uuidv4(),
      type: 'custom',
      position,
      data: {
        id: uuidv4(),
        type: element.type,
        title: element.label,
        config: {},
        onSelect: setSelectedNodeId,
        onRemove: removeNode,
      },
    };
    newNode.data.id = newNode.id;
    setNodes((nds) => nds.concat(newNode));
  };
  
  const removeNode = (nodeId) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };
  
  const handleNodeConfigUpdate = (nodeId, newConfig) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // Atualiza a configuração dentro de 'data'
          return { ...node, data: { ...node.data, config: newConfig } };
        }
        return node;
      })
    );
  };

  // ----- FUNÇÕES DE AÇÃO CORRIGIDAS -----

  // Prepara os dados e chama a função onSave para salvar e fechar
  const handleSaveAndClose = () => {
    const funnelToSave = {
      ...localFunnel,
      nodes: nodes.map(n => ({ ...n.data, x: n.position.x, y: n.position.y })),
      connections: edges.map(e => ({ start: e.sourceHandle, end: e.targetHandle })),
    };
    onSave(funnelToSave, { closeOnSave: true }); // Passa a opção para fechar
  };

  // Prepara os dados, alterna o status e chama a função onSave sem fechar
  const handleToggleActive = () => {
    const newStatus = !localFunnel.is_active;
    const funnelToSave = {
      ...localFunnel,
      is_active: newStatus, // Inverte o status atual
      nodes: nodes.map(n => ({ ...n.data, x: n.position.x, y: n.position.y })),
      connections: edges.map(e => ({ start: e.sourceHandle, end: e.targetHandle })),
    };
    onSave(funnelToSave, { closeOnSave: false }); // Salva mas não fecha
    setLocalFunnel(funnelToSave); // Atualiza o estado local para o botão refletir a mudança
    toast({ title: `Funil ${newStatus ? 'ativado' : 'desativado'} com sucesso!` });
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="flex h-full relative">
      <ElementSidebar onAddNode={addNode} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10 z-20 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <input 
              type="text" 
              value={localFunnel.name} 
              onChange={(e) => setLocalFunnel(f => ({...f, name: e.target.value}))}
              className="text-xl font-bold text-white bg-transparent outline-none focus:ring-1 focus:ring-purple-500 rounded-md px-2"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleToggleActive} variant="outline" className={`${localFunnel.is_active ? 'border-green-400 text-green-400 hover:bg-green-500/10 hover:text-green-400' : 'border-gray-400 text-gray-400 hover:bg-gray-500/10 hover:text-gray-400'}`}>
              {localFunnel.is_active ? <ZapOff className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {localFunnel.is_active ? 'Desativar' : 'Ativar'}
            </Button>
            <Button onClick={handleSaveAndClose} className="bg-gradient-to-r from-green-500 to-emerald-500">
              <Save className="w-4 h-4 mr-2" />Salvar e Fechar
            </Button>
          </div>
        </div>
        <div className="flex-1 relative bg-slate-800/50 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            fitView
            className="bg-transparent"
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
          >
            <Background variant="dots" gap={24} size={1} color="#475569" />
            <Controls className="react-flow-controls" />
            <MiniMap nodeColor={(node) => elementConfig[node.data.type]?.color || '#888'} nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>
      </div>
      <AnimatePresence>
        {selectedNode && (
          <NodeConfigurationPanel
            key={selectedNode.id}
            node={selectedNode.data}
            onUpdate={handleNodeConfigUpdate}
            onClose={() => setSelectedNodeId(null)}
            agents={agents}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default FunnelEditor;