export const research = {
  degree: 'MSc Computer Science',
  institution: 'University of Bedfordshire',
  year: '2025', // TODO: confirm
  type: 'MSc Dissertation',
  title:
    'Building a System for Identifying Mental Health Disorders in Early Stages Through Social Media Data Using Sentiment Analysis',
  keywords: ['Sentiment analysis', 'NLP', 'Early detection', 'Social media', 'Machine learning'],
  abstract: [
    'Language carries early signals of psychological distress, often well before a person seeks support. This dissertation investigates whether those signals can be detected reliably in public social-media text, and how a detection system can be built responsibly.',
    'Posts are normalised and lemmatised, scored with lexicon-based sentiment analysis, and represented as TF-IDF features enriched with sentiment and linguistic markers. Several supervised classifiers are compared under cross-validation with recall-weighted metrics, reflecting the asymmetric cost of missed signals in early detection.',
  ],
  ethics:
    'Research prototype built on anonymised public data. It identifies linguistic risk signals for study — it is not a diagnostic tool.',
  // Synthetic example used in the figure; not a real post.
  sample: 'Haven’t slept properly in weeks… everything feels heavy lately and I can’t focus on anything.',
  figure: [
    { id: 'text', label: 'Social text', caption: 'Raw post' },
    { id: 'preprocess', label: 'NLP preprocessing', caption: 'normalise · tokenise · lemmatise' },
    { id: 'sentiment', label: 'Sentiment', caption: 'lexicon polarity' },
    { id: 'features', label: 'Features', caption: 'TF-IDF + markers' },
    { id: 'model', label: 'ML model', caption: 'LR · SVM · RF' },
    { id: 'prediction', label: 'Prediction', caption: 'risk signal' },
  ],
};
