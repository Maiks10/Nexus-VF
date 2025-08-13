
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import ReactFlow, { Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, Zap, ZapOff } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { availableElements, elementConfig } from '@/components/FunnelBuilder/elements';
import ElementSidebar from '@/components/FunnelBuilder/components/ElementSidebar';
import NodeConfigurationPanel from '@/components/FunnelBuilder/components/NodeConfigurationPanel';
import CustomNode from '@/components/FunnelBuilder/components/CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

function FunnelEditor({ funnel, onBack, onSave, onToggleActive }) {
  const [localFunnel, setLocalFunnel] = useState(funnel);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase.from('ai_agents').select('id, name');
      if (data) setAgents(data);
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    const initialNodes = (localFunnel.config?.nodes || []).map(node => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        id: node.id,
        type: node.type,
        title: node.title,
        config: node.config,
        onSelect: setSelectedNodeId,
        onRemove: removeNode,
      },
    }));
    const initialEdges = (localFunnel.config?.connections || []).map(edge => ({
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
  }, [localFunnel, setNodes, setEdges]);
  
  const onConnect = useCallback((params) => {
    const newEdge = {
        ...params,
        id: `e-${params.sourceHandle}-${params.targetHandle}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
        style: { stroke: '#a78bfa', strokeWidth: 2 },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const addNode = (elementType) => {
    const allElements = [...availableElements.triggers, ...availableElements.actions, ...availableElements.logic];
    const element = allElements.find(e => e.type === elementType);
    const position = reactFlowInstance.project({
      x: window.innerWidth / 2 - 128 - 256,
      y: window.innerHeight / 2 - 50,
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
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleNodeConfigUpdate = (nodeId, newConfig) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          node.data = { ...node.data, config: newConfig };
        }
        return node;
      })
    );
  };
  
  const handleSave = () => {
    const funnelToSave = {
        ...localFunnel,
        config: {
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.data.type,
                title: n.data.title,
                config: n.data.config,
                x: n.position.x,
                y: n.position.y
            })),
            connections: edges.map(e => ({
                start: e.sourceHandle,
                end: e.targetHandle
            }))
        }
    };
    onSave(funnelToSave);
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="flex h-full relative">
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
            <Button onClick={() => onToggleActive(localFunnel)} variant={localFunnel.is_active ? "destructive" : "outline"} className="border-purple-400 text-purple-400 hover:bg-purple-500/10">
              {localFunnel.is_active ? <ZapOff className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {localFunnel.is_active ? 'Desativar' : 'Ativar'}
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-green-500 to-emerald-500">
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
      <ElementSidebar onAddNode={addNode} />
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
