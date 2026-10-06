/**
 * A deliberately small, transparent NLP pipeline used for illustration:
 * normalisation → tokenisation → stop-word removal → lemmatisation → lexicon
 * sentiment with negation. Real projects use NLTK/spaCy/VADER; this mirrors
 * their logic closely enough to explain it.
 */

export const STOPWORDS = new Set(
  (
    'a an the and or but if then so of in on at to for from by with about into over after before under again ' +
    'is am are was were be been being do does did doing have has had having this that these those there here ' +
    'i me my myself we our you your he him his she her it its they them their what which who whom ' +
    'very just than too also only own same such can will would should could all any each few more most other some'
  ).split(' '),
);

const NEGATIONS = new Set([
  'not',
  'no',
  'never',
  "can't",
  'cannot',
  "don't",
  "doesn't",
  "didn't",
  "won't",
  "isn't",
  "aren't",
  "wasn't",
  "haven't",
  "hasn't",
  "couldn't",
  "shouldn't",
  'nothing',
]);

const FIRST_PERSON = new Set(['i', 'me', 'my', 'myself', "i'm", "i've"]);

const IRREGULAR: Record<string, string> = {
  slept: 'sleep',
  felt: 'feel',
  feels: 'feel',
  was: 'be',
  were: 'be',
  lost: 'lose',
  thought: 'think',
  went: 'go',
  better: 'good',
  worse: 'bad',
};

/** Valence in [-1, 1], VADER-style. */
export const LEXICON: Record<string, number> = {
  happy: 0.7,
  good: 0.5,
  great: 0.7,
  love: 0.75,
  calm: 0.4,
  hope: 0.45,
  hopeful: 0.5,
  properly: 0.25,
  focus: 0.3,
  energy: 0.3,
  rest: 0.3,
  enjoy: 0.6,
  excited: 0.65,
  better: 0.4,
  fine: 0.2,
  sad: -0.6,
  heavy: -0.45,
  tired: -0.5,
  exhausted: -0.65,
  alone: -0.5,
  lonely: -0.6,
  empty: -0.55,
  hopeless: -0.8,
  worthless: -0.85,
  anxious: -0.6,
  anxiety: -0.6,
  worry: -0.45,
  stress: -0.5,
  stressed: -0.55,
  bad: -0.5,
  cry: -0.55,
  pain: -0.6,
  hurt: -0.55,
  numb: -0.5,
  afraid: -0.55,
  panic: -0.7,
  struggle: -0.45,
  lost: -0.4,
};

export interface Token {
  raw: string;
  norm: string;
  stop: boolean;
  lemma: string;
  /** Lexicon valence after negation. */
  valence: number;
  negated: boolean;
}

export function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@\w+/g, ' ')
    .replace(/#(\w+)/g, '$1')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lemmatize(word: string) {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (word.includes("'")) return word;
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 5 && word.endsWith('ing') && !/(thing|ring|ning|ming)$/.test(word)) {
    const stem = word.slice(0, -3);
    // "getting" → "get", "making" → "make"
    if (/(.)\1$/.test(stem)) return stem.slice(0, -1);
    return /[^aeiou][aeiou][^aeiouwy]$/.test(stem) && stem.length <= 4 ? stem + 'e' : stem;
  }
  if (word.length > 4 && word.endsWith('ed') && !word.endsWith('eed')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !/(ss|us|is|ous)$/.test(word)) return word.slice(0, -1);
  return word;
}

export function analyse(text: string) {
  const norm = normalise(text);
  const words = norm ? norm.split(' ') : [];
  let negationWindow = 0;
  const tokens: Token[] = words.map((w) => {
    const lemma = lemmatize(w);
    const negator = NEGATIONS.has(w);
    const base = LEXICON[w] ?? LEXICON[lemma] ?? 0;
    const negated = negationWindow > 0 && base !== 0;
    const valence = negated ? -base * 0.74 : base; // VADER's negation scalar
    negationWindow = negator ? 3 : Math.max(0, negationWindow - 1);
    return { raw: w, norm: w, stop: STOPWORDS.has(w) && !negator, lemma, valence, negated };
  });

  const sum = tokens.reduce((a, t) => a + t.valence, 0) * 4;
  const compound = sum === 0 ? 0 : sum / Math.sqrt(sum * sum + 15); // VADER normalisation
  const firstPerson = words.length ? words.filter((w) => FIRST_PERSON.has(w)).length / words.length : 0;
  return { normalised: norm, tokens, compound, firstPerson };
}
