import * as dagre from '@dagrejs/dagre'
import { Node, Edge } from 'reactflow'

const W = 240
const H_COLLAPSED = 56
const H_EXPANDED = 220

export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  expandedIds: Set<string>
): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 64, marginx: 48, marginy: 48 })

  nodes.forEach(n => {
    const h = expandedIds.has(n.id) ? H_EXPANDED : H_COLLAPSED
    g.setNode(n.id, { width: W, height: h })
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
    const h = expandedIds.has(n.id) ? H_EXPANDED : H_COLLAPSED
    return { ...n, position: { x: pos.x - W / 2, y: pos.y - h / 2 } }
  })
}