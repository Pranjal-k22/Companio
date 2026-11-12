import { createOrbTheme } from 'orbloom';

/**
 * Resolved at module scope so any invalid theme configuration throws immediately at startup.
 * `preset` selects only the nebula-violet-01 procedural archetype/structure;
 * every color, appearance, motion, and audioResponse value overrides the variant palette.
 */
export const COMPANIO_ORB_THEME = createOrbTheme({
  preset: 'nebula-violet-01',
  id: 'orb-studio-nebula-violet-01',
  seed: 1,
  colors: {
    base: '#1c0a2b',
    interior: '#08040d',
    accents: ['#a24dff', '#ff4dd8', '#6e8bff'],
  },
  appearance: { intensity: 0.85, detail: 0.7, glow: 0.8, glass: 0.28 },
  motion: { speed: 0.7, drift: 0.75 },
  audioResponse: { brightness: 1.2, motion: 0.55, pulse: 0.85 },
});
