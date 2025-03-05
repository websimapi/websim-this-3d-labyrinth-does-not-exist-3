import React from 'react';
import { useWebsim } from '../utils/WebsimContext.js';

export const Generator = ({ active, onBack, onLabyrinthGenerated }) => {
  const { room, showLoading, hideLoading } = useWebsim();
  const [name, setName] = React.useState('');
  const [theme, setTheme] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('medium');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !theme) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      showLoading('Generating labyrinth description...');
      
      // Step 1: Generate the labyrinth description using LLM
      const descriptionPrompt = `Create a detailed description of a fictional 3D labyrinth with the theme "${theme}" and difficulty level "${difficulty}". 
      Describe its atmosphere, the unique wall textures, dangers, and any special features. Include details about 3-4 distinct biomes within this labyrinth that a player might encounter. Make it vivid and imaginative.`;
      
      const descriptionCompletion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a creative maze designer who writes evocative, atmospheric descriptions of mysterious labyrinths."
          },
          {
            role: "user",
            content: descriptionPrompt
          }
        ]
      });
      
      const description = descriptionCompletion.content;
      
      // Step 2: Generate an image based on the description
      showLoading('Generating labyrinth image...');
      
      const imagePrompt = `A wide-angle view of a magnificent, mysterious 3D labyrinth with theme: ${theme}. The view should show intricate walls, passages, and multiple biomes. The image should look photorealistic, dramatic lighting, fog effects, detailed textures, and should convey the sense of an infinite maze.`;
      
      const imageResult = await websim.imageGen({
        prompt: imagePrompt,
        aspect_ratio: "16:9"
      });
      
      // Step 3: Store in database
      const newLabyrinth = await room.collection('labyrinth').create({
        name,
        theme,
        difficulty,
        description,
        imageUrl: imageResult.url,
        createdAt: new Date().toISOString()
      });
      
      hideLoading();
      onLabyrinthGenerated(newLabyrinth);
      
    } catch (error) {
      console.error('Error generating labyrinth:', error);
      hideLoading();
      alert('Failed to generate labyrinth. Please try again.');
    }
  };
  
  return (
    <div className={`screen ${active ? '' : 'hidden'}`}>
      <h2 className="title">Create Your Labyrinth</h2>
      
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Labyrinth Name</label>
            <input 
              type="text" 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your labyrinth"
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="theme">Theme / Concept</label>
            <input 
              type="text" 
              id="theme" 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Ancient Egypt, Neon Cyberpunk, Haunted Castle..."
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="difficulty">Difficulty</label>
            <select 
              id="difficulty" 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="nightmare">Nightmare</option>
            </select>
          </div>
          
          <div className="button-group">
            <button type="button" className="button" onClick={onBack}>Back</button>
            <button type="submit" className="button">Generate Labyrinth</button>
          </div>
        </form>
      </div>
    </div>
  );
};

