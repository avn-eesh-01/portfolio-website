// Modern 3D Portfolio Experience inspired by garrizmudze.com

// Global vars
let canvas, scene, camera, renderer, clock;
let scroller;
let currentSection = 0;
let materials = [];
let meshes = [];
let lights = [];
let particles;
let raycaster, mouse;
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };

// Initialize base elements
function initThree() {
  // Setup basics
  canvas = document.querySelector('#bg');
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  
  // Ensure canvas is covering the entire viewport
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1'; // Ensure it's behind the content
  canvas.style.pointerEvents = 'none'; // Let clicks pass through to content
  
  // Camera setup with perspective
  camera = new THREE.PerspectiveCamera(26, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 18);
  
  // Renderer with antialiasing for smooth edges
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x030308, 1);
  
  // Add console log to confirm initialization
  console.log('Three.js initialized. Scene:', scene);
  
  // Setup raycaster for interactive elements
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
}

// Create subtle atmospheric background
function createAtmosphere() {
  // Create a custom shader for the subtle atmosphere
  const atmosphereVertexShader = `
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const atmosphereFragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    void main() {
      // Create a subtle gradient
      vec2 uv = vUv;
      float dist = length(uv - vec2(0.5));
      
      // Create a subtle color gradient from dark blue to purple
      vec3 color1 = vec3(0.02, 0.03, 0.08);
      vec3 color2 = vec3(0.06, 0.06, 0.12);
      vec3 baseColor = mix(color2, color1, dist * 2.0);
      
      // Add very subtle noise
      float noiseValue = noise(uv * 20.0 + uTime * 0.05) * 0.03;
      
      gl_FragColor = vec4(baseColor + vec3(noiseValue), 1.0);
    }
  `;
  
  // Create a full-screen plane for the background
  const planeGeometry = new THREE.PlaneGeometry(50, 50);
  const planeMaterial = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uTime: { value: 0 }
    }
  });
  
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.z = -10;
  scene.add(plane);
  
  materials.push(planeMaterial);
  return planeMaterial;
}

// Create subtle interactive particle field
function createParticles() {
  const count = 1500;
  const particleGeometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    // Create particles in a spherical distribution
    const i3 = i * 3;
    const radius = 10 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatten vertically
    positions[i3 + 2] = radius * Math.cos(phi);
    
    scales[i] = Math.random();
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
  
  const particleVertexShader = `
    attribute float scale;
    uniform float uTime;
    
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      
      // Subtle size pulsation based on time
      float size = scale * (sin(uTime * 0.3 + scale * 10.0) * 0.2 + 0.8);
      
      gl_PointSize = size * (100.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  
  const particleFragmentShader = `
    void main() {
      // Create a circle with soft edges
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      // Soft glow
      float alpha = 0.7 * (1.0 - dist * 2.0);
      vec3 color = vec3(0.7, 0.8, 1.0);
      
      gl_FragColor = vec4(color, alpha);
    }
  `;
  
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  materials.push(particleMaterial);
  
  return particles;
}

// Create ambient light for the scene
function createLights() {
  // Ambient light to provide general illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  
  // Directional light for some directionality to the lighting
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 2, 3);
  scene.add(directionalLight);
  
  // Add point lights with different colors for visual interest
  const pointLight1 = new THREE.PointLight(0x0088ff, 1, 50);
  pointLight1.position.set(10, 5, 15);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xff3366, 1, 50);
  pointLight2.position.set(-10, -5, 10);
  scene.add(pointLight2);
  
  lights.push(ambientLight, directionalLight, pointLight1, pointLight2);
  return lights;
}

// Create 3D objects for each section
function createSectionObjects() {
  // Hero section object - Floating cube with wireframe
  const heroGeometry = new THREE.BoxGeometry(3, 3, 3, 2, 2, 2);
  const heroMaterial = new THREE.MeshStandardMaterial({
    color: 0x64ffda,
    wireframe: true,
    transparent: true,
    opacity: 0.7
  });
  const heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
  heroMesh.position.set(5, 0, 5);
  scene.add(heroMesh);
  meshes.push(heroMesh);
  
  // About section object - Connected nodes (knowledge representation)
  const aboutGroup = new THREE.Group();
  
  // Create nodes
  const nodeGeometry = new THREE.IcosahedronGeometry(0.5, 1);
  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3366,
    metalness: 0.5,
    roughness: 0.2
  });
  
  // Create nodes in a 3D arrangement
  const nodePositions = [
    [-2, 2, 0], [2, 1, 1], [0, -2, 0.5], [-1, 0, -1], 
    [1.5, -1, -0.5], [-2, -1.5, 0.8], [2.5, 0, -1], [0, 2, -0.8]
  ];
  
  const nodes = [];
  nodePositions.forEach(position => {
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.set(...position);
    aboutGroup.add(node);
    nodes.push(node);
  });
  
  // Connect nodes with lines
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 0], [4, 1], [5, 3], [6, 1], [7, 0], [2, 4], [5, 2]
  ];
  
  connections.forEach(([i, j]) => {
    const start = nodes[i].position;
    const end = nodes[j].position;
    
    const points = [start, end];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x64ffda, 
      transparent: true, 
      opacity: 0.5 
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    aboutGroup.add(line);
  });
  
  aboutGroup.position.set(-5, 0, 5);
  aboutGroup.visible = false;
  scene.add(aboutGroup);
  meshes.push(aboutGroup);
  
  // Enhanced skills section object - Interactive floating particles
  const skillsGroup = new THREE.Group();

  // Create a more interesting skills visualization
  const skillCount = 20;
  const skillGeometries = [
    new THREE.OctahedronGeometry(0.5, 0),
    new THREE.TetrahedronGeometry(0.5, 0),
    new THREE.IcosahedronGeometry(0.5, 0)
  ];

  const skillColors = [
    0xff3366, // pink
    0xffcc00, // yellow
    0x0088ff, // blue
    0x00cc88, // teal
    0xaa66ff, // purple
    0x66ccff  // light blue
  ];

  for (let i = 0; i < skillCount; i++) {
    const geometryIndex = Math.floor(Math.random() * skillGeometries.length);
    const colorIndex = Math.floor(Math.random() * skillColors.length);
    
    const geometry = skillGeometries[geometryIndex];
    const material = new THREE.MeshStandardMaterial({
      color: skillColors[colorIndex],
      metalness: 0.3,
      roughness: 0.5,
      wireframe: Math.random() > 0.7
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position in a spherical pattern
    const radius = 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
    mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
    mesh.position.z = radius * Math.cos(phi);
    
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    
    // Store original position for animation
    mesh.userData.originalPosition = mesh.position.clone();
    mesh.userData.randomFactor = Math.random() * 0.5 + 0.5;
    
    skillsGroup.add(mesh);
  }
  
  skillsGroup.position.set(0, 0, 5);
  skillsGroup.visible = false;
  scene.add(skillsGroup);
  meshes.push(skillsGroup);
  
  // Projects section object - Interactive 3D panels
  const projectsGroup = new THREE.Group();
  
  // Create 3 project panels
  for (let i = 0; i < 3; i++) {
    const panelGeometry = new THREE.PlaneGeometry(4, 2.25);
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.x = (i - 1) * 5;
    panel.rotation.y = Math.PI / 8 * (i - 1);
    
    projectsGroup.add(panel);
  }
  
  projectsGroup.position.set(0, 0, 5);
  projectsGroup.visible = false;
  scene.add(projectsGroup);
  meshes.push(projectsGroup);
  
  // Contact section object - Animated wave
  const contactGeometry = new THREE.PlaneGeometry(10, 10, 32, 32);
  
  const contactMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x64ffda) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        
        // Create a wave effect
        vec3 pos = position;
        float wave = sin(pos.x * 2.0 + uTime) * sin(pos.y * 2.0 + uTime) * 0.5;
        pos.z += wave;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec2 vUv;
      
      void main() {
        float strength = abs(vUv.y - 0.5) * 2.0;
        strength = 1.0 - strength;
        
        vec3 color = mix(vec3(0.0), uColor, strength);
        
        gl_FragColor = vec4(color, strength * 0.7);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const contactMesh = new THREE.Mesh(contactGeometry, contactMaterial);
  contactMesh.rotation.x = -Math.PI / 2;
  contactMesh.position.set(0, -3, 5);
  contactMesh.visible = false;
  scene.add(contactMesh);
  meshes.push(contactMesh);
  materials.push(contactMaterial);
  
  return { heroMesh, aboutGroup, skillsGroup, projectsGroup, contactMesh };
}

// Create hero section 3D elements for the right side
function createHero3DElements() {
  // Target the container for our 3D elements
  const heroVisualContainer = document.querySelector('.hero-visual');
  
  if (!heroVisualContainer) return;
  
  // Create a new THREE.js scene specifically for the hero visual
  const heroScene = new THREE.Scene();
  
  // Create a new camera
  const heroCamera = new THREE.PerspectiveCamera(75, heroVisualContainer.clientWidth / heroVisualContainer.clientHeight, 0.1, 1000);
  heroCamera.position.z = 5;
  
  // Create renderer
  const heroRenderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true
  });
  heroRenderer.setSize(heroVisualContainer.clientWidth, heroVisualContainer.clientHeight);
  heroRenderer.setClearColor(0x000000, 0);
  
  // Add the renderer to the DOM
  heroVisualContainer.appendChild(heroRenderer.domElement);
  
  // Create a group to hold all geometric elements
  const geometricGroup = new THREE.Group();
  
  // Create various geometric shapes
  const geometries = [
    new THREE.TorusGeometry(1, 0.3, 16, 100),
    new THREE.OctahedronGeometry(0.8, 0),
    new THREE.TetrahedronGeometry(0.7, 0),
    new THREE.IcosahedronGeometry(0.6, 0),
    new THREE.DodecahedronGeometry(0.8, 0)
  ];
  
  // Create at least 7 shapes with different materials
  for (let i = 0; i < 7; i++) {
    const geometry = geometries[i % geometries.length];
    
    // Create an interesting material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(
        0.5 + 0.5 * Math.sin(i * 0.5),
        0.5 + 0.5 * Math.sin(i * 0.3),
        0.8 + 0.2 * Math.sin(i * 0.9)
      ),
      metalness: 0.3,
      roughness: 0.7,
      wireframe: i % 3 === 0
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position with different depths
    const angle = (i / 7) * Math.PI * 2;
    const radius = 1.5 + Math.random() * 0.8;
    
    mesh.position.x = Math.cos(angle) * radius * 0.7;
    mesh.position.y = Math.sin(angle) * radius * 0.5;
    mesh.position.z = -1 - Math.random() * 3;
    
    // Random rotation
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    
    // Add userData for animation
    mesh.userData.speed = {
      x: 0.003 - Math.random() * 0.006,
      y: 0.003 - Math.random() * 0.006,
      z: 0.003 - Math.random() * 0.006
    };
    
    mesh.userData.positionOffset = {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z
    };
    
    mesh.userData.hoverScale = 1 + Math.random() * 0.2;
    
    geometricGroup.add(mesh);
  }
  
  // Add the group to the scene
  heroScene.add(geometricGroup);
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  heroScene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0x64ffda, 1, 100);
  pointLight.position.set(5, 5, 5);
  heroScene.add(pointLight);
  
  // Animation function for the hero elements
  function animateHero() {
    requestAnimationFrame(animateHero);
    
    const time = Date.now() * 0.001;
    
    // Animate all meshes in the group
    geometricGroup.children.forEach((mesh, i) => {
      // Rotate each mesh
      mesh.rotation.x += mesh.userData.speed.x;
      mesh.rotation.y += mesh.userData.speed.y;
      
      // Add subtle movement
      const offset = mesh.userData.positionOffset;
      mesh.position.x = offset.x + Math.sin(time * (0.2 + i * 0.04)) * 0.2;
      mesh.position.y = offset.y + Math.cos(time * (0.15 + i * 0.03)) * 0.15;
      mesh.position.z = offset.z + Math.sin(time * (0.1 + i * 0.02)) * 0.05;
    });
    
    // Make the entire group rotate slightly based on mouse position
    geometricGroup.rotation.y = targetRotation.x * 0.3;
    geometricGroup.rotation.x = targetRotation.y * 0.2;
    
    heroRenderer.render(heroScene, heroCamera);
  }
  
  // Start the animation
  animateHero();
  
  // Handle resize
  function onHeroResize() {
    heroCamera.aspect = heroVisualContainer.clientWidth / heroVisualContainer.clientHeight;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(heroVisualContainer.clientWidth, heroVisualContainer.clientHeight);
  }
  
  window.addEventListener('resize', onHeroResize);
  
  // Return cleanup function
  return function cleanup() {
    window.removeEventListener('resize', onHeroResize);
    heroVisualContainer.removeChild(heroRenderer.domElement);
  };
}

// Initialize smooth scrolling
function initScroll() {
  // Init ScrollTrigger
  ScrollTrigger.matchMedia({
    "(min-width: 969px)": function() {
      // Setup smooth scrolling
      const sections = document.querySelectorAll('.section');
      
      sections.forEach((section, i) => {
        // Set up scroll triggers for each section
        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onEnter: () => goToSection(i),
          onEnterBack: () => goToSection(i)
        });
      });
    }
  });
  
  // Setup scroll progress indicator
  const scrollProgress = document.querySelector('.scroll-progress');
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.offsetHeight - window.innerHeight;
    const scrollPercent = scrollTop / docHeight;
    scrollProgress.style.width = scrollPercent * 100 + "%";
  });
  
  // Enable smooth scrolling for navigation links
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      window.scrollTo({
        top: targetElement.offsetTop,
        behavior: 'smooth'
      });
    });
  });
}

// Handle section change
function goToSection(index) {
  currentSection = index;
  updateSectionVisibility();
}

// Update 3D objects visibility based on current section - FIXED VERSION
function updateSectionVisibility() {
  const sectionObjects = [
    meshes[0], // Hero
    meshes[1], // About
    meshes[2], // Skills
    meshes[3], // Projects
    meshes[4]  // Contact
  ];
  
  sectionObjects.forEach((obj, i) => {
    if (i === currentSection) {
      // Make sure it's visible before animating
      obj.visible = true;
      
      // Animate object in
      gsap.to(obj.position, {
        y: 0,
        duration: 1,
        ease: "power3.out"
      });
      
      // Fade in
      if (obj.material && obj.material.opacity !== undefined) {
        gsap.to(obj.material, { opacity: 1, duration: 1 });
      } else if (obj.children && obj.children.length) {
        obj.children.forEach(child => {
          if (child.material && child.material.opacity !== undefined) {
            gsap.to(child.material, { opacity: 1, duration: 1 });
          }
        });
      }
    } else {
      // Animate object out but DO NOT set visible to false
      gsap.to(obj.position, {
        y: i < currentSection ? -5 : 5,
        duration: 1,
        ease: "power3.out"
      });
      
      // Instead of hiding, just make it transparent/distant
      if (obj.material && obj.material.opacity !== undefined) {
        gsap.to(obj.material, { opacity: 0.1, duration: 1 });
      } else if (obj.children && obj.children.length) {
        obj.children.forEach(child => {
          if (child.material && child.material.opacity !== undefined) {
            gsap.to(child.material, { opacity: 0.1, duration: 1 });
          }
        });
      }
    }
  });
}

// Set up camera animations
function setupScrollAnimations(objects) {
  const { heroMesh, aboutGroup, skillsGroup, projectsGroup, contactMesh } = objects;
  
  // Animation for hero section
  ScrollTrigger.create({
    trigger: "#hero",
    start: "top top",
    end: "bottom top",
    onUpdate: (self) => {
      heroMesh.rotation.y = self.progress * Math.PI;
      heroMesh.rotation.x = self.progress * Math.PI * 0.5;
    }
  });
  
  // Animation for about section
  ScrollTrigger.create({
    trigger: "#about",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      aboutGroup.rotation.y = self.progress * Math.PI * 2;
      gsap.to(camera.position, {
        x: -5 * self.progress,
        y: 2 * self.progress,
        duration: 0.5
      });
    }
  });
  
  // Animation for skills section
  ScrollTrigger.create({
    trigger: "#skills",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      skillsGroup.rotation.y = self.progress * Math.PI * 2;
      skillsGroup.children.forEach((cube, i) => {
        cube.rotation.x += 0.01 * (i + 1);
        cube.rotation.y += 0.01 * (i + 1);
      });
    }
  });
  
  // Animation for projects section
  ScrollTrigger.create({
    trigger: "#projects",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      projectsGroup.rotation.y = self.progress * Math.PI * 0.25;
      gsap.to(camera.position, {
        z: 18 - self.progress * 5,
        duration: 0.5
      });
    }
  });
  
  // Animation for contact section
  ScrollTrigger.create({
    trigger: "#contact",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      contactMesh.material.uniforms.uTime.value = self.progress * 10;
    }
  });
}

// Mouse move handler with smoother cursor
function onMouseMove(event) {
  // Update mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update target rotation for particles
  targetRotation.x = mouse.y * 0.2;
  targetRotation.y = mouse.x * 0.2;
  
  // Update custom cursor with improved smoothness
  updateCustomCursor(event);
}

// Custom cursor effect
function initCustomCursor() {
  const cursor = document.querySelector('.cursor');
  const cursorFollower = document.querySelector('.cursor-follower');
  
  if (!cursor || !cursorFollower) {
    console.error('Custom cursor elements not found');
    return;
  }
  
  // Add dots to cursor follower
  for (let i = 0; i < 2; i++) {
    const dot = document.createElement('span');
    cursorFollower.appendChild(dot);
  }
  
  // Hide default cursor
  document.body.style.cursor = 'none';
  
  // Interactive elements that should change cursor
  const interactiveElements = document.querySelectorAll('a, button, .project-card, .social-link');
  
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('expand');
      cursorFollower.classList.add('expand');
    });
    
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('expand');
      cursorFollower.classList.remove('expand');
    });
  });
  
  // Set initial positions
  cursor.style.transform = 'translate(-50%, -50%)';
  cursorFollower.style.transform = 'translate(-50%, -50%)';
  
  // Ensure cursor is visible
  cursor.style.opacity = '1';
  cursorFollower.style.opacity = '1';
}

// Much smoother cursor movement
function updateCustomCursor(e) {
  const cursor = document.querySelector('.cursor');
  const cursorFollower = document.querySelector('.cursor-follower');
  
  if (!cursor || !cursorFollower) return;
  
  // Position the cursor with slight smoothing
  gsap.to(cursor, {
    left: e.clientX,
    top: e.clientY,
    duration: 0.1,
    ease: "power2.out"
  });
  
  // Slower, smoother movement for follower
  gsap.to(cursorFollower, {
    left: e.clientX,
    top: e.clientY,
    duration: 0.6,
    ease: "power2.out"
  });
}

// Also add this as a fallback to make sure cursor is visible
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    if (cursor && cursorFollower) {
      cursor.style.opacity = '1';
      cursorFollower.style.opacity = '1';
    }
  }, 100);
});

// Fix scrolling issues by simplifying the smooth scroll function
function initSmoothScroll() {
  // Create Lenis for smooth scrolling
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Update ScrollTrigger each time the scroll updates
  lenis.on('scroll', ScrollTrigger.update);

  // Update scroll progress indicator
  const scrollProgress = document.querySelector('.scroll-progress');
  lenis.on('scroll', ({ progress }) => {
    if (scrollProgress) {
      scrollProgress.style.width = `${progress * 100}%`;
    }
  });

  // Connect RAF with Lenis for animations
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  
  requestAnimationFrame(raf);
  
  // Prevent conflicts with link clicks
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const target = document.querySelector(targetId);
      
      if (target) {
        lenis.scrollTo(target, {
          offset: 0,
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      }
    });
  });
  
  return lenis;
}

// Update window event listeners
function setupEventListeners() {
  window.addEventListener('resize', onWindowResize, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const elapsedTime = clock.getElapsedTime();
  
  // Update material uniforms with time
  materials.forEach(material => {
    if (material.uniforms && material.uniforms.uTime) {
      material.uniforms.uTime.value = elapsedTime;
    }
  });
  
  // Smooth rotation for particles
  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;
  
  if (particles) {
    particles.rotation.x = currentRotation.x;
    particles.rotation.y = currentRotation.y;
  }
  
  // Animate the meshes
  meshes.forEach((mesh, i) => {
    if (mesh.visible) {
      // Different animation for each mesh
      if (i === 0) { // Hero mesh
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.003;
      } else if (i === 1) { // About group
        mesh.rotation.y += 0.002;
      } else if (i === 2) { // Skills group
        mesh.children.forEach((cube, i) => {
          cube.rotation.x += 0.003 * (i + 1);
          cube.rotation.y += 0.002 * (i + 1);
        });
      }
    }
  });
  
  // Inside animate() function, update the skills group animation
  if (meshes[2] && meshes[2].visible) { // Skills group
    meshes[2].rotation.y += 0.001; // Reduced rotation speed
    
    // Make the skills particles float with reduced movement
    meshes[2].children.forEach((mesh, i) => {
      const time = elapsedTime * mesh.userData.randomFactor;
      const originalPos = mesh.userData.originalPosition;
      
      // Reduced movement amount
      mesh.position.x = originalPos.x + Math.sin(time * 0.3) * 0.1;
      mesh.position.y = originalPos.y + Math.cos(time * 0.4) * 0.1;
      mesh.position.z = originalPos.z + Math.sin(time * 0.2) * 0.05;
      
      // Slower rotation
      mesh.rotation.x += 0.002 * mesh.userData.randomFactor;
      mesh.rotation.y += 0.002 * mesh.userData.randomFactor;
      
      // Reduced scale pulsation
      const scale = 1 + Math.sin(time) * 0.05;
      mesh.scale.set(scale, scale, scale);
    });
  }
  
  // Add this to your animation loop function
  // Update hero 3D elements scaling based on scroll
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    const scrollY = window.scrollY;
    const heroHeight = heroSection.offsetHeight;
    const heroCenter = heroSection.offsetTop + heroHeight / 2;
    const screenCenter = scrollY + window.innerHeight / 2;
    const distance = Math.abs(heroCenter - screenCenter);
    const maxDistance = heroHeight / 2 + window.innerHeight / 2;
    
    // Scale factor based on scroll distance
    const scale = 1 - Math.min(1, distance / maxDistance) * 0.3;
    
    // Apply subtle scaling to hero elements
    if (document.querySelector('.hero-visual')) {
      document.querySelector('.hero-visual').style.transform = `scale(${scale})`;
    }
  }
  
  // Rest of animation continues...
  
  renderer.render(scene, camera);
  
  // Add to your animate() function to animate the new project elements
  if (meshes[3] && meshes[3].visible) { // Projects group
    meshes[3].rotation.y += 0.001; // Very subtle overall rotation
    
    // Animate each project frame
    meshes[3].children.forEach((frame, i) => {
      // Find the decorative elements and rotate them
      frame.children.forEach(child => {
        if (child.userData.rotSpeed) {
          child.rotation.x += child.userData.rotSpeed;
          child.rotation.y += child.userData.rotSpeed * 0.7;
        }
      });
      
      // Subtle floating motion for the frame
      const time = elapsedTime * 0.5 + i;
      frame.position.y = Math.sin(time) * 0.1;
    });
  }
}

// Handle window resize
function onWindowResize() {
  // Update camera
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Replace entire init function with this robust version

function init() {
  // Check if Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('Three.js not loaded properly');
    return;
  }
  
  try {
    // Initialize Three.js scene
    initThree();
    
    // Setup event listeners
    setupEventListeners();
    
    // Create elements with error handling
    try {
      const atmosphereMaterial = createAtmosphere();
      console.log('Atmosphere created successfully');
    } catch (e) {
      console.error('Error creating atmosphere:', e);
    }
    
    try {
      const particlesObj = createParticles();
      console.log('Particles created successfully');
    } catch (e) {
      console.error('Error creating particles:', e);
    }
    
    try {
      const lightsArray = createLights();
      console.log('Lights created successfully');
    } catch (e) {
      console.error('Error creating lights:', e);
    }
    
    try {
      const objects = createSectionObjects();
      console.log('Section objects created successfully');
      
      // Replace white project panels
      createProjectsSection();
      
      // Set up animations
      setupScrollAnimations(objects);
    } catch (e) {
      console.error('Error creating section objects:', e);
    }
    
    try {
      const scroller = initSmoothScroll();
      console.log('Smooth scrolling initialized');
    } catch (e) {
      console.error('Error initializing smooth scroll:', e);
      // Fallback to basic scroll
      initScroll();
      console.log('Using fallback scroll');
    }
    
    try {
      initCustomCursor();
      console.log('Custom cursor initialized');
    } catch (e) {
      console.error('Error initializing custom cursor:', e);
    }
    
    // Ensure canvas visibility
    const canvas = document.getElementById('bg');
    if (canvas) {
      canvas.style.display = 'block';
      canvas.style.zIndex = '-1';
    }
    
    // Force a renderer size update
    onWindowResize();
    
    // Start animation loop
    animate();
    
    console.log('Three.js initialization complete');
  } catch (e) {
    console.error('Error in main init function:', e);
  }

  // Add hero 3D elements
  try {
    createHero3DElements();
    console.log('Hero 3D elements created successfully');
  } catch (e) {
    console.error('Error creating hero 3D elements:', e);
  }
  
  // Enhance other sections
  try {
    enhanceAboutSection();
    enhanceSkillsVisual();
    enhanceProjectsSection();
    console.log('Section enhancements applied');
  } catch (e) {
    console.error('Error enhancing sections:', e);
  }

  // Add this to your init function or call directly
  initHeaderScroll();

  // Add this to ensure 3D elements stay visible
  setupSectionVisibilityObserver();

  fixHeroElementsVisibility();

  // Initialize project card interactions
  try {
    initProjectCards();
    console.log('Project cards initialized');
  } catch (e) {
    console.error('Error initializing project cards:', e);
  }

  // Initialize contact form
  initContactForm();

  // Dispatch event when Three.js is initialized
  window.dispatchEvent(new CustomEvent('threeJsInitialized'));
}

// Additional check for WebGL support and canvas visibility
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch(e) {
    return false;
  }
}

// Troubleshooting if Three.js fails to initialize
function troubleshootThreeJS() {
  if (!checkWebGLSupport()) {
    console.error('WebGL not supported in this browser');
    document.body.innerHTML += '<div style="position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:1em;z-index:9999">Your browser does not support WebGL, which is required for the 3D background.</div>';
    return false;
  }
  
  const canvasElement = document.getElementById('bg');
  if (!canvasElement) {
    console.error('Canvas element #bg not found');
    return false;
  }
  
  return true;
}

// Enhance the about section
function enhanceAboutSection() {
  const aboutModel = document.querySelector('.about-model');
  if (!aboutModel) return;
  
  // Make sure the about model is more visually prominent
  aboutModel.style.height = '100%';
  aboutModel.style.minHeight = '350px';
}

// Enhanced skills section with improved text readability
function enhanceSkillsVisual() {
  // Further reduce the number of particles and move them back in Z space
  const skillCount = 20; // Reduced from 30
  
  if (meshes[2] && meshes[2].children.length < skillCount) {
    const skillGeometries = [
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.TetrahedronGeometry(0.5, 0),
      new THREE.IcosahedronGeometry(0.5, 0)
    ];

    const skillColors = [
      0xff3366, 0xffcc00, 0x0088ff, 0x00cc88, 0xaa66ff, 0x66ccff
    ];
    
    // Add more particles to the existing group
    const currentCount = meshes[2].children.length;
    for (let i = currentCount; i < skillCount; i++) {
      const geometryIndex = Math.floor(Math.random() * skillGeometries.length);
      const colorIndex = Math.floor(Math.random() * skillColors.length);
      
      const geometry = skillGeometries[geometryIndex];
      const material = new THREE.MeshStandardMaterial({
        color: skillColors[colorIndex],
        metalness: 0.3,
        roughness: 0.5,
        wireframe: Math.random() > 0.6, // More wireframes
        transparent: true,
        opacity: 0.2, // Significantly reduced opacity
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position further away from text with better spacing
      const radius = 5 + Math.random() * 3.5; // Larger radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
      mesh.position.z = -2 - Math.random() * 4; // Push back in Z space
      
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;
      
      mesh.userData.originalPosition = mesh.position.clone();
      mesh.userData.randomFactor = Math.random() * 0.2 + 0.1; // Even slower movement
      
      meshes[2].add(mesh);
    }
  }
  
  // Make existing particles more transparent
  if (meshes[2]) {
    meshes[2].children.forEach(mesh => {
      if (mesh.material) {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.2; // Further reduced opacity
        mesh.position.z -= 2; // Push all existing particles back
      }
    });
    
    // Adjust the entire skills group position
    meshes[2].position.z = 10; // Move further back
  }
}

if (meshes[2] && meshes[2].visible) { // Skills group
  meshes[2].rotation.y += 0.001; // Reduced rotation speed
  
  // Make the skills particles float with reduced movement
  meshes[2].children.forEach((mesh, i) => {
    const time = elapsedTime * mesh.userData.randomFactor;
    const originalPos = mesh.userData.originalPosition;
    
    // Reduced movement amount
    mesh.position.x = originalPos.x + Math.sin(time * 0.3) * 0.1;
    mesh.position.y = originalPos.y + Math.cos(time * 0.4) * 0.1;
    mesh.position.z = originalPos.z + Math.sin(time * 0.2) * 0.05;
    
    // Slower rotation
    mesh.rotation.x += 0.002 * mesh.userData.randomFactor;
    mesh.rotation.y += 0.002 * mesh.userData.randomFactor;
    
    // Reduced scale pulsation
    const scale = 1 + Math.sin(time) * 0.05;
    mesh.scale.set(scale, scale, scale);
  });
}

// Enhance the projects section 3D elements
function enhanceProjectsSection() {
  // Adjust existing projects visuals
  if (meshes[3]) {
    // Make the panels more spread out to fill space
    meshes[3].children.forEach((panel, i) => {
      // Spread panels wider
      panel.position.x = (i - 1) * 6; // Increase from 5 to 6
      panel.rotation.y = Math.PI / 6 * (i - 1); // More angled
      
      // Add glow effect
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x64ffda,
        transparent: true,
        opacity: 0.2
      });
      
      const glowGeometry = new THREE.PlaneGeometry(4.2, 2.4);
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.z = -0.1;
      
      panel.add(glowMesh);
    });
  }
}

// Header scroll effect
function initHeaderScroll() {
  const header = document.querySelector('header');
  
  if (!header) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Add this function to ensure 3D elements stay visible
function setupSectionVisibilityObserver() {
  const sections = document.querySelectorAll('.section');
  
  // Use IntersectionObserver to detect when sections enter viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        
        // Make corresponding 3D objects visible again if they were hidden
        switch(sectionId) {
          case 'hero':
            if (meshes[0]) meshes[0].visible = true;
            break;
          case 'about':
            if (meshes[1]) meshes[1].visible = true;
            break;
          case 'skills':
            if (meshes[2]) meshes[2].visible = true;
            break;
          case 'projects':
            if (meshes[3]) meshes[3].visible = true;
            break;
          case 'contact':
            if (meshes[4]) meshes[4].visible = true;
            break;
        }
      }
    });
  }, { threshold: 0.1 });
  
  // Observe all sections
  sections.forEach(section => {
    observer.observe(section);
  });
}

// Update hero elements to stay visible
function fixHeroElementsVisibility() {
  // Find the hero section and visual container
  const heroSection = document.getElementById('hero');
  const heroVisual = document.querySelector('.hero-visual');
  
  if (!heroSection || !heroVisual) return;
  
  // Create a mutation observer to detect if the canvas is removed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.removedNodes.length) {
        // Check if our canvas was removed
        const canvasRemoved = Array.from(mutation.removedNodes).some(
          node => node.nodeName === 'CANVAS'
        );
        
        if (canvasRemoved) {
          console.log('Hero canvas was removed, recreating...');
          // Recreate the hero elements
          createHero3DElements();
        }
      }
    });
  });
  
  // Start observing
  observer.observe(heroVisual, { childList: true });
}

// Start everything when the page loads with additional checks
window.addEventListener('load', () => {
  console.log('Page loaded, checking WebGL support...');
  if (troubleshootThreeJS()) {
    console.log('WebGL supported, initializing 3D scene...');
    init();
  }
});

// Replace the white project panels with better elements

// Projects section object - Updated to avoid white boxes
function createProjectsSection() {
  // Replace existing project panels if they exist
  if (meshes[3]) {
    // Remove old panels
    while(meshes[3].children.length > 0) { 
      meshes[3].remove(meshes[3].children[0]); 
    }
    
    // Create new visually appealing elements
    for (let i = 0; i < 3; i++) {
      // Create frame instead of solid panel
      const frameGroup = new THREE.Group();
      
      // Semi-transparent dark panel with accent color glow
      const panelGeometry = new THREE.PlaneGeometry(4, 2.25);
      const panelMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0a0a14,
        metalness: 0.2,
        roughness: 0.8,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      
      // Add glowing border effect
      const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({
        color: 0x64ffda,
        transparent: true,
        opacity: 0.8
      });
      
      const borderEdges = new THREE.LineSegments(borderGeometry, borderMaterial);
      borderEdges.scale.set(1.02, 1.02, 1.02);
      
      // Add decorative elements
      const decorSize = 0.2;
      const decorations = [
        { pos: [-1.9, 1.0, 0.1], size: decorSize },
        { pos: [1.9, 1.0, 0.1], size: decorSize },
        { pos: [-1.9, -1.0, 0.1], size: decorSize },
        { pos: [1.9, -1.0, 0.1], size: decorSize }
      ];
      
      decorations.forEach(decor => {
        const decorGeometry = new THREE.IcosahedronGeometry(decor.size, 0);
        const decorMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x64ffda,
          metalness: 0.8,
          roughness: 0.2,
          emissive: 0x64ffda,
          emissiveIntensity: 0.2
        });
        
        const decorMesh = new THREE.Mesh(decorGeometry, decorMaterial);
        decorMesh.position.set(...decor.pos);
        decorMesh.rotation.z = Math.random() * Math.PI;
        decorMesh.userData.rotSpeed = 0.005 + Math.random() * 0.01;
        
        frameGroup.add(decorMesh);
      });
      
      // Add all elements to frame
      frameGroup.add(panel);
      frameGroup.add(borderEdges);
      
      // Position the frame
      frameGroup.position.x = (i - 1) * 6;
      frameGroup.position.z = 0.2;
      frameGroup.rotation.y = Math.PI / 8 * (i - 1);
      
      meshes[3].add(frameGroup);
    }
  }
}

// Add this function to your script.js file

// Enhanced project card interactions
function initProjectCards() {
  const projectCards = document.querySelectorAll('.project-card');
  
  projectCards.forEach(card => {
    // Mouse movement rotation effect
    card.addEventListener('mousemove', (e) => {
      // Get the card's dimensions and position
      const rect = card.getBoundingClientRect();
      
      // Calculate how far the mouse is from the center as a percentage
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      
      // Calculate rotation values (more subtle)
      const rotateY = x * 5; // Max 5 degrees rotation on Y axis
      const rotateX = -y * 5; // Max 5 degrees rotation on X axis
      
      // Apply the transformation
      card.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateZ(5px)`;
      card.classList.add('animated');
    });
    
    // Reset card when mouse leaves
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0)';
      card.classList.remove('animated');
      
      // Add slight delay before removing the 'animated' class to smooth transition
      setTimeout(() => {
        card.classList.remove('animated');
      }, 300);
    });
    
    // Button hover effects
    const buttons = card.querySelectorAll('.project-link');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        // Pause card rotation while hovering on button
        card.style.transition = 'transform 0.2s';
      });
      
      button.addEventListener('mouseleave', () => {
        // Resume card rotation after leaving button
        card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      });
    });
  });
}

// Contact Form handling
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  
  // Create a success message element
  const successMessage = document.createElement('div');
  successMessage.className = 'form-success';
  successMessage.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <h3>Message Sent!</h3>
    <p>Thank you for reaching out. I'll get back to you as soon as possible.</p>
  `;
  
  form.parentNode.style.position = 'relative';
  form.parentNode.appendChild(successMessage);
  
  // Form submission handling
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Basic validation
    let isValid = true;
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        isValid = false;
        input.parentNode.classList.add('form-invalid');
        
        // Remove animation class after animation completes
        setTimeout(() => {
          input.parentNode.classList.remove('form-invalid');
        }, 300);
      }
    });
    
    if (isValid) {
      // In a real implementation, you would send the form data to your server here
      // For demo purposes, we'll just show the success message
      
      // Submit button animation
      const submitBtn = form.querySelector('.submit-btn');
      submitBtn.innerHTML = '<span>Sending...</span>';
      submitBtn.disabled = true;
      
      // Simulate form submission delay
      setTimeout(() => {
        // Show success message
        successMessage.classList.add('show');
        
        // Reset form after success
        form.reset();
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          successMessage.classList.remove('show');
          submitBtn.innerHTML = `
            <span>Send Message</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          `;
          submitBtn.disabled = false;
        }, 5000);
      }, 1500);
    }
  });
  
  // Input focusing effects
  const inputs = form.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    // Add focused class when input is focused
    input.addEventListener('focus', () => {
      input.parentNode.classList.add('focused');
    });
    
    // Remove focused class when input loses focus
    input.addEventListener('blur', () => {
      input.parentNode.classList.remove('focused');
    });
  });
}

// Loading animation handler
function handlePageLoad() {
  const loaderWrapper = document.querySelector('.loader-wrapper');
  
  if (!loaderWrapper) return;

  // Make sure the loader is visible immediately
  loaderWrapper.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Keep track of loading states
  let assetsLoaded = false;
  let threeJsReady = false;
  
  // Function to hide the loader when everything is ready
  function hideLoader() {
    if (assetsLoaded && threeJsReady) {
      setTimeout(() => {
        loaderWrapper.classList.add('fade-out');
        document.body.style.overflow = '';
        
        // Remove from DOM after animation completes
        setTimeout(() => {
          if (loaderWrapper.parentNode) {
            loaderWrapper.parentNode.removeChild(loaderWrapper);
          }
        }, 800);
      }, 300);
    }
  }
  
  // Set a maximum wait time (8 seconds) in case something fails to load
  setTimeout(() => {
    assetsLoaded = true;
    hideLoader();
  }, 8000);
  
  // Mark document as loaded
  window.addEventListener('load', () => {
    assetsLoaded = true;
    hideLoader();
  });
  
  // Create a custom event for Three.js to signal it's ready
  window.addEventListener('threeJsInitialized', () => {
    threeJsReady = true;
    hideLoader();
  });
}

// Call this immediately
handlePageLoad();