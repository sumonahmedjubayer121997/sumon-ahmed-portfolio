import { startTransition, useEffect, useState } from 'react';
import { Hero } from '@/components/sections/Hero';
import { ProjectSystem } from '@/components/sections/ProjectSystem';
import { DataModelSection } from '@/components/sections/DataModelSection';
import { AILab } from '@/components/sections/AILab';
import { AboutSection } from '@/components/sections/AboutSection';
import { ResearchSection } from '@/components/sections/ResearchSection';
import { SkillSystem } from '@/components/sections/SkillSystem';
import { ExperienceTimeline } from '@/components/sections/ExperienceTimeline';
import { BlogSection } from '@/components/sections/BlogSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { prefetchWhenIdle } from '@/components/PhysicsCanvas';
import { supportsWebGL } from '@/lib/device';
import { useIsHydrating } from '@/lib/hydration';

export default function HomePage() {
  // Prerendered (and hydrated) pages render everything at once. On client-side
  // navigation the hero renders first and the rest follows in a transition,
  // which React time-slices so the main thread never locks up.
  const hydrating = useIsHydrating();
  const [rest, setRest] = useState(hydrating);
  useEffect(() => {
    startTransition(() => setRest(true));
  }, []);

  // Warm the later WebGL scenes once the page is idle so they appear instantly.
  useEffect(() => {
    if (!supportsWebGL()) return;
    prefetchWhenIdle([() => import('@/three/DataModelScene'), () => import('@/three/AILabScene')]);
  }, []);

  if (!rest) return <Hero />;

  return (
    <>
      <Hero />
      <ProjectSystem />
      <DataModelSection />
      <AILab />
      <AboutSection />
      <ResearchSection />
      <SkillSystem />
      <ExperienceTimeline />
      <BlogSection />
      <ContactSection />
    </>
  );
}
