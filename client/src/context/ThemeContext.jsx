import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Theme Mode: 'auto' | 'day' | 'night'
  const [themeMode, setThemeModeState] = useState(() => {
    const stored = localStorage.getItem('companio_theme_mode');
    if (stored === 'day' || stored === 'night' || stored === 'auto') return stored;
    const legacy = localStorage.getItem('companio_theme');
    if (legacy === 'light') return 'day';
    if (legacy === 'dark') return 'night';
    return 'auto';
  });

  // Resolved active visual theme: 'day' | 'night'
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (themeMode === 'day') return 'day';
    if (themeMode === 'night') return 'night';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'night'
      : 'day';
  });

  // Font Size Scaling: '100' | '125' | '150'
  const [fontSize, setFontSizeState] = useState(() => {
    const stored = localStorage.getItem('companio_text_size');
    if (stored === '100' || stored === '125' || stored === '150') return stored;
    const legacy = localStorage.getItem('companio_fontsize');
    if (legacy === 'large') return '125';
    return '100';
  });

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((activeMode) => {
    let target = 'day';
    if (activeMode === 'day') {
      target = 'day';
    } else if (activeMode === 'night') {
      target = 'night';
    } else {
      target = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'night'
        : 'day';
    }

    setResolvedTheme(target);
    const root = document.documentElement;

    root.setAttribute('data-theme', target);
    if (target === 'night') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, []);

  // Update theme when mode changes or on system preference change
  useEffect(() => {
    applyThemeToDOM(themeMode);
    localStorage.setItem('companio_theme_mode', themeMode);
    // Legacy storage key for backwards compatibility
    localStorage.setItem('companio_theme', resolvedTheme === 'night' ? 'dark' : 'light');

    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemeToDOM('auto');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode, resolvedTheme, applyThemeToDOM]);

  // Apply font size to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-size-100', 'text-size-125', 'text-size-150');
    root.classList.add(`text-size-${fontSize}`);

    // Legacy class compatibility
    if (fontSize === '125' || fontSize === '150') {
      root.classList.add('text-lg-accessibility');
    } else {
      root.classList.remove('text-lg-accessibility');
    }

    localStorage.setItem('companio_text_size', fontSize);
    localStorage.setItem('companio_fontsize', fontSize === '100' ? 'normal' : 'large');
  }, [fontSize]);

  // Mode setters
  const setThemeMode = (mode) => {
    if (mode === 'auto' || mode === 'day' || mode === 'night') {
      setThemeModeState(mode);
    }
  };

  const setFontSize = (size) => {
    const str = String(size);
    if (str === '100' || str === '125' || str === '150') {
      setFontSizeState(str);
    }
  };

  // Backwards-compatible toggles for legacy callers
  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === 'day') return 'night';
      if (prev === 'night') return 'auto';
      return 'day';
    });
  };

  const toggleFontSize = () => {
    setFontSizeState((prev) => {
      if (prev === '100') return '125';
      if (prev === '125') return '150';
      return '100';
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        resolvedTheme,
        theme: resolvedTheme === 'night' ? 'dark' : 'light', // Legacy alias
        toggleTheme,
        fontSize,
        setFontSize,
        toggleFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
