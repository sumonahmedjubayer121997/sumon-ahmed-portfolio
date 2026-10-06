import { useMemo } from 'react';
import { createRandom } from '@/lib/random';
import { ParticleField, defaultParticleParams, type ParticleFieldParams } from '@/physics/particles';

/**
 * Creates a CPU particle field (typed arrays, ready for GPU upload) plus a mutable
 * parameter object. Scenes call `field.step()` from their render loop and copy
 * `field.positions` into a BufferAttribute — no React state is involved.
 *
 * `overrides` is read once at creation; scenes mutate `params` directly afterwards.
 */
export function useParticleSimulation(count: number, seed = 7, overrides: Partial<ParticleFieldParams> = {}) {
  return useMemo(() => {
    const random = createRandom(seed);
    const field = new ParticleField(count, random);
    const params: ParticleFieldParams = { ...defaultParticleParams, ...overrides };
    return { field, params, random };
  }, [count, seed]);
}
