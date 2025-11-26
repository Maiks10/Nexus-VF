// src/components/FunnelBuilder/components/FunnelEditor.jsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import ReactFlow, { Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, MarkerType, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, Zap, ZapOff } from 'lucide-react';
// ALTERADO: Importando apiClient
import apiClient from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { availableElements, elementConfig } from '@/components/FunnelBuilder/elements';
import ElementSidebar from '@/components/FunnelBuilder/components/ElementSidebar';
import NodeConfigurationPanel from '@/components/FunnelBuilder/components/NodeConfigurationPanel';
import CustomNode from '@/components/FunnelBuilder/components/CustomNode';
import CustomEdge from '@/components/FunnelBuilder/components/CustomEdge';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Componente Interno para o Editor
const FunnelEditorComponent = ({ funnel, onBack, onSave }) => {
  const [funnelName, setFunnelName] = useState(funnel.name);
  const [isActive, setIsActive] = useState(funnel.is_active);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const { toast } = useToast();

  const removeNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const onSelectNode = useCallback((id) => {
    setSelectedNodeId(id);
  }, []);

  const initialNodes = useMemo(() =>
    (funnel.config?.nodes || []).map(node => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: { ...node, onSelect: onSelectNode, onRemove: removeNode },
    })),
  [funnel.id, onSelectNode, removeNode]);

  const initialEdges = useMemo(() =>
    (funnel.config?.connections || []).map(edge => ({
      id: `e-${edge.start}-${edge.end}`,
      type: 'custom',
      source: edge.start.split('_')[0],
      target: edge.end.split('_')[0],
      sourceHandle: edge.start,
      targetHandle: edge.end,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
      style: { stroke: '#a78bfa', strokeWidth: 2 },
    })),
  [funnel.id]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ALTERADO: fetchAgents agora usa apiClient
  useEffect(() => {
    const fetchAgents = async () => {
        try {
            const response = await apiClient.get('/api/ai-agents');
            setAgents(response.data.map(agent => ({ id: agent.id, name: agent.name }))); // Mapeia para o formato necessário
        } catch(error) {
            console.error("Erro ao buscar agentes para o funil:", error);
            toast({ title: 'Não foi possível carregar os agentes de IA.', variant: 'destructive' });
        }
    };
    fetchAgents();
  }, [toast]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'custom', markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' }, style: { stroke: '#a78bfa', strokeWidth: 2 }}, eds)), [setEdges]);

  const addNode = (elementType) => {
    const allElements = [...availableElements.triggers, ...availableElements.actions, ...availableElements.logic];
    const element = allElements.find(e => e.type === elementType);
    const position = reactFlowInstance.project({ x: window.innerWidth / 3, y: window.innerHeight / 3 });
    const newNodeId = uuidv4();
    const newNodeData = {
      id: newNodeId, type: element.type, title: element.label, config: {},
      onSelect: onSelectNode,
      onRemove: removeNode,
    };
    setNodes((nds) => nds.concat({ id: newNodeId, type: 'custom', position, data: newNodeData }));
  };

  const handleNodeConfigUpdate = (nodeId, newConfig) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config: newConfig } } : node
      )
    );
  };

  const prepareFunnelForSave = (newIsActiveStatus) => ({
    ...funnel,
    name: funnelName,
    is_active: newIsActiveStatus,
    config: {
      nodes: nodes.map(n => ({
        id: n.data.id, type: n.data.type, title: n.data.title, config: n.data.config, x: n.position.x, y: n.position.y,
      })),
      connections: edges.map(e => ({ start: e.sourceHandle, end: e.targetHandle })),
    }
  });

  const handleSaveAndClose = () => onSave(prepareFunnelForSave(isActive), { closeOnSave: true });

  const handleToggleActive = () => {
    const newStatus = !isActive;
    onSave(prepareFunnelForSave(newStatus), { closeOnSave: false });
    setIsActive(newStatus);
    toast({ title: `Funil ${newStatus ? 'ativado' : 'desativado'} com sucesso!` });
  };

  const selectedNodeData = useMemo(() => nodes.find(n => n.id === selectedNodeId)?.data, [nodes, selectedNodeId]);

  return (
    <div className="flex h-full relative">
      <div className="flex-1 flex flex-col">
        {/* O JSX (parte visual) não sofreu alterações */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 z-20 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Button>
            <input type="text" value={funnelName} onChange={(e) => setFunnelName(e.target.value)} className="text-xl font-bold text-white bg-transparent outline-none focus:ring-1 focus:ring-purple-500 rounded-md px-2" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleToggleActive} variant="outline" className={`${isActive ? 'border-green-400 text-green-400 hover:bg-green-500/10 hover:text-green-400' : 'border-gray-400 text-gray-400 hover:bg-gray-500/10 hover:text-gray-400'}`}>
              {isActive ? <ZapOff className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {isActive ? 'Desativar' : 'Ativar'}
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
                edgeTypes={edgeTypes}
                onInit={setReactFlowInstance}
                fitView
                className="bg-transparent"
                onNodeClick={(_, node) => onSelectNode(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
            >
                <Background variant="dots" gap={24} size={1} color="#475569" />
                <Controls className="react-flow-controls" />
                <MiniMap nodeColor={(node) => elementConfig[node.data.type]?.color || '#888'} nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
        </div>
      </div>
      <ElementSidebar onAddNode={addNode} />
      <AnimatePresence>
        {selectedNodeData && (
          <NodeConfigurationPanel key={selectedNodeData.id} node={selectedNodeData} onUpdate={handleNodeConfigUpdate} onClose={() => setSelectedNodeId(null)} agents={agents} />
        )}
      </AnimatePresence>
    </div>
  );
};

const FunnelEditor = (props) => (
  <ReactFlowProvider>
    <FunnelEditorComponent {...props} />
  </ReactFlowProvider>
);

export default FunnelEditor;