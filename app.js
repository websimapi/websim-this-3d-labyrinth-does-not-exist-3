import React from 'react';
import ReactDOM from 'react-dom/client';
import { MainMenu } from './components/MainMenu.js';
import { Gallery } from './components/Gallery.js';
import { Generator } from './components/Generator.js';
import { Game } from './components/Game.js';
import { Loading } from './components/Loading.js';
import { WebsimContext } from './utils/WebsimContext.js';

const App = () => {
  const [room] = React.useState(() => new WebsimSocket());
  const [screen, setScreen] = React.useState('main');
  const [loading, setLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState('');
  const [selectedLabyrinth, setSelectedLabyrinth] = React.useState(null);
  
  const switchScreen = (screenName) => {
    setScreen(screenName);
  };
  
  const startLabyrinth = (labyrinth) => {
    setSelectedLabyrinth(labyrinth);
    setScreen('game');
    // Play music on first interaction
    const music = document.getElementById('background-music');
    music.play().catch(err => console.log('Music playback failed:', err));
  };
  
  const showLoading = (message) => {
    setLoadingMessage(message);
    setLoading(true);
  };
  
  const hideLoading = () => {
    setLoading(false);
  };
  
  return (
    <WebsimContext.Provider value={{ room, showLoading, hideLoading }}>
      <div id="app-container">
        <MainMenu 
          active={screen === 'main'} 
          onCreateClick={() => switchScreen('generator')}
          onGalleryClick={() => switchScreen('gallery')}
        />
        
        <Generator
          active={screen === 'generator'}
          onBack={() => switchScreen('main')}
          onLabyrinthGenerated={(labyrinth) => {
            switchScreen('game');
            setSelectedLabyrinth(labyrinth);
          }}
        />
        
        <Gallery
          active={screen === 'gallery'}
          onBack={() => switchScreen('main')}
          onSelectLabyrinth={startLabyrinth}
        />
        
        {selectedLabyrinth && (
          <Game
            active={screen === 'game'}
            labyrinth={selectedLabyrinth}
            onBack={() => {
              setSelectedLabyrinth(null);
              switchScreen('gallery');
            }}
          />
        )}
        
        {loading && <Loading message={loadingMessage} />}
      </div>
    </WebsimContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);

