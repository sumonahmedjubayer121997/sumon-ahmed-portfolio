export interface SkillGroup {
  id: string;
  label: string;
  note: string;
  /** Group centre as a fraction of the ecosystem stage. */
  center: { x: number; y: number };
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'data',
    label: 'Data',
    note: 'Getting data into a shape that can be trusted.',
    center: { x: 0.2, y: 0.34 },
    items: ['Python', 'Pandas', 'NumPy', 'SQL', 'Statistics', 'EDA'],
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    note: 'Models that generalise, measured honestly.',
    center: { x: 0.44, y: 0.68 },
    items: ['Scikit-learn', 'XGBoost', 'Feature Engineering', 'Model Evaluation'],
  },
  {
    id: 'ai',
    label: 'AI',
    note: 'LLM systems that retrieve, reason and act.',
    center: { x: 0.68, y: 0.32 },
    items: ['LLMs', 'RAG', 'AI Agents', 'LangChain', 'LangGraph', 'MCP', 'Prompt Engineering'],
  },
  {
    id: 'software',
    label: 'Software',
    note: 'Shipping it as a product people can use.',
    center: { x: 0.86, y: 0.72 },
    items: ['React', 'TypeScript', 'JavaScript', 'Firebase', 'Git', 'APIs'],
  },
];
