import { useEffect, useRef } from 'react'
import ReactFlow, {
  Background, Controls, BackgroundVariant,
  ReactFlowProvider, useReactFlow
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useCanvasStore } from './store/canvasStore'
import Ra1Node from './nodes/Ra1Node'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'

const nodeTypes = { ra1: Ra1Node }

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { stroke: '#6c63ff', strokeWidth: 1.5, opacity: 0.6 },
}

function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, toggleExpand, init } = useCanvasStore()
  const { fitView } = useReactFlow()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      init()
      setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 150)
    }
  }, [])

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
    }
  }, [nodes.length])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => toggleExpand(node.id)}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView={false}
      panOnDrag
      zoomOnScroll
      minZoom={0.2}
      maxZoom={1.8}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        color="#1e1e2e"
        gap={24}
        size={1.5}
      />
      <Controls position="bottom-left" />
    </ReactFlow>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}