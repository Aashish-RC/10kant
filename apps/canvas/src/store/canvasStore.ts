import { create } from 'zustand'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow'
import { FLOW_NODES, CORE_EDGES, FlowNodeDef } from '../data/flowNodes'
import { layoutNodes } from '../utils/layout'
import { useNodeShellStore } from '../nodes/NodeShell.store'

interface CanvasStore {
  nodes: Node[]
  edges: Edge[]
  expandedIds: Set<string>
  configValues: Record<string, Record<string, any>>
  init: () => void
  toggleExpand: (id: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  setConfigValue: (nodeId: string, key: string, value: any) => void
  relayout: () => void
}

function makeNode(def: FlowNodeDef): Node {
  return {
    id: def.id,
    type: 'ra1',
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: true,
    deletable: !def.fixed,
    data: def
  }
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  expandedIds: new Set(),
  configValues: {},

  init: () => {
    const nodes = FLOW_NODES.map(makeNode)
    const edges: Edge[] = CORE_EDGES.map(e => ({
      ...e,
      type: 'smoothstep',
      style: { stroke: '#6c63ff', strokeWidth: 1.5, opacity: 0.7 },
    }))
    const laid = layoutNodes(nodes, edges, new Set())
    set({ nodes: laid, edges })
  },

  toggleExpand: (id: string) => {
    const { expandedIds, nodes, edges } = get()
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)

    if (id === 'node-shell') {
      useNodeShellStore.getState().setExpanded(next.has(id))
    }

    const laid = layoutNodes(nodes, edges, next)
    set({ expandedIds: next, nodes: laid })
  },

  onNodesChange: (changes: NodeChange[]) => {
    const filtered = changes.filter(c => {
      if (c.type === 'remove') {
        const node = get().nodes.find(n => n.id === (c as any).id)
        return node?.data?.fixed !== true
      }
      return true
    })
    set(s => ({ nodes: applyNodeChanges(filtered, s.nodes) }))
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set(s => ({ edges: applyEdgeChanges(changes, s.edges) }))
  },

  setConfigValue: (nodeId: string, key: string, value: any) => {
    set(s => ({
      configValues: {
        ...s.configValues,
        [nodeId]: { ...(s.configValues[nodeId] || {}), [key]: value }
      }
    }))
  },

  relayout: () => {
    const { nodes, edges, expandedIds } = get()
    set({ nodes: layoutNodes(nodes, edges, expandedIds) })
  }
}))