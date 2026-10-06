import { useState, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';

export interface SceneCanvasProps {
  active: boolean;
  children: ReactNode;
  camera?: CanvasProps['camera'];
  maxDpr?: number;
}

/**
 * Shared R3F canvas configuration: no antialias (points/lines are anti-aliased in
 * shader), paused render loop when off-screen, and adaptive pixel ratio driven by
 * drei's PerformanceMonitor so slower GPUs keep a steady frame rate.
 */
export function SceneCanvas({ active, children, camera, maxDpr = 1.75 }: SceneCanvasProps) {
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={dpr}
      flat
      linear
      camera={camera}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: false }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        // Shader status checks are synchronous GPU round-trips; only pay for them in development.
        gl.debug.checkShaderErrors = import.meta.env.DEV;
      }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        onFallback={() => setDpr(1)}
      />
      {children}
    </Canvas>
  );
}
