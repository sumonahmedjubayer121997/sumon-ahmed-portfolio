export type PipelineId = 'rag' | 'agent';

export interface LabNode {
  id: string;
  label: string;
  title: string;
  definition: string;
  detail: string;
  pipeline: PipelineId;
  /** Index of the pipeline stage this component corresponds to (-1 = whole pipeline). */
  stage: number;
}

export interface LabLink {
  a: string;
  b: string;
  /** Direction particles travel: toward b, toward a, or both ways. */
  flow: 'ab' | 'ba' | 'both';
}

export const CORE_ID = 'llm';

export const labNodes: LabNode[] = [
  {
    id: 'llm',
    label: 'LLM',
    title: 'Large Language Model',
    definition:
      'The reasoning core. A next-token predictor that, inside a system, plans, summarises and decides what to do next.',
    detail:
      'On its own it only knows its training data. Everything around it exists to give it context and the ability to act.',
    pipeline: 'rag',
    stage: 5,
  },
  {
    id: 'rag',
    label: 'RAG',
    title: 'Retrieval-Augmented Generation',
    definition: 'Fetch the passages that matter from your own data, then place them in the prompt.',
    detail: 'Answers become grounded and citable, and knowledge can be updated without retraining the model.',
    pipeline: 'rag',
    stage: 4,
  },
  {
    id: 'embeddings',
    label: 'Embeddings',
    title: 'Embeddings',
    definition: 'Text mapped into high-dimensional vectors where semantic similarity becomes geometric distance.',
    detail: '"Refund policy" and "how do I get my money back" land close together even though they share no words.',
    pipeline: 'rag',
    stage: 2,
  },
  {
    id: 'vector-db',
    label: 'Vector DB',
    title: 'Vector Database',
    definition: 'An index built for approximate nearest-neighbour search over millions of embeddings.',
    detail: 'HNSW graphs and IVF partitions trade a sliver of recall for millisecond lookups.',
    pipeline: 'rag',
    stage: 3,
  },
  {
    id: 'memory',
    label: 'Memory',
    title: 'Memory',
    definition: 'State that persists across turns and sessions — conversation history, preferences, task progress.',
    detail:
      'Short-term memory lives in the context window; long-term memory is usually retrieval over past interactions.',
    pipeline: 'agent',
    stage: 4,
  },
  {
    id: 'agents',
    label: 'Agents',
    title: 'AI Agents',
    definition: 'A loop: plan → act → observe → repeat. The model chooses each next step until the goal is met.',
    detail: 'The hard part is not the loop but its guardrails: budgets, verification and knowing when to stop.',
    pipeline: 'agent',
    stage: 1,
  },
  {
    id: 'tools',
    label: 'Tools',
    title: 'Tool Use',
    definition: 'Functions the model can call — search, SQL, code execution, APIs — turning predictions into actions.',
    detail: 'The model emits a structured call; the runtime executes it and feeds the result back as an observation.',
    pipeline: 'agent',
    stage: 2,
  },
  {
    id: 'mcp',
    label: 'MCP',
    title: 'Model Context Protocol',
    definition: 'An open standard for connecting models to tools and data sources through one common interface.',
    detail: 'Write a server once and any MCP-capable client can discover and use it — like USB-C for context.',
    pipeline: 'agent',
    stage: 2,
  },
];

export const labLinks: LabLink[] = [
  { a: 'rag', b: 'llm', flow: 'ab' },
  { a: 'embeddings', b: 'llm', flow: 'ab' },
  { a: 'vector-db', b: 'llm', flow: 'ab' },
  { a: 'memory', b: 'llm', flow: 'both' },
  { a: 'agents', b: 'llm', flow: 'both' },
  { a: 'tools', b: 'llm', flow: 'ba' },
  { a: 'mcp', b: 'llm', flow: 'ba' },
  { a: 'embeddings', b: 'vector-db', flow: 'ab' },
  { a: 'vector-db', b: 'rag', flow: 'ab' },
  { a: 'rag', b: 'embeddings', flow: 'ba' },
  { a: 'memory', b: 'vector-db', flow: 'both' },
  { a: 'agents', b: 'memory', flow: 'both' },
  { a: 'agents', b: 'tools', flow: 'ab' },
  { a: 'tools', b: 'mcp', flow: 'both' },
];

/* ───────────────────────── Pipelines ───────────────────────── */

export interface StageVisual {
  /** Particle glyph inside this stage. */
  shape: 'doc' | 'chunk' | 'dot';
  /** Glyph scale. */
  size: number;
  /** Vertical spread as a fraction of lane height (0 = single line). */
  spread: number;
  /** Speed multiplier. */
  speed: number;
  /** Snap vertical positions to N discrete rows (vector look). */
  rows?: number;
  /** Each particle splits into N on entering this stage. */
  split?: number;
  /** Fraction of particles selected (accent) here; the rest fade out. */
  select?: number;
  /** Selected particles converge to the centre line. */
  converge?: boolean;
  /** Probability of looping back to an earlier stage at the end of this one. */
  loop?: { to: number; chance: number };
  /** Draw a container in this zone (datastore). */
  store?: boolean;
  /** Settle toward the bottom of the lane (writes to memory). */
  sink?: boolean;
}

export interface PipelineStage {
  id: string;
  label: string;
  caption: string;
  visual: StageVisual;
}

export interface Pipeline {
  id: PipelineId;
  label: string;
  summary: string;
  stages: PipelineStage[];
  spawnRate: number;
  spawnShape: StageVisual['shape'];
}

export const pipelines: Record<PipelineId, Pipeline> = {
  rag: {
    id: 'rag',
    label: 'RAG pipeline',
    summary: 'Documents become chunks, chunks become vectors, vectors become context.',
    spawnRate: 3.2,
    spawnShape: 'doc',
    stages: [
      {
        id: 'documents',
        label: 'Documents',
        caption: 'PDF · HTML · Notion',
        visual: { shape: 'doc', size: 1, spread: 0.6, speed: 1 },
      },
      {
        id: 'chunking',
        label: 'Chunking',
        caption: '512 tok · overlap 64',
        visual: { shape: 'chunk', size: 1, spread: 0.78, speed: 1.05, split: 3 },
      },
      {
        id: 'embeddings',
        label: 'Embeddings',
        caption: 'text → ℝ¹⁵³⁶',
        visual: { shape: 'dot', size: 1, spread: 0.78, speed: 1, rows: 9 },
      },
      {
        id: 'vector-db',
        label: 'Vector DB',
        caption: 'ANN index',
        visual: { shape: 'dot', size: 1, spread: 0.78, speed: 0.45, rows: 9, store: true },
      },
      {
        id: 'retrieval',
        label: 'Retrieval',
        caption: 'top-k = 5',
        visual: { shape: 'dot', size: 1.15, spread: 0.6, speed: 0.9, select: 0.16 },
      },
      {
        id: 'llm',
        label: 'LLM',
        caption: 'grounded answer',
        visual: { shape: 'dot', size: 1.3, spread: 0.0, speed: 1.25, converge: true },
      },
    ],
  },
  agent: {
    id: 'agent',
    label: 'Agent loop',
    summary: 'Plan, act, observe — and loop until the goal is met.',
    spawnRate: 2.8,
    spawnShape: 'dot',
    stages: [
      {
        id: 'goal',
        label: 'Goal',
        caption: 'user intent',
        visual: { shape: 'dot', size: 1.5, spread: 0.06, speed: 1 },
      },
      {
        id: 'plan',
        label: 'Plan',
        caption: 'decompose',
        visual: { shape: 'dot', size: 1.1, spread: 0.6, speed: 0.9, rows: 3 },
      },
      {
        id: 'act',
        label: 'Tool call',
        caption: 'search · SQL · MCP',
        visual: { shape: 'chunk', size: 1, spread: 0.6, speed: 1.1, rows: 3 },
      },
      {
        id: 'observe',
        label: 'Observe',
        caption: 'read results',
        visual: { shape: 'dot', size: 1, spread: 0.45, speed: 0.9, loop: { to: 1, chance: 0.55 } },
      },
      {
        id: 'memory',
        label: 'Memory',
        caption: 'persist state',
        visual: { shape: 'dot', size: 1, spread: 0.3, speed: 0.6, sink: true, store: true },
      },
      {
        id: 'answer',
        label: 'Answer',
        caption: 'goal met',
        visual: { shape: 'dot', size: 1.3, spread: 0, speed: 1.2, converge: true, select: 1 },
      },
    ],
  },
};
