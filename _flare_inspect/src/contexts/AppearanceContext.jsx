import React, { createContext, useContext, useState, useEffect } from 'react';

const AppearanceContext = createContext();

export const useAppearance = () => useContext(AppearanceContext);

export const AppearanceProvider = ({ children }) => {
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('flare_settings');
        return saved ? JSON.parse(saved) : {
            appearance: 'dark',
            fontSize: 'medium',
            themeColor: '#a855f7',
        };
    });

    useEffect(() => {
        applySettings(settings);
    }, [settings]);

    const applySettings = (s) => {
        const root = document.documentElement;

        // 1. Appearance (Dark/Light)
        const isDark = s.appearance === 'dark' ||
            (s.appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            root.classList.remove('theme-light');
            root.classList.add('theme-dark'); // Just in case, though dark is default
        } else {
            root.classList.add('theme-light');
            root.classList.remove('theme-dark');
        }

        // 2. Theme Color
        root.style.setProperty('--primary', s.themeColor);
        // Calculate glow (simplified)
        const glowColor = s.themeColor.startsWith('#') ? s.themeColor : '#a855f7';
        root.style.setProperty('--primary-glow', `${glowColor}66`); // 40% alpha in hex is roughly 66

        // 3. Font Size
        const scales = { small: 0.9, medium: 1, large: 1.15 };
        root.style.setProperty('--font-scale', scales[s.fontSize] || 1);

        localStorage.setItem('flare_settings', JSON.stringify(s));
    };

    const updateAppearance = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <AppearanceContext.Provider value={{ ...settings, updateAppearance }}>
            {children}
        </AppearanceContext.Provider>
    );
};
