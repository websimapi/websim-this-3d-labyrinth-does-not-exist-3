import React from 'react';

export const Loading = ({ message }) => {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <div className="loading-text">{message || 'Loading...'}</div>
    </div>
  );
};

