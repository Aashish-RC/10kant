export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'select' | 'number' | 'toggle' | 'textarea'
  options?: string[]
  default?: string | boolean
  placeholder?: string
}

export interface FlowNodeDef {
  id: string
  label: string
  description: string
  category: string
  color: string
  fixed: boolean
  configFields: ConfigField[]
}

export const FLOW_NODES: FlowNodeDef[] = [
  {
    id: 'chat-input',
    label: 'Chat Input',
    description: 'User message entry point',
    category: 'IO',
    color: '#7bed9f',
    fixed: false,
    configFields: []
  },
  {
    id: 'persona',
    label: 'Persona',
    description: 'Shapes tone, domain and behaviour',
    category: 'System',
    color: '#c77dff',
    fixed: true,
    configFields: [
      { key: 'archetype', label: 'Archetype', type: 'select', options: ['Analyst','Builder','Guardian','Creator','Operator','Scientist','Strategist','Caregiver'], default: 'Analyst' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Professional','Direct','Collaborative','Technical','Empathetic'], default: 'Professional' }
    ]
  },
  {
    id: 'memory',
    label: 'Memory',
    description: '4-tier knowledge palace',
    category: 'Memory',
    color: '#00b4d8',
    fixed: true,
    configFields: [
      { key: 'retrieval_depth', label: 'Retrieval Depth', type: 'select', options: ['T1 only','T1+T2','T1+T2+T3','Full T1-T4'], default: 'T1+T2+T3' }
    ]
  },
  {
    id: 'orchestrator',
    label: 'Orchestrator',
    description: 'Coordinates the full pipeline',
    category: 'System',
    color: '#ff6b6b',
    fixed: true,
    configFields: [
      { key: 'complexity_mode', label: 'Complexity Mode', type: 'select', options: ['Auto','Force T0','Force T1','Force T2','Force T3'], default: 'Auto' }
    ]
  },
  {
    id: 'context-assembler',
    label: 'Context Assembler',
    description: 'Builds context window for model',
    category: 'System',
    color: '#ff6b6b',
    fixed: true,
    configFields: [
      { key: 'token_budget', label: 'Token Budget', type: 'select', options: ['4K','8K','16K','32K','128K'], default: '16K' }
    ]
  },
  {
    id: 'model-hub',
    label: 'Model Hub',
    description: 'Routes to active model provider',
    category: 'Models',
    color: '#6c63ff',
    fixed: true,
    configFields: [
      { key: 'fallback_strategy', label: 'Fallback Strategy', type: 'select', options: ['None','Next in chain','Cheapest available'], default: 'Next in chain' }
    ]
  },
  {
    id: 'node-shell',
    label: 'Node Shell',
    description: 'Central hub for managing AI model providers, API keys, and model selections',
    category: 'Models',
    color: '#6c63ff',
    fixed: true,
    configFields: []
  },
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Google Gemini models',
    category: 'Models',
    color: '#6c63ff',
    fixed: false,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIzaSy...' },
      { key: 'model', label: 'Model', type: 'select', options: ['gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-pro'], default: 'gemini-2.0-flash' },
      { key: 'temperature', label: 'Temperature', type: 'number', default: '0.7' },
      { key: 'streaming', label: 'Streaming', type: 'toggle', default: true }
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4 models',
    category: 'Models',
    color: '#6c63ff',
    fixed: false,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      { key: 'model', label: 'Model', type: 'select', options: ['gpt-4o','gpt-4o-mini','gpt-4-turbo'], default: 'gpt-4o' },
      { key: 'temperature', label: 'Temperature', type: 'number', default: '0.7' },
      { key: 'streaming', label: 'Streaming', type: 'toggle', default: true }
    ]
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models',
    category: 'Models',
    color: '#6c63ff',
    fixed: false,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
      { key: 'model', label: 'Model', type: 'select', options: ['claude-3-5-sonnet-20241022','claude-3-haiku-20240307'], default: 'claude-3-5-sonnet-20241022' },
      { key: 'temperature', label: 'Temperature', type: 'number', default: '0.7' },
      { key: 'streaming', label: 'Streaming', type: 'toggle', default: true }
    ]
  },
  {
    id: 'ollama',
    label: 'Ollama',
    description: 'Local models',
    category: 'Models',
    color: '#6c63ff',
    fixed: false,
    configFields: [
      { key: 'endpoint', label: 'Endpoint', type: 'text', default: 'http://localhost:11434' },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'llama3, mistral...' }
    ]
  },
  {
    id: 'credential-vault',
    label: 'Vault',
    description: 'Resolves credentials at call time',
    category: 'Security',
    color: '#f8961e',
    fixed: true,
    configFields: []
  },
  {
    id: 'output-engine',
    label: 'Output Engine',
    description: 'Formats and streams response',
    category: 'System',
    color: '#ff6b6b',
    fixed: true,
    configFields: [
      { key: 'format', label: 'Default Format', type: 'select', options: ['Auto','Prose','Markdown','Code','Mixed'], default: 'Auto' },
      { key: 'streaming', label: 'Streaming', type: 'toggle', default: true }
    ]
  },
  {
    id: 'quality-gate',
    label: 'Quality Gate',
    description: 'Evaluates output before delivery',
    category: 'System',
    color: '#ff6b6b',
    fixed: true,
    configFields: [
      { key: 'max_retries', label: 'Max Retries', type: 'select', options: ['0','1','2','3'], default: '2' }
    ]
  },
  {
    id: 'safety',
    label: 'Safety + Guardrails',
    description: 'Boundary enforcement — always runs',
    category: 'System',
    color: '#ff6b6b',
    fixed: true,
    configFields: []
  },
  {
    id: 'chat-output',
    label: 'Chat Response',
    description: 'Delivers response to user',
    category: 'IO',
    color: '#7bed9f',
    fixed: false,
    configFields: []
  }
]

export const CORE_EDGES = [
  { id: 'e1', source: 'chat-input', target: 'orchestrator', animated: true },
  { id: 'e2', source: 'persona', target: 'orchestrator' },
  { id: 'e3', source: 'memory', target: 'orchestrator' },
  { id: 'e4', source: 'orchestrator', target: 'context-assembler', animated: true },
  { id: 'e5', source: 'context-assembler', target: 'model-hub', animated: true },
  { id: 'e6', source: 'model-hub', target: 'node-shell', animated: true },
  { id: 'e7', source: 'credential-vault', target: 'node-shell' },
  { id: 'e8', source: 'node-shell', target: 'gemini' },
  { id: 'e9', source: 'gemini', target: 'output-engine', animated: true },
  { id: 'e10', source: 'output-engine', target: 'quality-gate', animated: true },
  { id: 'e11', source: 'quality-gate', target: 'safety', animated: true },
  { id: 'e12', source: 'safety', target: 'chat-output', animated: true }
]