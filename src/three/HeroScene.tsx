import type { SceneProps } from '@/components/PhysicsCanvas';
import type { HeroBand } from '@/lib/heroStructure';
import { SceneCanvas } from './SceneCanvas';
import { ParticleField } from './ParticleField';

export interface HeroSceneProps {
  count: number;
  compact: boolean;
  band: HeroBand | null;
}

export default function HeroScene({ active, count, compact, band }: HeroSceneProps & SceneProps) {
  return (
    <SceneCanvas active={active} camera={{ fov: 35, position: [0, 0, 1000], near: 1, far: 5000 }}>
      <ParticleField count={count} compact={compact} band={band} />
    </SceneCanvas>
  );
}
