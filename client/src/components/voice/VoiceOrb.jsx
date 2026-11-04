import React, { useEffect, useRef } from 'react';
import { ORB_STATES } from './voiceStateAdapter';
import {
  Mic,
  Brain,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Pause,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

/**
 * Companio VoiceOrb Component
 * 
 * Living, fluid acoustic orb constructed exclusively from Companio's Bloom tokens:
 * - Blue: rgb(34, 97, 146) [#226192]
 * - Light Blue: rgb(127, 176, 216) [#7FB0D8]
 * - Coral: rgb(239, 133, 87) [#EF8557]
 * 
 * Features:
 * - Smooth spring physics on scale driven by REAL audio input/output level
 * - Calm breathing when silent (NO fake waveforms)
 * - 60fps Canvas render loop decoupling audio level from React state
 * - Strict reduced-motion fallback (static visual orb + accessible icon)
 * 
 * @param {string} state - One of ORB_STATES
 * @param {number | React.RefObject<number> | Function} level - Real RMS audio level in [0, 1]
 * @param {number} size - Pixel dimensions (Default 220px)
 * @param {boolean} reducedMotion - Accessibility reduced motion flag
 */
export default function VoiceOrb({
  state = ORB_STATES.LISTENING,
  level = 0,
  size = 220,
  reducedMotion = false,
  className = '',
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const springRef = useRef({
    scale: 1.0,
    velocity: 0,
    time: 0,
    bargeInStartTime: 0,
  });

  // Extract instantaneous audio level (handles number, ref, or getter function)
  const getInstantLevel = () => {
    if (typeof level === 'function') return Math.min(1, Math.max(0, level()));
    if (level && typeof level === 'object' && 'current' in level) {
      return Math.min(1, Math.max(0, level.current || 0));
    }
    if (typeof level === 'number') return Math.min(1, Math.max(0, level));
    return 0;
  };

  useEffect(() => {
    if (reducedMotion) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const baseRadius = size * 0.35;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const rawLevel = getInstantLevel();
      const s = springRef.current;
      s.time += 0.02;

      // 1. Spring Physics calculation for scale
      let targetScale = 1.0;

      if (state === ORB_STATES.LISTENING) {
        // Natural gentle breathing when idle + reactive displacement on real voice
        const breathing = Math.sin(s.time * 1.5) * 0.035;
        targetScale = 1.0 + breathing + rawLevel * 0.45;
      } else if (state === ORB_STATES.SPEAKING) {
        // Voice response expansion + rhythmic pulse + real playback amplitude
        const pulse = Math.sin(s.time * 2.8) * 0.04;
        targetScale = 1.05 + pulse + rawLevel * 0.55;
      } else if (state === ORB_STATES.THINKING || state === ORB_STATES.PROCESSING) {
        // Contracting amber / thinking focus
        targetScale = 0.94 + Math.sin(s.time * 3.5) * 0.03;
      } else if (state === ORB_STATES.BARGE_IN) {
        // Rapid snap contraction under 150ms
        targetScale = 0.88;
      } else if (state === ORB_STATES.PAUSED) {
        targetScale = 0.95;
      } else if (state === ORB_STATES.RECONNECTING || state === ORB_STATES.RECOVERING) {
        // Alert pulsing perimeter
        targetScale = 1.0 + Math.sin(s.time * 4.0) * 0.05;
      } else if (state === ORB_STATES.URGENT) {
        targetScale = 1.04; // Steady, never flashing
      } else if (state === ORB_STATES.COMPLETED) {
        targetScale = 1.08;
      }

      // Spring Euler integration (Stiffness = 0.22, Damping = 0.76)
      const stiffness = state === ORB_STATES.BARGE_IN ? 0.45 : 0.22;
      const damping = state === ORB_STATES.BARGE_IN ? 0.65 : 0.78;
      const force = (targetScale - s.scale) * stiffness;
      s.velocity = (s.velocity + force) * damping;
      s.scale += s.velocity;

      // Clear Canvas
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);
      ctx.scale(s.scale, s.scale);

      // Bloom Brand Palette Colors
      const blue = 'rgba(34, 97, 146, ';
      const lightBlue = 'rgba(127, 176, 216, ';
      const coral = 'rgba(239, 133, 87, ';
      const urgentSteady = 'rgba(179, 38, 30, ';

      // 2. Outer Glow Ring
      const glowGrad = ctx.createRadialGradient(0, 0, baseRadius * 0.6, 0, 0, baseRadius * 1.45);
      if (state === ORB_STATES.SPEAKING) {
        // Coral glow expands during active Companio speech
        glowGrad.addColorStop(0, coral + '0.45)');
        glowGrad.addColorStop(0.7, blue + '0.25)');
        glowGrad.addColorStop(1, coral + '0)');
      } else if (state === ORB_STATES.RECONNECTING || state === ORB_STATES.RECOVERING) {
        // Distinct Coral perimeter ring
        glowGrad.addColorStop(0, coral + '0.5)');
        glowGrad.addColorStop(0.85, coral + '0.35)');
        glowGrad.addColorStop(1, coral + '0)');
      } else if (state === ORB_STATES.URGENT) {
        // Steady non-flashing clinical priority aura
        glowGrad.addColorStop(0, urgentSteady + '0.4)');
        glowGrad.addColorStop(0.8, urgentSteady + '0.2)');
        glowGrad.addColorStop(1, urgentSteady + '0)');
      } else {
        // Calm clinical blue outer glow
        glowGrad.addColorStop(0, lightBlue + '0.4)');
        glowGrad.addColorStop(0.65, blue + '0.2)');
        glowGrad.addColorStop(1, lightBlue + '0)');
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // 3. Fluid Drifting Gradient Lobes (ChatGPT / Gemini style)
      ctx.globalCompositeOperation = 'screen';

      const rotSpeed = state === ORB_STATES.THINKING ? 2.5 : 1.0;

      // Lobe 1: Blue Core Anchor
      const a1 = s.time * 0.8 * rotSpeed;
      const x1 = Math.cos(a1) * (baseRadius * 0.22);
      const y1 = Math.sin(a1) * (baseRadius * 0.22);
      const r1Grad = ctx.createRadialGradient(x1, y1, 0, x1, y1, baseRadius * 0.95);
      r1Grad.addColorStop(0, blue + '0.85)');
      r1Grad.addColorStop(0.7, blue + '0.4)');
      r1Grad.addColorStop(1, blue + '0)');
      ctx.fillStyle = r1Grad;
      ctx.beginPath();
      ctx.arc(x1, y1, baseRadius * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // Lobe 2: Light Blue Ethereal Swirl
      const a2 = -s.time * 0.95 * rotSpeed + 2.1;
      const x2 = Math.cos(a2) * (baseRadius * 0.28);
      const y2 = Math.sin(a2) * (baseRadius * 0.28);
      const r2Grad = ctx.createRadialGradient(x2, y2, 0, x2, y2, baseRadius * 0.85);
      r2Grad.addColorStop(0, lightBlue + '0.9)');
      r2Grad.addColorStop(0.6, lightBlue + '0.35)');
      r2Grad.addColorStop(1, lightBlue + '0)');
      ctx.fillStyle = r2Grad;
      ctx.beginPath();
      ctx.arc(x2, y2, baseRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Lobe 3: Coral Vitality (Warmth, Energy, Speech Wave)
      const coralWeight = state === ORB_STATES.SPEAKING ? 0.95 : 0.65;
      const a3 = s.time * 1.15 * rotSpeed + 4.2;
      const x3 = Math.cos(a3) * (baseRadius * 0.2);
      const y3 = Math.sin(a3) * (baseRadius * 0.2);
      const r3Grad = ctx.createRadialGradient(x3, y3, 0, x3, y3, baseRadius * 0.8);
      r3Grad.addColorStop(0, coral + `${coralWeight})`);
      r3Grad.addColorStop(0.65, coral + `${coralWeight * 0.4})`);
      r3Grad.addColorStop(1, coral + '0)');
      ctx.fillStyle = r3Grad;
      ctx.beginPath();
      ctx.arc(x3, y3, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // 4. Soft Bright Core Center
      ctx.globalCompositeOperation = 'lighter';
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 0.5);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      coreGrad.addColorStop(0.5, lightBlue + '0.4)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Special State Visual Overlays
      if (state === ORB_STATES.PAUSED) {
        // Twin calm vertical pause pills
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-12, -18, 8, 36);
        ctx.fillRect(4, -18, 8, 36);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, size, reducedMotion]);

  // Reduced Motion Accessibility Fallback
  if (reducedMotion) {
    const reducedIcons = {
      [ORB_STATES.LISTENING]: Mic,
      [ORB_STATES.SPEAKING]: Volume2,
      [ORB_STATES.THINKING]: Brain,
      [ORB_STATES.PROCESSING]: Brain,
      [ORB_STATES.PAUSED]: Pause,
      [ORB_STATES.RECONNECTING]: RefreshCw,
      [ORB_STATES.RECOVERING]: RefreshCw,
      [ORB_STATES.URGENT]: AlertTriangle,
      [ORB_STATES.COMPLETED]: CheckCircle2,
      [ORB_STATES.FAILED]: AlertCircle,
      [ORB_STATES.UNCERTAIN]: HelpCircle,
    };
    const IconComponent = reducedIcons[state] || Mic;

    return (
      <div
        style={{ width: size, height: size }}
        className={`relative flex flex-col items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent/80 border-4 border-surface shadow-soft-lift select-none ${className}`}
        role="img"
        aria-label={`Voice state: ${state}`}
      >
        <div className="w-16 h-16 rounded-full bg-surface text-primary flex items-center justify-center shadow-md">
          <IconComponent className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold text-on-primary uppercase tracking-wider mt-2">
          {state}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
      role="img"
      aria-label={`Voice assistant active: ${state}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
    </div>
  );
}

