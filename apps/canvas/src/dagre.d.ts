declare module '@dagrejs/dagre' {
  interface DagreGraph {
    setNode(id: string, node: { width: number; height: number }): this
    setEdge(source: string, target: string, edge?: object): this
    setDefaultEdgeLabel(label: () => object): this
    setGraph(graph: object): this
    hasNode(id: string): boolean
    node(id: string): { x: number; y: number; width: number; height: number } | undefined
  }

  interface DagreModule {
    graphlib: {
      Graph: new () => DagreGraph
    }
    layout: (g: DagreGraph) => void
  }

  const dagre: DagreModule
  export = dagre
}