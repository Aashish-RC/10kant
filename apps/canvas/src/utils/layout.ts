import * as dagre from '@dagrejs/dagre'
import { Node, Edge } from 'reactflow'

const W_COLLAPSED = 200
const W_EXPANDED = 320
const H_COLLAPSED = 56
const H_EXPANDED = 320

export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  expandedIds: Set<string>
): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 64, marginx: 48, marginy: 48 })

  nodes.forEach(n => {
    const isShell = n.type === 'node-shell'
    const w = isShell ? (expandedIds.has(n.id) ? W_EXPANDED : W_COLLAPSED) : 240
    const h = expandedIds.has(n.id) ? (isShell ? H_EXPANDED : 220) : H_COLLAPSED
    g.setNode(n.id, { width: w, height: h })
  })
  edges.forEach(e => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target)
    }
  })

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    if (!pos) return n
    const isShell = n.type === 'node-shell'
    const w = isShell ? (expandedIds.has(n.id) ? W_EXPANDED : W_COLLAPSED) : 240
    const h = expandedIds.has(n.id) ? (isShell ? H_EXPANDED : 220) : H_COLLAPSED
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } }
  })
}