import React from 'react';

export const WebsimContext = React.createContext(null);

export const useWebsim = () => {
  const context = React.useContext(WebsimContext);
  if (!context) {
    throw new Error('useWebsim must be used within a WebsimContext.Provider');
  }
  return context;
};

