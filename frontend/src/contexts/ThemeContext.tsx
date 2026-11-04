import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppTheme = 'claro' | 'oscuro' | 'lectura';
export type TextSize = 'normal' | 'grande' | 'muy-grande';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('app_theme') as AppTheme;
    if (saved === 'claro' || saved === 'oscuro' || saved === 'lectura') {
      return saved;
    }
    return 'claro';
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    const saved = localStorage.getItem('app_text_size') as TextSize;
    if (saved === 'normal' || saved === 'grande' || saved === 'muy-grande') {
      return saved;
    }
    return 'grande'; // Tamaño de texto aumentado por defecto
  });

  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    return localStorage.getItem('app_sidebar_collapsed') === 'true';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setTextSize = (newSize: TextSize) => {
    setTextSizeState(newSize);
    localStorage.setItem('app_text_size', newSize);
    document.documentElement.setAttribute('data-text-size', newSize);
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem('app_sidebar_collapsed', String(collapsed));
    document.documentElement.setAttribute('data-sidebar-collapsed', String(collapsed));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        textSize,
        setTextSize,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
