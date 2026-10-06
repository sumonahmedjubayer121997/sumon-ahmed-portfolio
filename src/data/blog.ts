export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'formula'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'demo'; demo: 'tfidf' | 'rag-pipeline' | 'agent-pipeline' };

export interface Post {
  slug: string;
  index: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  tags: string[];
  blocks: Block[];
}

export const posts: Post[] = [
  {
    slug: 'understanding-rag-from-first-principles',
    index: '01',
    title: 'Understanding RAG from First Principles',
    excerpt: 'Chunking, embeddings, retrieval and generation — and where real systems actually fail.',
    date: '2026-08-14',
    readingTime: '7 min',
    tags: ['RAG', 'LLMs', 'Retrieval'],
    blocks: [
      {
        type: 'p',
        text: 'An LLM is a compressed snapshot of its training data. It cannot know your contracts, your wiki or last week’s incident report — and when asked anyway, it will often produce something that sounds right. Retrieval-augmented generation fixes this with a simple idea: before answering, look things up.',
      },
      { type: 'h2', text: 'The problem RAG solves' },
      {
        type: 'p',
        text: 'Fine-tuning changes how a model writes far more reliably than what it knows. It is expensive to repeat whenever documents change, and it offers no citations. Retrieval keeps knowledge outside the model, where it can be updated, permissioned and audited.',
      },
      { type: 'h2', text: 'Step 1 — Chunking' },
      {
        type: 'p',
        text: 'Documents are split into passages small enough to be specific but large enough to be self-contained. A few hundred tokens with a small overlap is a sensible default; splitting on headings and paragraphs beats splitting on raw character counts.',
      },
      { type: 'h2', text: 'Step 2 — Embeddings' },
      {
        type: 'p',
        text: 'An embedding model maps each chunk to a vector. Texts with similar meaning land near each other, so “refund policy” and “how do I get my money back” are neighbours even though they share no words.',
      },
      {
        type: 'code',
        lang: 'python',
        code: `chunks  = split(document, max_tokens=512, overlap=64)
vectors = embed(chunks)              # shape: (n_chunks, 1536)
index.add(vectors, metadata=chunks)`,
      },
      { type: 'h2', text: 'Step 3 — Retrieval' },
      {
        type: 'p',
        text: 'At question time the query is embedded with the same model and the nearest chunks are fetched — usually through an approximate nearest-neighbour index, because exact search over millions of vectors is too slow. Combining dense search with keyword search (BM25) and re-ranking the results catches what either misses alone.',
      },
      { type: 'demo', demo: 'rag-pipeline' },
      { type: 'h2', text: 'Step 4 — Generation' },
      {
        type: 'p',
        text: 'The retrieved passages go into the prompt with an instruction: answer only from this context, cite the sources, and say so if the answer isn’t there. That last clause matters more than any other line in the prompt.',
      },
      {
        type: 'code',
        lang: 'text',
        code: `Answer using only the context below. Cite sources as [n].
If the context does not contain the answer, say you don't know.

Context:
[1] {chunk_1}
[2] {chunk_2}

Question: {question}`,
      },
      { type: 'h2', text: 'Where RAG systems actually fail' },
      {
        type: 'list',
        items: [
          'Retrieval misses — the right passage exists but never reaches the prompt. Measure hit-rate before touching the prompt.',
          'Bad chunks — tables split in half, headings separated from the text they describe.',
          'Context stuffing — more passages is not better; irrelevant context dilutes attention.',
          'No evaluation set — without fifty real questions with known answers, every change is a guess.',
        ],
      },
      {
        type: 'p',
        text: 'RAG is less a modelling technique than an information-retrieval system with an LLM at the end. Treat it like one, and measure each stage separately.',
      },
    ],
  },
  {
    slug: 'how-tf-idf-actually-works',
    index: '02',
    title: 'How TF-IDF Actually Works',
    excerpt: 'Term frequency, inverse document frequency and cosine similarity — with a live recommender to play with.',
    date: '2026-06-02',
    readingTime: '6 min',
    tags: ['NLP', 'Information retrieval', 'Recommenders'],
    blocks: [
      {
        type: 'p',
        text: 'Before embeddings there was TF-IDF — and for many problems it is still the right first tool. It is fast, transparent and needs no GPU. It also powers the recommender in my Netflix project, so it is worth understanding properly.',
      },
      { type: 'h2', text: 'Term frequency' },
      {
        type: 'p',
        text: 'Term frequency asks how prominent a word is in one document. The simplest version is a count divided by document length, so long documents don’t win by default.',
      },
      { type: 'formula', text: 'tf(t, d) = count(t, d) / |d|' },
      { type: 'h2', text: 'Inverse document frequency' },
      {
        type: 'p',
        text: 'Some words appear everywhere — “the”, “film”, “story”. They say little about any particular document. IDF down-weights them by counting how many documents contain the term.',
      },
      { type: 'formula', text: 'idf(t) = ln((1 + N) / (1 + df(t))) + 1' },
      {
        type: 'p',
        text: 'A term found in every document gets a weight near 1; a term found in one document out of ten thousand gets a weight near 10. Multiply the two and the score is high only when a word is frequent here and rare elsewhere.',
      },
      { type: 'formula', text: 'tfidf(t, d) = tf(t, d) · idf(t)' },
      { type: 'h2', text: 'From weights to similarity' },
      {
        type: 'p',
        text: 'Each document becomes a sparse vector with one dimension per vocabulary term. To compare two documents, take the cosine of the angle between their vectors. It ignores magnitude, so a short synopsis and a long one can still point in the same direction.',
      },
      { type: 'formula', text: 'cos(a, b) = (a · b) / (‖a‖ ‖b‖)' },
      { type: 'demo', demo: 'tfidf' },
      {
        type: 'p',
        text: 'Select different titles above. The shared terms explain why each recommendation appears — an explanation you rarely get for free from dense embeddings.',
      },
      { type: 'h2', text: 'In scikit-learn' },
      {
        type: 'code',
        lang: 'python',
        code: `from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
X = vectorizer.fit_transform(df["soup"])

scores = linear_kernel(X[idx], X).ravel()   # = cosine: rows are L2-normalised
top_k  = scores.argsort()[::-1][1:11]`,
      },
      { type: 'h2', text: 'When to reach for something else' },
      {
        type: 'list',
        items: [
          'Synonyms — TF-IDF sees “car” and “automobile” as unrelated. Embeddings don’t.',
          'Word order — “dog bites man” and “man bites dog” produce identical vectors.',
          'Short, ambiguous queries — semantic models generalise far better.',
          'But for transparent baselines, keyword search and cold-start recommenders, TF-IDF remains hard to beat.',
        ],
      },
    ],
  },
  {
    slug: 'building-ai-agents-with-tools',
    index: '03',
    title: 'Building AI Agents with Tools',
    excerpt: 'An LLM in a loop: tools, observations, MCP — and the guardrails that make it reliable.',
    date: '2026-09-12',
    readingTime: '8 min',
    tags: ['Agents', 'Tools', 'MCP'],
    blocks: [
      {
        type: 'p',
        text: 'An agent is an LLM in a loop. It receives a goal, chooses an action, observes the result and chooses again — until it is done or a budget runs out. The idea is simple; making it reliable is not.',
      },
      { type: 'h2', text: 'Tools are functions with good descriptions' },
      {
        type: 'p',
        text: 'A tool is a function plus a schema the model can read: a name, a purpose and typed parameters. The model never executes anything itself — it emits a structured call, and your runtime decides whether and how to run it.',
      },
      {
        type: 'code',
        lang: 'json',
        code: `{
  "name": "search_orders",
  "description": "Find a customer's orders by email. Returns at most 10.",
  "input_schema": {
    "type": "object",
    "properties": { "email": { "type": "string" } },
    "required": ["email"]
  }
}`,
      },
      { type: 'h2', text: 'The loop' },
      { type: 'demo', demo: 'agent-pipeline' },
      {
        type: 'code',
        lang: 'python',
        code: `messages = [user(goal)]
for step in range(MAX_STEPS):
    reply = llm(messages, tools=tools)
    if not reply.tool_calls:
        return reply.text                    # goal met
    messages.append(reply)
    for call in reply.tool_calls:
        result = run_tool(call)              # validated, sandboxed
        messages.append(tool_result(call.id, result))
raise BudgetExceeded()`,
      },
      { type: 'h2', text: 'MCP: tools without bespoke glue' },
      {
        type: 'p',
        text: 'The Model Context Protocol standardises how tools and data sources are exposed to models. Instead of wiring every API into every application, you run an MCP server once and any compatible client can discover its tools, resources and prompts.',
      },
      { type: 'h2', text: 'What makes agents reliable' },
      {
        type: 'list',
        items: [
          'Small, sharp tools — one responsibility each, described for a model rather than a human.',
          'Budgets — cap steps, tokens and wall-clock time. Loops that cannot end will not end.',
          'Verification — check tool outputs and final answers; with code where possible, a second model where not.',
          'Memory with intent — persist what future steps need, not the whole transcript.',
          'Humans at the edges — require confirmation before anything irreversible.',
        ],
      },
      {
        type: 'p',
        text: 'Frameworks like LangGraph make control flow explicit as a graph — useful once an agent needs branches, retries or approval steps. The fundamentals stay the same: a model, a loop, tools and guardrails.',
      },
    ],
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
