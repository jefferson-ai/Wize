import React from 'react';

export const TabNavigationContext = React.createContext<{ jumpToTab: (name: string) => void } | null>(null);
