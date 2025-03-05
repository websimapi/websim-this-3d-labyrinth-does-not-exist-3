import React from 'react';
import { useWebsim } from '../utils/WebsimContext.js';

export const Gallery = ({ active, onBack, onSelectLabyrinth }) => {
  const { room } = useWebsim();
  const labyrinths = React.useSyncExternalStore(
    room.collection('labyrinth').subscribe,
    room.collection('labyrinth').getList
  );
  
  return (
    <div className={`screen ${active ? '' : 'hidden'}`}>
      <h2 className="title">Labyrinth Gallery</h2>
      
      <div className="gallery">
        {labyrinths.length === 0 ? (
          <p>No labyrinths found. Be the first to create one!</p>
        ) : (
          labyrinths.map(labyrinth => (
            <div 
              key={labyrinth.id} 
              className="gallery-item" 
              onClick={() => onSelectLabyrinth(labyrinth)}
            >
              <img 
                src={labyrinth.imageUrl} 
                alt={labyrinth.name} 
                className="gallery-image" 
              />
              <div className="gallery-content">
                <h3 className="gallery-title">{labyrinth.name}</h3>
                <p className="gallery-desc">{labyrinth.description.substring(0, 100)}...</p>
                <div className="creator-info">
                  <img 
                    src={`https://images.websim.ai/avatar/${labyrinth.username}`}
                    alt={labyrinth.username} 
                    className="creator-avatar" 
                  />
                  <span>{labyrinth.username}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <button className="button back-button" onClick={onBack}>Back to Menu</button>
    </div>
  );
};

