import React, { createContext, useContext, useState, ReactNode } from 'react';

type TabName = string | null;

interface NavigationHistoryContextProps {
    lastTab: TabName;
    setLastTab: (tab: TabName) => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextProps | undefined>(undefined);

export const NavigationHistoryProvider = ({ children }: { children: ReactNode }) => {
    const [lastTab, setLastTab] = useState<TabName>(null);
    return (
        <NavigationHistoryContext.Provider value={{ lastTab, setLastTab }}>
            {children}
        </NavigationHistoryContext.Provider>
    );
};

export const useNavigationHistory = () => {
    const context = useContext(NavigationHistoryContext);
    if (!context) {
        throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider');
    }
    return context;
};
