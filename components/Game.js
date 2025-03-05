import React from 'react';
import { LabyrinthEngine } from '../utils/LabyrinthEngine.js';
import { useWebsim } from '../utils/WebsimContext.js';

export const Game = ({ active, labyrinth, onBack }) => {
  const { room, showLoading, hideLoading } = useWebsim();
  const canvasRef = React.useRef(null);
  const engineRef = React.useRef(null);
  const [isInfoVisible, setInfoVisible] = React.useState(false);
  const [biomeTextures, setBiomeTextures] = React.useState([]);

  React.useEffect(() => {
    if (!active || !labyrinth) return;
    
    const initGame = async () => {
      showLoading('Loading labyrinth...');
      try {
        // Generate wall textures for the biomes
        const biomesFromDescription = extractBiomes(labyrinth.description);
        const textures = await Promise.all(
          biomesFromDescription.map(async (biome) => {
            const texturePrompt = `A detailed, seamless wall texture for a ${biome.name} biome in a labyrinth. The texture should look detailed, photorealistic, and have a ${biome.mood} mood.`;
            
            const textureImage = await websim.imageGen({
              prompt: texturePrompt,
              aspect_ratio: "1:1"
            });
            
            return {
              name: biome.name,
              url: textureImage.url
            };
          })
        );
        
        setBiomeTextures(textures);
        
        // Initialize the 3D engine
        engineRef.current = new LabyrinthEngine({
          canvasElement: canvasRef.current,
          labyrinthData: labyrinth,
          biomeTextures: textures,
          onPlayerMove: (position) => {
            // Send player position update to other players
            room.send({
              type: 'playerMove',
              position,
              labyrinthId: labyrinth.id
            });
          }
        });
        
        engineRef.current.initialize();
        hideLoading();
        
        // Play background music
        const music = document.getElementById('background-music');
        music.play().catch(err => console.log('Music playback failed:', err));
        
      } catch (error) {
        console.error('Error initializing game:', error);
        hideLoading();
        alert('Failed to load the labyrinth. Returning to gallery.');
        onBack();
      }
    };
    
    initGame();
    
    // Setup event handlers for other players
    const handleMessages = (event) => {
      const data = event.data;
      if (data.type === 'playerMove' && data.labyrinthId === labyrinth.id) {
        // Only update if it's for the current labyrinth
        engineRef.current?.updateOtherPlayer(data.clientId, data.position);
      }
    };
    
    room.onmessage = handleMessages;
    
    return () => {
      // Cleanup
      engineRef.current?.dispose();
      room.onmessage = null;
      const music = document.getElementById('background-music');
      music.pause();
    };
  }, [active, labyrinth]);
  
  // Helper function to extract biomes from description
  const extractBiomes = (description) => {
    // Default biomes in case we can't extract them from the description
    const defaultBiomes = [
      { name: "Stone", mood: "ancient" },
      { name: "Crystal", mood: "mysterious" },
      { name: "Overgrown", mood: "natural" },
      { name: "Mechanical", mood: "technological" }
    ];
    
    try {
      // Try to extract biome mentions from the description
      const biomeWords = ['cavern', 'forest', 'temple', 'swamp', 'crystal', 'desert', 'ice', 'lava', 
                        'mechanical', 'ancient', 'futuristic', 'medieval', 'underwater', 'castle', 
                        'jungle', 'mountain', 'cave', 'ruins'];
      
      const foundBiomes = [];
      biomeWords.forEach(word => {
        if (description.toLowerCase().includes(word)) {
          foundBiomes.push({
            name: word.charAt(0).toUpperCase() + word.slice(1),
            mood: getMoodForBiome(word)
          });
        }
      });
      
      // Return found biomes, or default if none found
      return foundBiomes.length > 0 ? foundBiomes.slice(0, 4) : defaultBiomes;
    } catch (error) {
      console.error('Error extracting biomes:', error);
      return defaultBiomes;
    }
  };
  
  const getMoodForBiome = (biome) => {
    const moodMap = {
      'cavern': 'dark',
      'forest': 'lush',
      'temple': 'sacred',
      'swamp': 'murky',
      'crystal': 'glowing',
      'desert': 'dry',
      'ice': 'frozen',
      'lava': 'hot',
      'mechanical': 'industrial',
      'ancient': 'weathered',
      'futuristic': 'sleek',
      'medieval': 'rustic',
      'underwater': 'aquatic',
      'castle': 'imposing',
      'jungle': 'dense',
      'mountain': 'rugged',
      'cave': 'mysterious',
      'ruins': 'crumbling'
    };
    
    return moodMap[biome] || 'mysterious';
  };
  
  const handleControlButton = (direction) => {
    if (engineRef.current) {
      engineRef.current.movePlayer(direction);
    }
  };
  
  return (
    <div className={`screen game-screen ${active ? '' : 'hidden'}`}>
      <div className="game-container">
        <canvas ref={canvasRef} id="game-canvas"></canvas>
        
        <button className="button back-button" onClick={onBack}>Exit Labyrinth</button>
        
        <button 
          className="button info-button" 
          onClick={() => setInfoVisible(!isInfoVisible)}
        >
          Info
        </button>
        
        <div className={`description-panel ${isInfoVisible ? 'show' : ''}`}>
          <h3 className="description-title">{labyrinth.name}</h3>
          <p className="description-text">{labyrinth.description}</p>
          <div className="biomes-preview">
            {biomeTextures.map((biome, index) => (
              <div key={index} className="biome-item">
                <img src={biome.url} alt={biome.name} width="50" height="50" />
                <span>{biome.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="controls">
          <div className="control-row">
            <button 
              className="control-button" 
              onTouchStart={() => handleControlButton('forward')}
            >↑</button>
          </div>
          <div className="control-row">
            <button 
              className="control-button" 
              onTouchStart={() => handleControlButton('left')}
            >←</button>
            <button 
              className="control-button" 
              onTouchStart={() => handleControlButton('backward')}
            >↓</button>
            <button 
              className="control-button" 
              onTouchStart={() => handleControlButton('right')}
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
};

