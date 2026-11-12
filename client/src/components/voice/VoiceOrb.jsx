import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'orbloom/styles.css';
import './VoiceOrb.css';
import { COMPANIO_ORB_THEME } from './orbTheme';
import {
  ORB_STATES,
  STATE_COPY,
  mapCompanioToOrbloomState,
} from './voiceStateAdapter';

const DEFAULT_ORB_DIAMETER = 264;

/**
 * Companio VoiceOrb Component (backed by orbloom@0.1.0 WebGL engine)
 *
 * Wraps Orbloom's single-canvas fullscreen shader with:
 * - Module-scope resolved nebula-violet theme (`COMPANIO_ORB_THEME`)
 * - SSR-safe client-only dynamic import & single `OrbController` instance per canvas
 * - Non-recreating prop synchronization via `setState` / `setTheme` / `setQuality` / `setReducedMotion`
 * - Exact `theme.ambientMotion` CSS custom properties onto `.orb-motion`
 * - Deep OKLCH atmospheric stage derived from `#1c0a2b` with responsive `ResizeObserver`
 * - `.orb-no-webgl` fallback activation on WebGL context failure
 * - Mandatory accessible `aria-live="polite"` text status alongside visual state
 */
export default function VoiceOrb({
  state = ORB_STATES.IDLE,
  level = 0,
  size = DEFAULT_ORB_DIAMETER,
  quality = 'balanced',
  reducedMotion = 'user',
  theme = COMPANIO_ORB_THEME,
  staged = true,
  statusLabel = null,
  className = '',
}) {
  const stageRef = useRef(null);
  const motionRef = useRef(null);
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const levelRafRef = useRef(null);
  const levelSourceRef = useRef(level);

  const [webglFailed, setWebglFailed] = useState(false);
  const [effectiveDiameter, setEffectiveDiameter] = useState(size);

  const resolvedTheme = theme || COMPANIO_ORB_THEME;
  const orbloomState = mapCompanioToOrbloomState(state);
  const accessibleStatusText = statusLabel || STATE_COPY[state] || STATE_COPY.idle;

  levelSourceRef.current = level;

  const getInstantLevel = useCallback(() => {
    const src = levelSourceRef.current;
    let raw = 0;
    if (typeof src === 'function') raw = src();
    else if (src && typeof src === 'object' && 'current' in src) raw = src.current || 0;
    else if (typeof src === 'number') raw = src;
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
  }, []);

  // Sync per-variant ambient float CSS properties & responsive diameter onto `.orb-motion`
  const applyAmbientMotion = useCallback((el, activeTheme, motionSetting) => {
    if (!el || !activeTheme?.ambientMotion) return;
    const m = activeTheme.ambientMotion;
    const enabled = motionSetting === true ? false : m.enabled;
    el.dataset.ambientMotion = String(enabled);
    el.style.setProperty('--orb-motion-distance', `${-m.verticalTravel}px`);
    el.style.setProperty('--orb-motion-scale', String(m.scale));
    el.style.setProperty('--orb-motion-duration', `${m.durationSeconds}s`);
    el.style.setProperty('--orb-motion-delay', `${m.delaySeconds}s`);
  }, []);

  // Recompute responsive diameter from container bounds while respecting requested size (default 264px)
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl || typeof ResizeObserver !== 'function') {
      setEffectiveDiameter(size);
      return undefined;
    }

    const updateSize = () => {
      const bounds = stageEl.getBoundingClientRect();
      if (!bounds.width) {
        setEffectiveDiameter(size);
        return;
      }
      const styles = getComputedStyle(stageEl);
      const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const available = Math.max(120, Math.floor(bounds.width - padX));
      const nextDiameter = Math.min(size, available);
      setEffectiveDiameter(nextDiameter);
      if (controllerRef.current && !controllerRef.current.destroyed) {
        controllerRef.current.resize();
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageEl);
    return () => observer.disconnect();
  }, [size]);

  // Apply `--orb-diameter` and `ambientMotion` whenever diameter/theme/reducedMotion change
  useEffect(() => {
    const motionEl = motionRef.current;
    if (!motionEl) return;
    motionEl.style.setProperty('--orb-diameter', `${effectiveDiameter}px`);
    applyAmbientMotion(motionEl, resolvedTheme, reducedMotion);
    if (controllerRef.current && !controllerRef.current.destroyed) {
      controllerRef.current.resize();
    }
  }, [effectiveDiameter, resolvedTheme, reducedMotion, applyAmbientMotion]);

  // Create OrbController ONCE per mounted canvas via client-only dynamic import
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const motionEl = motionRef.current;
    if (!canvas || !motionEl) return undefined;

    const markWebglFailure = () => {
      if (cancelled) return;
      motionEl.classList.add('orb-no-webgl');
      setWebglFailed(true);
    };

    motionEl.style.setProperty('--orb-diameter', `${effectiveDiameter}px`);
    applyAmbientMotion(motionEl, resolvedTheme, reducedMotion);

    import('orbloom')
      .then(({ createOrb }) => {
        if (cancelled || !canvasRef.current) return;
        try {
          const controller = createOrb(canvasRef.current, {
            theme: resolvedTheme,
            quality,
            state: orbloomState,
            reducedMotion,
            onError: () => markWebglFailure(),
          });
          if (cancelled) {
            controller.destroy();
            return;
          }
          controllerRef.current = controller;
          controller.resize();
        } catch (err) {
          console.warn('[VoiceOrb] WebGL initialization failed, falling back to CSS nebula gradient:', err?.message);
          markWebglFailure();
        }
      })
      .catch((err) => {
        console.warn('[VoiceOrb] Failed to load orbloom runtime:', err?.message);
        markWebglFailure();
      });

    return () => {
      cancelled = true;
      if (levelRafRef.current) {
        cancelAnimationFrame(levelRafRef.current);
        levelRafRef.current = null;
      }
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
    // Intentionally run once per canvas mount; prop updates flow through controller setters below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push prop changes without recreating controller
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || ctrl.destroyed) return;
    ctrl.setState(orbloomState);
  }, [orbloomState]);

  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || ctrl.destroyed) return;
    ctrl.setTheme(resolvedTheme);
    applyAmbientMotion(motionRef.current, resolvedTheme, reducedMotion);
  }, [resolvedTheme, reducedMotion, applyAmbientMotion]);

  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || ctrl.destroyed) return;
    ctrl.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || ctrl.destroyed) return;
    ctrl.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Feed instantaneous audio level cleanly when reactive (or driven by slider/analyser)
  const hasNumericLevel = typeof level === 'number';
  useEffect(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }

    const isReactiveState =
      orbloomState === 'listening' || orbloomState === 'speaking' || hasNumericLevel;

    if (!isReactiveState) {
      controllerRef.current?.setAudioLevel(0);
      return undefined;
    }

    let running = true;
    const pump = () => {
      if (!running) return;
      const ctrl = controllerRef.current;
      if (ctrl && !ctrl.destroyed) {
        ctrl.setAudioLevel(getInstantLevel());
      }
      levelRafRef.current = requestAnimationFrame(pump);
    };
    levelRafRef.current = requestAnimationFrame(pump);

    return () => {
      running = false;
      if (levelRafRef.current) {
        cancelAnimationFrame(levelRafRef.current);
        levelRafRef.current = null;
      }
    };
  }, [orbloomState, hasNumericLevel, getInstantLevel]);

  const orbDom = (
    <div
      ref={motionRef}
      className={`orb-motion${webglFailed ? ' orb-no-webgl' : ''}${!staged && className ? ` ${className}` : ''}`}
      style={{ '--orb-diameter': `${effectiveDiameter}px` }}
    >
      <div className="orb-shell">
        <div className="orb-clip">
          <canvas ref={canvasRef} className="orb-canvas" aria-label="Voice activity" />
          <div className="orb-fallback" aria-hidden="true" />
        </div>
        <div className="orb-chrome" aria-hidden="true" />
      </div>
    </div>
  );

  if (!staged) {
    return (
      <div ref={stageRef} className="companio-orb-frame">
        {orbDom}
        <span className="sr-only" role="status" aria-live="polite">
          {accessibleStatusText}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className={`companio-orb-stage${effectiveDiameter < 220 ? ' companio-orb-stage--compact' : ''} ${className}`.trim()}
    >
      <div className="companio-orb-stage-grain" aria-hidden="true" />
      <div className="companio-orb-frame">{orbDom}</div>
      <span className="sr-only" role="status" aria-live="polite">
        {accessibleStatusText}
      </span>
    </div>
  );
}
