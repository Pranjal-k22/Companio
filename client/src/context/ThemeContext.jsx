import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('companio_theme') || 'dark';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('companio_fontsize') || 'normal'; // 'normal' | 'large'
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('companio_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'large') {
      root.classList.add('text-lg-accessibility');
    } else {
      root.classList.remove('text-lg-accessibility');
    }
    localStorage.setItem('companio_fontsize', fontSize);
  }, [fontSize]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleFontSize = () => {
    setFontSize((prev) => (prev === 'normal' ? 'large' : 'normal'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, fontSize, toggleFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
