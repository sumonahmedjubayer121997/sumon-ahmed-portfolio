export interface ModelStage {
  id: string;
  label: string;
  title: string;
  body: string;
  readout: string;
}

export const modelStages: ModelStage[] = [
  {
    id: 'data',
    label: 'Data',
    title: 'Raw data',
    body: 'Unlabelled, noisy, high-entropy. Every row a measurement; no structure yet visible.',
    readout: 'n = samples · entropy high',
  },
  {
    id: 'features',
    label: 'Features',
    title: 'Feature space',
    body: 'Cleaning and feature engineering project the data into a space where similar things sit close together.',
    readout: 'dims = 3 · clusters emerging',
  },
  {
    id: 'model',
    label: 'Model',
    title: 'Model',
    body: 'A learned function draws boundaries through that space. Structure becomes explicit and testable.',
    readout: 'boundaries fitted · cv = 5-fold',
  },
  {
    id: 'prediction',
    label: 'Prediction',
    title: 'Prediction',
    body: 'New observations fall into meaningful groups — counts you can act on, with uncertainty you can measure.',
    readout: 'classes = 4 · decision ready',
  },
];

/** Class shares at the prediction stage (must sum to 1). */
export const classShares = [0.34, 0.26, 0.22, 0.18];
export const classLabels = ['Class A', 'Class B', 'Class C', 'Class D'];
