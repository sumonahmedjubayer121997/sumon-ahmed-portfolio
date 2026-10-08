/**
 * Projects. Metrics marked PLACEHOLDER are illustrative — replace them with your
 * real results before publishing.
 */
export type ConceptId = 'ai' | 'rag' | 'llm' | 'ml' | 'data' | 'software';
export type PreviewKind = 'sentiment' | 'similarity' | 'retrieval' | 'interface';
export type DemoKind = 'preprocess' | 'tfidf' | 'rag-pipeline';

export interface Concept {
  id: ConceptId;
  label: string;
  /** Home position as a fraction of the project stage. */
  position: { x: number; y: number };
}

export interface Project {
  slug: string;
  index: string;
  title: string;
  discipline: string;
  summary: string;
  year: string;
  role: string;
  type: string;
  stack: string[];
  concepts: ConceptId[];
  /** Home position (fraction of stage) and which side the label sits on. */
  position: { x: number; y: number; align: 'left' | 'right' };
  preview: PreviewKind;
  problem: string;
  approach: { title: string; body: string }[];
  pipeline: string[];
  outcomes: { label: string; value: string }[];
  demo?: DemoKind;
  links: { label: string; href: string }[];
}

export const concepts: Concept[] = [
  { id: 'ai', label: 'AI', position: { x: 0.5, y: 0.08 } },
  { id: 'rag', label: 'RAG', position: { x: 0.5, y: 0.25 } },
  { id: 'llm', label: 'LLM', position: { x: 0.5, y: 0.42 } },
  { id: 'ml', label: 'Machine Learning', position: { x: 0.5, y: 0.59 } },
  { id: 'data', label: 'Data', position: { x: 0.5, y: 0.76 } },
  { id: 'software', label: 'Software', position: { x: 0.5, y: 0.93 } },
];

export const projects: Project[] = [
  {
    slug: 'mental-health-detection',
    index: '01',
    title: 'Mental Health Detection',
    discipline: 'Machine Learning · NLP',
    summary:
      'Early-stage signals of mental-health risk in social-media text, using sentiment analysis and supervised classification.',
    year: '2025',
    role: 'Research · ML engineering',
    type: 'MSc research',
    stack: ['Python', 'Pandas', 'NLTK', 'VADER', 'scikit-learn', 'Matplotlib'],
    concepts: ['ml', 'data'],
    position: { x: 0.37, y: 0.47, align: 'right' },
    preview: 'sentiment',
    problem:
      'Signs of depression and anxiety often surface in language long before anyone seeks help. Clinical screening is sparse and slow; public text is abundant but noisy, informal and ethically sensitive.',
    approach: [
      {
        title: 'Collection & ethics',
        body: 'Public, anonymised posts with identifiers removed. Framed as research into linguistic signals — never as diagnosis.',
      },
      {
        title: 'Preprocessing',
        body: 'Normalisation, tokenisation, stop-word removal and lemmatisation tuned for informal text: emoji, slang and negation.',
      },
      {
        title: 'Features',
        body: 'TF-IDF n-grams combined with lexicon sentiment scores (VADER) and linguistic markers such as first-person pronoun rate.',
      },
      {
        title: 'Modelling',
        body: 'Baselines compared under stratified cross-validation: Logistic Regression, Linear SVM and Random Forest.',
      },
      {
        title: 'Evaluation',
        body: 'Recall-weighted metrics. For early detection, a missed signal costs more than a false alarm.',
      },
    ],
    pipeline: ['Social text', 'Preprocessing', 'Sentiment', 'Features', 'Classifier', 'Risk signal'],
    // No invented numbers: add your real evaluation results in /admin.
    outcomes: [
      { label: 'Goal', value: 'Early detection' },
      { label: 'Signal', value: 'Sentiment + language' },
      { label: 'Context', value: 'MSc research' },
      { label: 'Use', value: 'Research, not diagnosis' },
    ],
    demo: 'preprocess',
    links: [{ label: 'Read the research', href: '/#research' }],
  },
  {
    slug: 'netflix-recommendation-system',
    index: '02',
    title: 'Netflix Recommendation System',
    discipline: 'Machine Learning · Retrieval',
    summary:
      'A content-based movie and TV recommender: TF-IDF over each title’s description and genres, ranked by cosine similarity, served by a Flask API with a React front end.',
    year: '2025',
    role: 'Data science · full stack',
    type: 'Recommender system (deployed)',
    stack: ['Python', 'Pandas', 'scikit-learn', 'Flask', 'React', 'Vite', 'Render'],
    concepts: ['ml', 'data'],
    position: { x: 0.63, y: 0.66, align: 'left' },
    preview: 'similarity',
    problem:
      'A catalogue of thousands of films and shows with no viewing history to learn from — the cold-start problem. Recommendations have to come from the content itself.',
    approach: [
      {
        title: 'Corpus',
        body: 'The Netflix titles dataset (8,807 titles). Each title becomes one document: its description plus its genres (listed_in), with incomplete rows dropped.',
      },
      {
        title: 'Vectorisation',
        body: 'scikit-learn’s TfidfVectorizer with English stop-words: words that appear everywhere are down-weighted, distinctive ones rewarded.',
      },
      {
        title: 'Similarity',
        body: 'A cosine-similarity matrix over the TF-IDF vectors — magnitude-invariant, so short and long descriptions compete fairly.',
      },
      {
        title: 'Serving',
        body: 'A Flask API (POST /recommend) returns the five most similar titles; a React + Vite front end calls it. The API is deployed on Render.',
      },
    ],
    pipeline: [
      'Netflix catalogue',
      'Description + genres',
      'TF-IDF',
      'Cosine similarity',
      'Top 5',
      'Flask API → React',
    ],
    outcomes: [
      { label: 'Titles indexed', value: '8,807' },
      { label: 'Films · shows', value: '6,131 · 2,676' },
      { label: 'Recommendations', value: 'Top 5' },
      { label: 'Served by', value: 'Flask API' },
    ],
    demo: 'tfidf',
    links: [
      {
        label: 'Front-end code',
        href: 'https://github.com/sumonahmedjubayer121997/ds_netflix_Movie_Recommender_frontend',
      },
      { label: 'How TF-IDF works', href: '/blog/how-tf-idf-actually-works' },
    ],
  },
  {
    slug: 'rag-system',
    index: '03',
    title: 'AI / RAG System',
    discipline: 'LLMs · Retrieval',
    summary:
      'Retrieval-augmented generation over private documents: chunking, embeddings, vector search and grounded, cited answers.',
    year: '2026',
    role: 'AI engineering',
    type: 'LLM application',
    stack: ['Python', 'LangChain', 'LangGraph', 'Embeddings', 'Vector DB', 'FastAPI'],
    concepts: ['rag', 'llm'],
    position: { x: 0.63, y: 0.29, align: 'left' },
    preview: 'retrieval',
    problem:
      'LLMs are fluent but unaware of your documents, and prone to confident invention. The goal: answers grounded in a specific corpus, with citations a reader can verify.',
    approach: [
      {
        title: 'Ingestion',
        body: 'Documents parsed, cleaned and split into overlapping, structure-aware chunks.',
      },
      {
        title: 'Embeddings',
        body: 'Each chunk mapped into a vector space where semantic similarity becomes geometric distance.',
      },
      {
        title: 'Retrieval',
        body: 'Hybrid search (dense + keyword) followed by re-ranking, so the prompt receives the few passages that matter.',
      },
      {
        title: 'Generation',
        body: 'The model answers only from retrieved context, cites its sources — and says so when the context is insufficient.',
      },
      {
        title: 'Evaluation',
        body: 'Retrieval hit-rate and answer faithfulness measured against a hand-written question set.',
      },
    ],
    pipeline: ['Documents', 'Chunking', 'Embeddings', 'Vector DB', 'Retrieval', 'LLM'],
    // No invented numbers: add retrieval hit-rate / faithfulness from your evaluation in /admin.
    outcomes: [
      { label: 'Pattern', value: 'Retrieval-augmented' },
      { label: 'Retrieval', value: 'Embeddings' },
      { label: 'Knowledge', value: 'Your documents' },
      { label: 'Output', value: 'Grounded answers' },
    ],
    demo: 'rag-pipeline',
    links: [{ label: 'RAG from first principles', href: '/blog/understanding-rag-from-first-principles' }],
  },
  {
    slug: 'web-applications',
    index: '04',
    title: 'Portfolio / Web Applications',
    discipline: 'Software · Web',
    summary:
      'Production web applications in React and TypeScript — including this site, its WebGL scenes and its hand-written physics engine.',
    year: '2023 — now',
    role: 'Front-end engineering',
    type: 'Web applications',
    stack: ['React', 'TypeScript', 'Firebase', 'Three.js', 'Tailwind CSS', 'Vite'],
    concepts: ['software', 'data'],
    position: { x: 0.37, y: 0.85, align: 'right' },
    preview: 'interface',
    problem:
      'Models are only useful when people can use them. The interface is where data science turns into decisions.',
    approach: [
      {
        title: 'Architecture',
        body: 'Typed, modular React with content separated from components and animation state kept outside the render path.',
      },
      {
        title: 'Performance',
        body: 'Code-split WebGL, typed-array simulations, a single shared animation loop and adaptive pixel ratios.',
      },
      {
        title: 'Backend',
        body: 'Firebase for authentication, Firestore and hosting where a managed backend is the right trade-off.',
      },
      {
        title: 'Accessibility',
        body: 'Semantic HTML, complete keyboard paths and a reduced-motion fallback for every interactive system.',
      },
    ],
    pipeline: ['Design system', 'Components', 'State', 'Data layer', 'Performance', 'Deploy'],
    outcomes: [
      { label: 'WebGL scenes', value: '3' },
      { label: 'Physics engine', value: 'Hand-written' },
      { label: 'Animation loops', value: '1 shared' },
      { label: 'Reduced motion', value: 'Full fallback' },
    ],
    links: [{ label: 'Get in touch', href: '/#contact' }],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
