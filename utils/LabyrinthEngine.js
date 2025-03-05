import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class LabyrinthEngine {
  constructor({ canvasElement, labyrinthData, biomeTextures, onPlayerMove }) {
    this.canvas = canvasElement;
    this.labyrinthData = labyrinthData;
    this.biomeTextures = biomeTextures;
    this.onPlayerMove = onPlayerMove;
    
    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Game state
    this.playerPosition = { x: 0, y: 0, z: 0 };
    this.moveSpeed = 0.15;
    this.mazeSize = 20; // Starting maze size
    this.cellSize = 5;
    this.wallHeight = 4;
    this.seed = this.generateSeedFromString(labyrinthData.name + labyrinthData.theme);
    this.maze = null;
    
    // Controls state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    
    // Other players
    this.otherPlayers = new Map();
    
    // Texture cache
    this.textureCache = new Map();
    
    // Generation parameters
    this.currentMazeOrigin = { x: 0, z: 0 };
    this.generationDistance = 40; // How far from player to generate new maze sections
    this.loadedMazeSections = new Set(); // Track which sections we've loaded
  }
  
  async initialize() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.015);
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.y = 1.7; // Eye level
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    
    // Initialize controls
    this.setupControls();
    
    // Initialize lighting
    this.setupLighting();
    
    // Load textures
    await this.preloadTextures();
    
    // Generate initial maze
    this.generateMaze(0, 0);
    
    // Start animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Register mobile controls
    this.setupMobileControls();
  }
  
  setupControls() {
    // Pointer lock controls for desktop
    this.controls = new PointerLockControls(this.camera, document.body);
    
    // Add event listener for pointer lock
    this.canvas.addEventListener('click', () => {
      this.controls.lock();
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
      }
    });
  }
  
  setupMobileControls() {
    // These are handled by the buttons in the Game component
  }
  
  movePlayer(direction) {
    // For mobile controls
    switch (direction) {
      case 'forward':
        this.moveForward = true;
        setTimeout(() => { this.moveForward = false; }, 200);
        break;
      case 'backward':
        this.moveBackward = true;
        setTimeout(() => { this.moveBackward = false; }, 200);
        break;
      case 'left':
        this.moveLeft = true;
        setTimeout(() => { this.moveLeft = false; }, 200);
        break;
      case 'right':
        this.moveRight = true;
        setTimeout(() => { this.moveRight = false; }, 200);
        break;
    }
  }
  
  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    // Player light (follows the camera)
    this.playerLight = new THREE.PointLight(0xffffff, 1, 15);
    this.playerLight.position.set(0, 2, 0);
    this.playerLight.castShadow = true;
    this.camera.add(this.playerLight);
    this.scene.add(this.camera);
    
    // Distant atmospheric lights for each biome
    this.biomeTextures.forEach((biome, index) => {
      const color = this.getBiomeColor(biome.name);
      const biomeLight = new THREE.PointLight(color, 0.7, 30);
      const angle = (index / this.biomeTextures.length) * Math.PI * 2;
      const distance = 40;
      biomeLight.position.set(
        Math.cos(angle) * distance,
        5,
        Math.sin(angle) * distance
      );
      this.scene.add(biomeLight);
    });
  }
  
  getBiomeColor(biomeName) {
    const colorMap = {
      'Stone': 0x888888,
      'Crystal': 0x5588ff,
      'Overgrown': 0x55aa55,
      'Mechanical': 0xaa5555,
      'Temple': 0xffcc88,
      'Forest': 0x228822,
      'Cavern': 0x553377,
      'Swamp': 0x556633,
      'Desert': 0xddcc88,
      'Ice': 0x88ccff,
      'Lava': 0xff5500,
      'Ancient': 0xaa9966,
      'Futuristic': 0x00aaff,
      'Medieval': 0x996633,
      'Underwater': 0x0088aa,
      'Castle': 0x777777,
      'Jungle': 0x33aa33,
      'Mountain': 0x888866,
      'Cave': 0x555577,
      'Ruins': 0xbbaa88
    };
    
    return colorMap[biomeName] || 0xffffff;
  }
  
  async preloadTextures() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load floor texture
    this.floorTexture = await new Promise((resolve) => {
      textureLoader.load(
        // Generate a simple floor texture
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        resolve
      );
    });
    
    // Load biome textures
    for (const biome of this.biomeTextures) {
      const texture = await new Promise((resolve) => {
        textureLoader.load(biome.url, resolve);
      });
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      this.textureCache.set(biome.name, texture);
    }
  }
  
  getBiomeTexture(x, z) {
    // Determine which biome to use based on position
    const biomesCount = this.biomeTextures.length;
    if (biomesCount === 0) return null;
    
    // Use noise to create organic biome transitions
    const noiseValue = this.noise(x * 0.02, z * 0.02);
    const biomeIndex = Math.floor((noiseValue * 0.5 + 0.5) * biomesCount) % biomesCount;
    
    const biomeName = this.biomeTextures[biomeIndex].name;
    return this.textureCache.get(biomeName);
  }
  
  generateMaze(originX, originZ) {
    const sectionKey = `${originX},${originZ}`;
    if (this.loadedMazeSections.has(sectionKey)) return;
    
    // Generate maze data using depth-first search with backtracking
    const mazeData = this.generateMazeData(this.mazeSize, this.mazeSize, this.seed + originX + originZ);
    
    // Create maze geometry
    this.createMazeGeometry(mazeData, originX, originZ);
    
    // Mark this section as loaded
    this.loadedMazeSections.add(sectionKey);
  }
  
  generateMazeData(width, height, seed) {
    // Initialize maze with walls
    const maze = Array(height).fill().map(() => Array(width).fill(0));
    
    // Seeded random function
    const random = this.seededRandom(seed);
    
    // Starting point
    let x = Math.floor(random() * width);
    if (x % 2 === 0) x = Math.max(1, x - 1);
    
    let y = Math.floor(random() * height);
    if (y % 2 === 0) y = Math.max(1, y - 1);
    
    maze[y][x] = 1; // Mark as visited
    
    // Stack for backtracking
    const stack = [{x, y}];
    
    // Directions: right, down, left, up
    const dirs = [[2, 0], [0, 2], [-2, 0], [0, -2]];
    
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      
      // Get available neighbors
      const neighbors = [];
      
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && maze[ny][nx] === 0) {
          neighbors.push({x: nx, y: ny, dx, dy});
        }
      }
      
      if (neighbors.length > 0) {
        // Choose random neighbor
        const next = neighbors[Math.floor(random() * neighbors.length)];
        
        // Mark the wall between current and next as open
        maze[current.y + next.dy/2][current.x + next.dx/2] = 1;
        
        // Mark next cell as visited
        maze[next.y][next.x] = 1;
        
        // Add next to stack
        stack.push({x: next.x, y: next.y});
      } else {
        // Backtrack
        stack.pop();
      }
    }
    
    return maze;
  }
  
  createMazeGeometry(mazeData, originX, originZ) {
    const height = mazeData.length;
    const width = mazeData[0].length;
    
    // Create the floor
    const floorGeometry = new THREE.PlaneGeometry(
      width * this.cellSize, 
      height * this.cellSize
    );
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      map: this.floorTexture,
      color: 0x333333,
      roughness: 0.8
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      originX + width * this.cellSize / 2, 
      0, 
      originZ + height * this.cellSize / 2
    );
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Create walls
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mazeData[y][x] === 0) { // Wall
          const worldX = originX + x * this.cellSize;
          const worldZ = originZ + y * this.cellSize;
          
          // Get texture based on position
          const texture = this.getBiomeTexture(worldX, worldZ);
          
          const wallGeometry = new THREE.BoxGeometry(
            this.cellSize, 
            this.wallHeight, 
            this.cellSize
          );
          
          const wallMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7
          });
          
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(
            worldX + this.cellSize / 2, 
            this.wallHeight / 2, 
            worldZ + this.cellSize / 2
          );
          
          wall.castShadow = true;
          wall.receiveShadow = true;
          
          this.scene.add(wall);
        }
      }
    }
  }
  
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  updateOtherPlayer(clientId, position) {
    // Check if this player already exists
    if (!this.otherPlayers.has(clientId)) {
      // Create a new player mesh
      const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
      const material = new THREE.MeshBasicMaterial({ color: this.getRandomColor(clientId) });
      const playerMesh = new THREE.Mesh(geometry, material);
      
      // Add a name tag
      const nameTag = this.createNameTag(clientId);
      playerMesh.add(nameTag);
      
      this.scene.add(playerMesh);
      this.otherPlayers.set(clientId, playerMesh);
    }
    
    // Update position
    const playerMesh = this.otherPlayers.get(clientId);
    playerMesh.position.set(position.x, position.y, position.z);
    
    // Make the name tag face the camera
    const nameTag = playerMesh.children[0];
    nameTag.lookAt(this.camera.position);
  }
  
  createNameTag(clientId) {
    // Create a canvas for the name tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = '32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(clientId.substring(0, 8), canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 2, 0);
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }
  
  getRandomColor(seed) {
    const random = this.seededRandom(this.hashString(seed));
    return new THREE.Color(random(), random(), random());
  }
  
  animate() {
    if (!this.renderer) return;
    
    requestAnimationFrame(this.animate.bind(this));
    
    this.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  update() {
    // Handle player movement
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();
    const speed = this.moveSpeed;
    
    if (this.moveForward) frontVector.z = -speed;
    if (this.moveBackward) frontVector.z = speed;
    if (this.moveLeft) sideVector.x = -speed;
    if (this.moveRight) sideVector.x = speed;
    
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed);
    
    if (this.controls.isLocked && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
      this.controls.moveRight(sideVector.x);
      this.controls.moveForward(frontVector.z);
      
      // Update player position
      this.playerPosition = {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      };
      
      // Notify about position change
      this.onPlayerMove(this.playerPosition);
      
      // Check if we need to generate more maze
      this.checkAndGenerateMoreMaze();
    }
  }
  
  checkAndGenerateMoreMaze() {
    const playerX = this.camera.position.x;
    const playerZ = this.camera.position.z;
    
    // Calculate which maze section the player is in
    const sectionX = Math.floor(playerX / (this.mazeSize * this.cellSize)) * this.mazeSize * this.cellSize;
    const sectionZ = Math.floor(playerZ / (this.mazeSize * this.cellSize)) * this.mazeSize * this.cellSize;
    
    // Generate the current section and adjacent sections
    this.generateMaze(sectionX, sectionZ);
    this.generateMaze(sectionX + this.mazeSize * this.cellSize, sectionZ);
    this.generateMaze(sectionX - this.mazeSize * this.cellSize, sectionZ);
    this.generateMaze(sectionX, sectionZ + this.mazeSize * this.cellSize);
    this.generateMaze(sectionX, sectionZ - this.mazeSize * this.cellSize);
  }
  
  noise(x, y) {
    // Simple 2D Perlin-like noise
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    const topRight = this.grad(this.p[this.p[X + 1] + Y + 1], xf - 1, yf - 1);
    const topLeft = this.grad(this.p[this.p[X] + Y + 1], xf, yf - 1);
    const bottomRight = this.grad(this.p[this.p[X + 1] + Y], xf - 1, yf);
    const bottomLeft = this.grad(this.p[this.p[X] + Y], xf, yf);
    
    const u = this.fade(xf);
    const v = this.fade(yf);
    
    return this.lerp(
      this.lerp(bottomLeft, bottomRight, u),
      this.lerp(topLeft, topRight, u),
      v
    );
  }
  
  // Perlin noise helper functions
  lerp(a, b, t) {
    return a + t * (b - a);
  }
  
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  grad(hash, x, y) {
    const h = hash & 15;
    const grad_x = 1 + (h & 7); // Gradient x component, 1-8
    const grad_y = 1 + ((h >> 3) & 7); // Gradient y component, 1-8
    
    // Adjust sign
    const gx = ((h & 1) !== 0) ? grad_x : -grad_x;
    const gy = ((h & 2) !== 0) ? grad_y : -grad_y;
    
    return gx * x + gy * y;
  }
  
  // Initialize Perlin noise permutation table
  initPerlinNoise() {
    this.p = new Array(512);
    for (let i = 0; i < 256; i++) {
      this.p[i] = this.p[i + 256] = Math.floor(this.seededRandom(this.seed + i)() * 256);
    }
  }
  
  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
  
  generateSeedFromString(str) {
    return this.hashString(str);
  }
  
  dispose() {
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Dispose of Three.js resources
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(object.material);
        }
      }
    });
    
    this.renderer.dispose();
    this.controls.dispose();
  }
  
  disposeMaterial(material) {
    if (material.map) material.map.dispose();
    material.dispose();
  }
}

