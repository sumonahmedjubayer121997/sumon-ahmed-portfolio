/**
 * Live readouts written by WebGL scenes and read by DOM HUDs at a low rate.
 * Mutable objects — no React state, no re-renders.
 */
export const heroTelemetry = {
  nodes: 0,
  links: 0,
  disorder: 1,
  order: 0,
  excitation: 0,
  running: false,
};
