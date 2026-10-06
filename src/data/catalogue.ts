/**
 * A small fictional catalogue for the TF-IDF recommender demo.
 * (Titles are invented — the real project used the public Netflix titles dataset.)
 */
export interface Title {
  id: string;
  title: string;
  genre: string;
  description: string;
}

export const catalogue: Title[] = [
  {
    id: 'quiet-archive',
    title: 'The Quiet Archive',
    genre: 'Documentary',
    description:
      'A meticulous documentary about archivists preserving forgotten film reels, memory and the fragile history of cinema.',
  },
  {
    id: 'signal-noise',
    title: 'Signal & Noise',
    genre: 'Thriller',
    description:
      'A data analyst uncovers a hidden pattern in financial markets and becomes the target of a ruthless hacker network.',
  },
  {
    id: 'northern-line',
    title: 'Northern Line',
    genre: 'Drama',
    description: 'Commuters on a late London train share secrets, grief and second chances over one long night.',
  },
  {
    id: 'deep-field',
    title: 'Deep Field',
    genre: 'Sci-fi',
    description:
      'An astronaut drifting near Jupiter receives a mysterious signal that may come from a lost research station.',
  },
  {
    id: 'last-orchard',
    title: 'The Last Orchard',
    genre: 'Drama',
    description:
      'Three generations of a farming family fight to save their orchard, their land and each other after a drought.',
  },
  {
    id: 'zero-day',
    title: 'Zero Day',
    genre: 'Thriller',
    description:
      "A young security researcher races to stop a hacker network before a zero-day attack cripples the city's power grid.",
  },
  {
    id: 'tidewater',
    title: 'Tidewater',
    genre: 'Documentary',
    description:
      'Fishermen and scientists measure how warming oceans change coastal communities, wildlife and the people who depend on them.',
  },
  {
    id: 'parallax',
    title: 'Parallax',
    genre: 'Sci-fi',
    description:
      'A physicist discovers a research station orbiting a parallel Earth — and a version of herself who made different choices.',
  },
  {
    id: 'small-kitchen',
    title: 'Small Kitchen',
    genre: 'Comedy',
    description:
      'Two rival chefs forced to share a tiny London kitchen discover friendship, family recipes and terrible jokes.',
  },
  {
    id: 'black-box',
    title: 'Black Box',
    genre: 'Thriller',
    description:
      'Investigators recover the black box from a crashed jet and decode a hidden signal pointing to a cover-up.',
  },
  {
    id: 'wild-hours',
    title: 'Wild Hours',
    genre: 'Documentary',
    description:
      'Thermal cameras reveal the nocturnal wildlife of forests, rivers and cities — the hidden life that wakes at night.',
  },
  {
    id: 'second-family',
    title: 'Second Family',
    genre: 'Comedy-drama',
    description:
      'A chaotic family reunion turns into a week of secrets, grief, laughter and unexpected second chances.',
  },
  {
    id: 'orbit',
    title: 'Orbit',
    genre: 'Sci-fi',
    description:
      'The crew of a failing research station near Jupiter must choose between rescue and a signal from deep space.',
  },
  {
    id: 'ledger',
    title: 'Ledger',
    genre: 'Crime',
    description:
      "A forensic accountant follows hidden financial transactions into a powerful family's criminal empire.",
  },
];
