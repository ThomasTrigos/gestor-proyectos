import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BrandingConfig {
  appName: string;
  appLogo: string | null; // Base64 data URL o URL externa
}

interface BrandingContextType {
  appName: string;
  appLogo: string | null;
  setAppName: (name: string) => void;
  setAppLogo: (logo: string | null) => void;
  updateBranding: (newConfig: Partial<BrandingConfig>) => void;
  resetBranding: () => void;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'Gestor de Proyectos',
  appLogo: null,
};

const STORAGE_KEY = 'app_branding';

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBrandingState] = useState<BrandingConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          appName: parsed.appName?.trim() || DEFAULT_BRANDING.appName,
          appLogo: parsed.appLogo || null,
        };
      }
    } catch (e) {
      console.error('Error al recuperar identidad guardada de localStorage', e);
    }
    return DEFAULT_BRANDING;
  });

  const saveBranding = (next: BrandingConfig) => {
    setBrandingState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Error al guardar identidad en localStorage', e);
    }
  };

  const setAppName = (name: string) => {
    const updated = { ...branding, appName: name.trim() || DEFAULT_BRANDING.appName };
    saveBranding(updated);
  };

  const setAppLogo = (logo: string | null) => {
    const updated = { ...branding, appLogo: logo };
    saveBranding(updated);
  };

  const updateBranding = (newConfig: Partial<BrandingConfig>) => {
    const updated: BrandingConfig = {
      appName: newConfig.appName !== undefined ? (newConfig.appName.trim() || DEFAULT_BRANDING.appName) : branding.appName,
      appLogo: newConfig.appLogo !== undefined ? newConfig.appLogo : branding.appLogo,
    };
    saveBranding(updated);
  };

  const resetBranding = () => {
    saveBranding(DEFAULT_BRANDING);
  };

  useEffect(() => {
    document.title = branding.appName ? `${branding.appName}` : DEFAULT_BRANDING.appName;
  }, [branding.appName]);

  return (
    <BrandingContext.Provider
      value={{
        appName: branding.appName,
        appLogo: branding.appLogo,
        setAppName,
        setAppLogo,
        updateBranding,
        resetBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
