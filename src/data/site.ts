/**
 * Global site content. Replace the placeholder values marked TODO with real data.
 */
export const site = {
  name: 'Sumon Ahmed',
  shortName: 'SA',
  role: 'Data Scientist',
  disciplines: ['AI', 'LLMs', 'Machine Learning'],
  statement: {
    lead: 'I build intelligent systems from data to',
    emphasis: 'decisions.',
  },
  intro:
    'Data scientist and AI engineer. I build data-driven systems, machine learning models and LLM applications — from the first exploratory notebook to the interface people actually use.',
  location: 'United Kingdom', // TODO: confirm
  availability: 'Open to Data Science, ML & AI Engineering roles', // TODO: confirm
  // TODO: replace with your real address before publishing.
  email: 'hello@sumonahmed.dev',
  socials: [
    // TODO: replace with your real profile URLs.
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
    { label: 'Kaggle', href: 'https://www.kaggle.com/' },
  ],
  year: 2026,
} as const;

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { id: 'work', label: 'Work', href: '/#work' },
  { id: 'ai-lab', label: 'AI Lab', href: '/#ai-lab' },
  { id: 'about', label: 'About', href: '/#about' },
  { id: 'research', label: 'Research', href: '/#research' },
  { id: 'blog', label: 'Blog', href: '/#blog' },
];
