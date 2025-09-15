import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

console.log('Script starting...');
console.log('Three.js version:', THREE.REVISION);
console.log('TEST: JavaScript is running!');

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create an AudioListener
const listener = new THREE.AudioListener();
// Add the listener to the camera
camera.add(listener);
// Create an AudioLoader
const audioLoader = new THREE.AudioLoader();

// Create a global (non-positional) audio source
const sound = new THREE.Audio(listener);

// Load the audio file
audioLoader.load(
  './audio.mp3', // Path to your MP3 file
  function (buffer) {
    // This function is called when the audio is loaded successfully
    // Set the loaded buffer to the sound object
    sound.setBuffer(buffer);
    // Set other properties
    sound.setLoop(true); // Loop the audio
    sound.setVolume(0.5); // Set the volume (0.0 to 1.0)
    console.log('Audio loaded and ready to play');
  },
  undefined, // Optional: onProgress callback
  function (error) {
    console.error('An error occurred loading the audio file:', error);
  }
);
const renderer = new THREE.WebGLRenderer({ 
  canvas: document.getElementById('three-canvas'),
  antialias: true,
  alpha: true
});

console.log('Scene created:', scene);
console.log('Camera created:', camera);
console.log('Renderer created:', renderer);
console.log('Canvas element:', document.getElementById('three-canvas'));

// Configure renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x1a1a1a, 1); // Dark grey background (0.1 brightness)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Post-processing setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// SSAO Pass - turned up version
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16 * 0.9;
ssaoPass.kernelSize = 16;
ssaoPass.minDistance = 0.001 * 0.9;
ssaoPass.maxDistance = 0.1 * 0.9;
ssaoPass.output = SSAOPass.OUTPUT.Default;
composer.addPass(ssaoPass);

// Add OutputPass to fix rendering
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Add camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI;

// Load the GLB model
const loader = new GLTFLoader();
let character = null;
let headBone = null;
let neckBone = null;
let headRotationOffset = 0;
let neckRotationOffset = 0;
let originalHeadRotationX = 0;
let originalNeckRotationX = 0;

console.log('Starting GLB load...');

// Test if the file exists
fetch('./ManInSuit.glb')
  .then(response => {
    console.log('GLB file response:', response.status, response.statusText);
    if (response.ok) {
      console.log('GLB file is accessible');
    } else {
      console.error('GLB file not accessible:', response.status);
    }
  })
  .catch(error => {
    console.error('Error checking GLB file:', error);
  });

try {
  loader.load('./ManInSuit.glb', (gltf) => {
  character = gltf.scene;
  
  console.log('GLTF loaded:', gltf);
  console.log('Character scene:', character);
  console.log('Character children:', character.children);
  
              // Check for bones/skeleton and find head/neck bones
              console.log('=== BONE DETECTION START ===');
              character.traverse((child) => {
                if (child.isMesh) {
                  console.log('Found mesh:', child.name, child.geometry);
                  if (child.skeleton) {
                    console.log('Mesh has skeleton with', child.skeleton.bones.length, 'bones');
                    
                    // List ALL bones to see what's available
                    child.skeleton.bones.forEach((bone, index) => {
                      console.log(`Bone ${index}: "${bone.name}"`);
                    });
                    
                    // Find head and neck bones - try different variations
                    child.skeleton.bones.forEach(bone => {
                      const boneNameLower = bone.name.toLowerCase();
                      if (boneNameLower.includes('head') || boneNameLower.includes('skull') || boneNameLower.includes('cranium')) {
                        headBone = bone;
                        originalHeadRotationX = bone.rotation.x;
                        console.log('✅ Found head bone:', bone.name, 'Original X rotation:', originalHeadRotationX);
                      }
                      if (boneNameLower.includes('neck') || boneNameLower.includes('cervical') || boneNameLower.includes('spine1') || boneNameLower.includes('spine_1')) {
                        neckBone = bone;
                        originalNeckRotationX = bone.rotation.x;
                        console.log('✅ Found neck bone:', bone.name, 'Original X rotation:', originalNeckRotationX);
                      }
                    });
                  }
                }
                if (child.isBone) {
                  console.log('Found direct bone:', child.name, child.position);
                  // Also check direct bone children
                  const boneNameLower = child.name.toLowerCase();
                  if (boneNameLower.includes('head') || boneNameLower.includes('skull') || boneNameLower.includes('cranium')) {
                    headBone = child;
                    originalHeadRotationX = child.rotation.x;
                    console.log('✅ Found head bone (direct):', child.name, 'Original X rotation:', originalHeadRotationX);
                  }
                  if (boneNameLower.includes('neck') || boneNameLower.includes('cervical') || boneNameLower.includes('spine1') || boneNameLower.includes('spine_1')) {
                    neckBone = child;
                    originalNeckRotationX = child.rotation.x;
                    console.log('✅ Found neck bone (direct):', child.name, 'Original X rotation:', originalNeckRotationX);
                  }
                }
              });
              console.log('=== BONE DETECTION END ===');
              console.log('Head bone found:', !!headBone);
              console.log('Neck bone found:', !!neckBone);
  
  // Calculate the bounding box of the character
  const box = new THREE.Box3().setFromObject(character);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  console.log('Character bounds:', {
    size: size,
    center: center,
    min: box.min,
    max: box.max
  });
  
  // Check if the bounding box is valid
  if (size.x === 0 && size.y === 0 && size.z === 0) {
    console.warn('Character has zero size - might be empty or not visible');
    // Try to get bounds from individual meshes
    character.traverse((child) => {
      if (child.isMesh) {
        const meshBox = new THREE.Box3().setFromObject(child);
        const meshSize = meshBox.getSize(new THREE.Vector3());
        console.log('Individual mesh bounds:', child.name, meshSize);
      }
    });
  }
  
  // Position the character on the ground
  character.position.set(0, -1, 0);
  
  // Position camera to see the character
  camera.position.set(0, 2, 5);
  camera.lookAt(0, 0, 0);
  
            // Check for animations and play them
            if (gltf.animations && gltf.animations.length > 0) {
              console.log('Found animations:', gltf.animations.length);
              const mixer = new THREE.AnimationMixer(character);
              
              // Play the base animation
              const baseAction = mixer.clipAction(gltf.animations[0]);
              baseAction.play();
              console.log('Playing base animation:', gltf.animations[0].name);

              // Create additive animations for head and neck rotation
              if (headBone) {
                // Create a simple additive clip for head rotation
                const headClip = new THREE.AnimationClip('headRotation', -1, [
                  new THREE.NumberKeyframeTrack(
                    headBone.name + '.rotation[x]',
                    [0, 1],
                    [0, 0]
                  )
                ]);
                THREE.AnimationUtils.makeClipAdditive(headClip);
                const headAction = mixer.clipAction(headClip);
                headAction.weight = 0;
                headAction.play();
                character.headAction = headAction;
                console.log('Created head additive action for bone:', headBone.name);
              }

              if (neckBone) {
                // Create a simple additive clip for neck rotation
                const neckClip = new THREE.AnimationClip('neckRotation', -1, [
                  new THREE.NumberKeyframeTrack(
                    neckBone.name + '.rotation[x]',
                    [0, 1],
                    [0, 0]
                  )
                ]);
                THREE.AnimationUtils.makeClipAdditive(neckClip);
                const neckAction = mixer.clipAction(neckClip);
                neckAction.weight = 0;
                neckAction.play();
                character.neckAction = neckAction;
                console.log('Created neck additive action for bone:', neckBone.name);
              }

              // Store mixer for animation loop
              character.mixer = mixer;
            } else {
              console.log('No animations found');
            }
  
  console.log('Character original size:', size);
  console.log('Camera positioned at:', camera.position);
  
              // Enable shadows on the character and inspect material properties
              character.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                  
                  // Debug material properties
                  if (child.material) {
                    console.log('Material type:', child.material.type);
                    console.log('Material name:', child.material.name);
                    console.log('Available material properties:', Object.keys(child.material));
                    
                    // Check if it's a MeshStandardMaterial or MeshPhysicalMaterial
                    if (child.material.type === 'MeshStandardMaterial' || child.material.type === 'MeshPhysicalMaterial') {
                      console.log('Standard/Physical material detected');
                      console.log('Current roughness:', child.material.roughness);
                      console.log('Current metalness:', child.material.metalness);
                      console.log('Current IOR:', child.material.ior);
                      console.log('Current sheen:', child.material.sheen);
                    } else {
                      console.log('Non-standard material type:', child.material.type);
                    }
                    
                    // Set up material properties for sheen, IOR, and roughness
                    if (child.material.type === 'MeshStandardMaterial' || child.material.type === 'MeshPhysicalMaterial') {
                      // Convert to MeshPhysicalMaterial if needed for sheen support
                      if (child.material.type === 'MeshStandardMaterial') {
                        const physicalMaterial = new THREE.MeshPhysicalMaterial();
                        // Copy only the basic properties that are safe to copy
                        physicalMaterial.color = child.material.color.clone();
                        physicalMaterial.map = child.material.map;
                        physicalMaterial.normalMap = child.material.normalMap;
                        physicalMaterial.roughness = child.material.roughness || 0.5;
                        physicalMaterial.metalness = child.material.metalness || 0.0;
                        child.material = physicalMaterial;
                      }
                      
                      child.material.sheen = 0.5;
                      child.material.sheenRoughness = 0.4;
                      child.material.sheenColor = new THREE.Color(0xffffff); // White by default
                      child.material.ior = 1.5;
                      child.material.roughness = 0.9;
                      child.material.needsUpdate = true;
                    }
                  }
                }
              });
  
  // Add character to scene
  scene.add(character);
  console.log('ManInSuit character loaded successfully!');
  console.log('Scene children count:', scene.children.length);
}, undefined, (error) => {
  console.error('Error loading ManInSuit character:', error);
});
} catch (e) {
  console.error('Caught error in loader:', e);
}

// Create a simple ground plane (opaque for shadows)
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshLambertMaterial({ 
  color: 0x4d4d4d
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

// Simple ambient lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

// Add a directional light for better visibility and shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
directionalLight.position.set(4, 13, 6);
directionalLight.castShadow = true;

// Configure shadow properties
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;

scene.add(directionalLight);

// Add rim light for edge lighting
const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(8, 6, -11);
scene.add(rimLight);

// Position camera
camera.position.set(0, 0, 5);

// Animation variables
let isRotating = true;

// Animation loop
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = clock.getDelta();
  
  // Update controls
  controls.update();
  
              if (character) {
                // Update character animations
                if (character.mixer) {
                  character.mixer.update(deltaTime);
                }
              }
              
              // Apply additive animation weights based on slider values
              if (character.headAction) {
                character.headAction.weight = Math.abs(headRotationOffset) / 1.57; // Normalize to 0-1
                // Update the keyframe track with the slider value
                const track = character.headAction.getClip().tracks[0];
                if (track) {
                  track.values[1] = headRotationOffset;
                }
              }
              if (character.neckAction) {
                character.neckAction.weight = Math.abs(neckRotationOffset) / 1.57; // Normalize to 0-1
                // Update the keyframe track with the slider value
                const track = character.neckAction.getClip().tracks[0];
                if (track) {
                  track.values[1] = neckRotationOffset;
                }
              }
  
  composer.render();
}

// Rim light intensity control - Removed

// Material property controls - Commented out
/*
document.getElementById('sheen-weight').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (character) {
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        // Ensure material supports sheen properties
        if (child.material.type === 'MeshStandardMaterial') {
          const physicalMaterial = new THREE.MeshPhysicalMaterial();
          // Copy only the basic properties that are safe to copy
          physicalMaterial.color = child.material.color.clone();
          physicalMaterial.map = child.material.map;
          physicalMaterial.normalMap = child.material.normalMap;
          physicalMaterial.roughness = child.material.roughness || 0.5;
          physicalMaterial.metalness = child.material.metalness || 0.0;
          child.material = physicalMaterial;
        }
        child.material.sheen = value;
        child.material.needsUpdate = true;
      }
    });
  }
  document.getElementById('sheen-weight-value').textContent = value.toFixed(1);
});

document.getElementById('sheen-roughness').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (character) {
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        // Ensure material supports sheen properties
        if (child.material.type === 'MeshStandardMaterial') {
          const physicalMaterial = new THREE.MeshPhysicalMaterial();
          // Copy only the basic properties that are safe to copy
          physicalMaterial.color = child.material.color.clone();
          physicalMaterial.map = child.material.map;
          physicalMaterial.normalMap = child.material.normalMap;
          physicalMaterial.roughness = child.material.roughness || 0.5;
          physicalMaterial.metalness = child.material.metalness || 0.0;
          child.material = physicalMaterial;
        }
        child.material.sheenRoughness = value;
        child.material.needsUpdate = true;
      }
    });
  }
  document.getElementById('sheen-roughness-value').textContent = value.toFixed(1);
});

document.getElementById('sheen-color').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (character) {
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        // Ensure material supports sheen properties
        if (child.material.type === 'MeshStandardMaterial') {
          const physicalMaterial = new THREE.MeshPhysicalMaterial();
          // Copy only the basic properties that are safe to copy
          physicalMaterial.color = child.material.color.clone();
          physicalMaterial.map = child.material.map;
          physicalMaterial.normalMap = child.material.normalMap;
          physicalMaterial.roughness = child.material.roughness || 0.5;
          physicalMaterial.metalness = child.material.metalness || 0.0;
          child.material = physicalMaterial;
        }
        // Ensure sheenColor exists and is a Color object
        if (!child.material.sheenColor) {
          child.material.sheenColor = new THREE.Color(0x000000);
        }
        // Convert 0-1 to a grey color (0x000000 to 0xffffff)
        const greyValue = Math.floor(value * 255);
        const hexColor = (greyValue << 16) | (greyValue << 8) | greyValue;
        child.material.sheenColor.setHex(hexColor);
        child.material.needsUpdate = true;
      }
    });
  }
  document.getElementById('sheen-color-value').textContent = value.toFixed(1);
});

document.getElementById('ior').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (character) {
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        // Ensure material supports IOR properties
        if (child.material.type === 'MeshStandardMaterial') {
          const physicalMaterial = new THREE.MeshPhysicalMaterial();
          // Copy only the basic properties that are safe to copy
          physicalMaterial.color = child.material.color.clone();
          physicalMaterial.map = child.material.map;
          physicalMaterial.normalMap = child.material.normalMap;
          physicalMaterial.roughness = child.material.roughness || 0.5;
          physicalMaterial.metalness = child.material.metalness || 0.0;
          child.material = physicalMaterial;
        }
        child.material.ior = value;
        child.material.needsUpdate = true;
      }
    });
  }
  document.getElementById('ior-value').textContent = value.toFixed(1);
});

document.getElementById('roughness').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (character) {
    character.traverse((child) => {
      if (child.isMesh && child.material) {
        // Ensure material supports roughness properties
        if (child.material.type === 'MeshStandardMaterial') {
          const physicalMaterial = new THREE.MeshPhysicalMaterial();
          // Copy only the basic properties that are safe to copy
          physicalMaterial.color = child.material.color.clone();
          physicalMaterial.map = child.material.map;
          physicalMaterial.normalMap = child.material.normalMap;
          physicalMaterial.roughness = child.material.roughness || 0.5;
          physicalMaterial.metalness = child.material.metalness || 0.0;
          child.material = physicalMaterial;
        }
        child.material.roughness = value;
        child.material.needsUpdate = true;
      }
    });
  }
  document.getElementById('roughness-value').textContent = value.toFixed(1);
});
*/

// Event listeners for lighting controls - Commented out for clean checkin
/*
document.getElementById('ambient-intensity').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  ambientLight.intensity = value;
  document.getElementById('ambient-value').textContent = value.toFixed(1);
});

document.getElementById('directional-intensity').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  directionalLight.intensity = value;
  document.getElementById('directional-value').textContent = value.toFixed(1);
});

document.getElementById('rim-intensity').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  rimLight.intensity = value;
  document.getElementById('rim-value').textContent = value.toFixed(1);
});

document.getElementById('ssao-intensity').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  ssaoPass.kernelRadius = 16 * value;
  ssaoPass.minDistance = 0.001 * value;
  ssaoPass.maxDistance = 0.1 * value;
  document.getElementById('ssao-value').textContent = value.toFixed(1);
});

// Rim light position controls
document.getElementById('light-rotation-x').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  rimLight.position.x = value;
  document.getElementById('light-rotation-x-value').textContent = value.toFixed(1);
});

document.getElementById('light-rotation-y').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  rimLight.position.y = value;
  document.getElementById('light-rotation-y-value').textContent = value.toFixed(1);
});

document.getElementById('light-rotation-z').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  rimLight.position.z = value;
  document.getElementById('light-rotation-z-value').textContent = value.toFixed(1);
});

// Background brightness control
document.getElementById('background-brightness').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  const greyValue = Math.floor(value * 255);
  const hexColor = (greyValue << 16) | (greyValue << 8) | greyValue;
  renderer.setClearColor(hexColor, 1);
  document.getElementById('background-value').textContent = value.toFixed(1);
});

// Ground brightness control
document.getElementById('ground-brightness').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  const greyValue = Math.floor(value * 255);
  const hexColor = (greyValue << 16) | (greyValue << 8) | greyValue;
  groundMaterial.color.setHex(hexColor);
  document.getElementById('ground-brightness-value').textContent = value.toFixed(1);
});
*/

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();

// Play audio on button click - wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  const playBtn = document.getElementById('play-audio-btn');
  console.log('Button found:', !!playBtn);
  
  if (playBtn) {
    playBtn.addEventListener('click', function() {
      console.log('BUTTON CLICKED!');
      console.log('Sound object:', sound);
      console.log('Sound buffer:', sound.buffer);
      console.log('Sound isPlaying:', sound.isPlaying);
      
      if (sound.isPlaying) {
        console.log('Stopping audio...');
        sound.stop(); // Stop if already playing
        this.textContent = '🎵 Play Audio';
      } else {
        console.log('Playing audio...');
        try {
          sound.play(); // Play if not playing
          this.textContent = '⏸️ Stop Audio';
          console.log('Audio play() called successfully');
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }
    });
  } else {
    console.error('Play audio button not found!');
  }
});

// Volume slider control
document.getElementById('volume-slider').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  sound.setVolume(value);
  document.getElementById('volume-value').textContent = value.toFixed(1);
});

// Head rotation control
document.getElementById('head-rotation').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  headRotationOffset = value;
  console.log('Head rotation offset set to:', value);
  document.getElementById('head-rotation-value').textContent = value.toFixed(2);
});

// Neck rotation control
document.getElementById('neck-rotation').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  neckRotationOffset = value;
  console.log('Neck rotation offset set to:', value);
  document.getElementById('neck-rotation-value').textContent = value.toFixed(2);
});


