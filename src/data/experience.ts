/** Timeline entries. TODO: replace with your real roles, organisations and dates. */
export interface Milestone {
  year: string;
  title: string;
  context: string;
  body: string;
  tags: string[];
}

export const milestones: Milestone[] = [
  {
    year: '2023',
    title: 'Web Development',
    context: 'Freelance & personal projects',
    body: 'Built responsive web applications with React, JavaScript and Firebase. Learned that most problems are data problems wearing an interface.',
    tags: ['React', 'JavaScript', 'Firebase'],
  },
  {
    year: '2024',
    title: 'Computer Science',
    context: 'MSc · University of Bedfordshire',
    body: 'Formal grounding in algorithms, data structures, databases and machine learning. Moved from building screens to building systems.',
    tags: ['Algorithms', 'Databases', 'ML foundations'],
  },
  {
    year: '2025',
    title: 'Data & Machine Learning',
    context: 'Dissertation & applied projects',
    body: 'NLP research on early mental-health signals; recommender systems; end-to-end pipelines from cleaning and features to evaluation.',
    tags: ['NLP', 'scikit-learn', 'Evaluation'],
  },
  {
    year: '2026',
    title: 'AI · LLMs · RAG · Agents',
    context: 'Current focus',
    body: 'Designing retrieval-augmented systems and tool-using agents: embeddings, vector search, orchestration with LangGraph and MCP integrations.',
    tags: ['RAG', 'LangGraph', 'MCP', 'Agents'],
  },
];
