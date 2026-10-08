/**
 * Starter blog posts, imported into Firestore from /admin (posts/{slug}).
 * Bodies use the Markdown dialect in src/content/markdown.ts; the live site
 * reads the Firestore copies.
 */
export interface StarterPost {
  slug: string;
  index: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  body: string;
}

export const posts: StarterPost[] = [
  {
    slug: 'understanding-rag-from-first-principles',
    index: '01',
    title: 'Understanding RAG from First Principles',
    excerpt: 'Chunking, embeddings, retrieval and generation — and where real systems actually fail.',
    date: '2026-08-14',
    tags: ['RAG', 'LLMs', 'Retrieval'],
    body: `
An LLM is a compressed snapshot of its training data. It cannot know your contracts, your wiki or last week’s incident report — and when asked anyway, it will often produce something that sounds right. Retrieval-augmented generation fixes this with a simple idea: before answering, look things up.

## The problem RAG solves

Fine-tuning changes how a model writes far more reliably than what it knows. It is expensive to repeat whenever documents change, and it offers no citations. Retrieval keeps knowledge outside the model, where it can be updated, permissioned and audited.

## Step 1 — Chunking

Documents are split into passages small enough to be specific but large enough to be self-contained. A few hundred tokens with a small overlap is a sensible default; splitting on headings and paragraphs beats splitting on raw character counts.

## Step 2 — Embeddings

An embedding model maps each chunk to a vector. Texts with similar meaning land near each other, so “refund policy” and “how do I get my money back” are neighbours even though they share no words.

~~~python
chunks  = split(document, max_tokens=512, overlap=64)
vectors = embed(chunks)              # shape: (n_chunks, 1536)
index.add(vectors, metadata=chunks)
~~~

## Step 3 — Retrieval

At question time the query is embedded with the same model and the nearest chunks are fetched — usually through an approximate nearest-neighbour index, because exact search over millions of vectors is too slow. Combining dense search with keyword search (BM25) and re-ranking the results catches what either misses alone.

<Demo kind="rag-pipeline" />

## Step 4 — Generation

The retrieved passages go into the prompt with an instruction: answer only from this context, cite the sources, and say so if the answer isn’t there. That last clause matters more than any other line in the prompt.

~~~text
Answer using only the context below. Cite sources as [n].
If the context does not contain the answer, say you don't know.

Context:
[1] {chunk_1}
[2] {chunk_2}

Question: {question}
~~~

## Where RAG systems actually fail

- Retrieval misses — the right passage exists but never reaches the prompt. Measure hit-rate before touching the prompt.
- Bad chunks — tables split in half, headings separated from the text they describe.
- Context stuffing — more passages is not better; irrelevant context dilutes attention.
- No evaluation set — without fifty real questions with known answers, every change is a guess.

RAG is less a modelling technique than an information-retrieval system with an LLM at the end. Treat it like one, and measure each stage separately.
`,
  },
  {
    slug: 'how-tf-idf-actually-works',
    index: '02',
    title: 'How TF-IDF Actually Works',
    excerpt: 'Term frequency, inverse document frequency and cosine similarity — with a live recommender to play with.',
    date: '2026-06-02',
    tags: ['NLP', 'Information retrieval', 'Recommenders'],
    body: `
Before embeddings there was TF-IDF — and for many problems it is still the right first tool. It is fast, transparent and needs no GPU. It also powers my [Netflix recommender](/work/netflix-recommendation-system) — 8,807 titles, served by a Flask API — so it is worth understanding properly.

## Term frequency

Term frequency asks how prominent a word is in one document. The simplest version is a count divided by document length, so long documents don’t win by default.

$$ tf(t, d) = count(t, d) / |d| $$

## Inverse document frequency

Some words appear everywhere — “the”, “film”, “story”. They say little about any particular document. IDF down-weights them by counting how many documents contain the term.

$$ idf(t) = ln((1 + N) / (1 + df(t))) + 1 $$

A term found in every document gets a weight near 1; a term found in one document out of ten thousand gets a weight near 10. Multiply the two and the score is high only when a word is frequent here and rare elsewhere.

$$ tfidf(t, d) = tf(t, d) · idf(t) $$

## From weights to similarity

Each document becomes a sparse vector with one dimension per vocabulary term. To compare two documents, take the cosine of the angle between their vectors. It ignores magnitude, so a short synopsis and a long one can still point in the same direction.

$$ cos(a, b) = (a · b) / (‖a‖ ‖b‖) $$

<Demo kind="tfidf" />

Select different titles above. The shared terms explain why each recommendation appears — an explanation you rarely get for free from dense embeddings.

## In scikit-learn

~~~python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# One document per title: its description plus its genres.
text = df["description"].fillna("") + " " + df["listed_in"].fillna("")
X = TfidfVectorizer(stop_words="english").fit_transform(text)

scores = cosine_similarity(X[idx], X).ravel()
top_5  = scores.argsort()[::-1][1:6]          # skip the title itself
~~~

## When to reach for something else

- Synonyms — TF-IDF sees “car” and “automobile” as unrelated. Embeddings don’t.
- Word order — “dog bites man” and “man bites dog” produce identical vectors.
- Short, ambiguous queries — semantic models generalise far better.
- But for transparent baselines, keyword search and cold-start recommenders, TF-IDF remains hard to beat.
`,
  },
  {
    slug: 'building-ai-agents-with-tools',
    index: '03',
    title: 'Building AI Agents with Tools',
    excerpt: 'An LLM in a loop: tools, observations, MCP — and the guardrails that make it reliable.',
    date: '2026-09-12',
    tags: ['Agents', 'Tools', 'MCP'],
    body: `
An agent is an LLM in a loop. It receives a goal, chooses an action, observes the result and chooses again — until it is done or a budget runs out. The idea is simple; making it reliable is not.

## Tools are functions with good descriptions

A tool is a function plus a schema the model can read: a name, a purpose and typed parameters. The model never executes anything itself — it emits a structured call, and your runtime decides whether and how to run it.

~~~json
{
  "name": "search_orders",
  "description": "Find a customer's orders by email. Returns at most 10.",
  "input_schema": {
    "type": "object",
    "properties": { "email": { "type": "string" } },
    "required": ["email"]
  }
}
~~~

## The loop

<Demo kind="agent-pipeline" />

~~~python
messages = [user(goal)]
for step in range(MAX_STEPS):
    reply = llm(messages, tools=tools)
    if not reply.tool_calls:
        return reply.text                    # goal met
    messages.append(reply)
    for call in reply.tool_calls:
        result = run_tool(call)              # validated, sandboxed
        messages.append(tool_result(call.id, result))
raise BudgetExceeded()
~~~

## MCP: tools without bespoke glue

The Model Context Protocol standardises how tools and data sources are exposed to models. Instead of wiring every API into every application, you run an MCP server once and any compatible client can discover its tools, resources and prompts.

## What makes agents reliable

- Small, sharp tools — one responsibility each, described for a model rather than a human.
- Budgets — cap steps, tokens and wall-clock time. Loops that cannot end will not end.
- Verification — check tool outputs and final answers; with code where possible, a second model where not.
- Memory with intent — persist what future steps need, not the whole transcript.
- Humans at the edges — require confirmation before anything irreversible.

Frameworks like LangGraph make control flow explicit as a graph — useful once an agent needs branches, retries or approval steps. The fundamentals stay the same: a model, a loop, tools and guardrails.
`,
  },
];
