import React from 'react';

export const MainMenu = ({ active, onCreateClick, onGalleryClick }) => {
  return (
    <div className={`screen main-menu ${active ? '' : 'hidden'}`}>
      <h1 className="title">This 3D Labyrinth Does Not Exist</h1>
      <p className="subtitle">Generate infinite procedural labyrinths with AI</p>
      
      <div className="menu-buttons">
        <button className="button" onClick={onCreateClick}>
          Create New Labyrinth
        </button>
        <button className="button" onClick={onGalleryClick}>
          Explore Labyrinths Gallery
        </button>
      </div>
    </div>
  );
};

