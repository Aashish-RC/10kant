export type NodeClassification = 'fixed' | 'configurable';

export type NodeStatus = 'inactive' | 'configured' | 'live' | 'error';

export interface BaseNode {
  id: string;
  type: string;
  classification: NodeClassification;
  status: NodeStatus;
  label: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseComponent extends BaseNode {
  parentNodeId: string | null;
  configSchema: Record<string, unknown>;
  configValues: Record<string, unknown>;
  isLive: boolean;
}

export type SpineNodeType =
  | 'model-hub'
  | 'memory-hub'
  | 'orchestrator'
  | 'connector-hub'
  | 'credential-vault';

export interface SpineNode extends BaseNode {
  classification: 'fixed';
  nodeType: SpineNodeType;
  position: { x: number; y: number };
}