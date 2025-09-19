import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

// === Scene & Camera ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(2, 1.5, 5);
camera.lookAt(0, 0, 0);

// === Renderer ===
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: true,
    alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// === Controls ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// === Lights ===
scene.add(new THREE.AmbientLight(0xffffff, 5.0));
const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight1.position.set(5, 10, 7);
scene.add(dirLight1);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight2.position.set(-5, 5, 5);
scene.add(dirLight2);
const dirLight3 = new THREE.DirectionalLight(0xffffff, 8);
dirLight3.position.set(-5, 5, -5);
scene.add(dirLight3);

// === Load Magic 8-Ball ===
let die = null;
let ballParent = null;
let mixer = null;
let actions = [];

const loader = new GLTFLoader();
const modelPath = 'assets/magic8ball.glb';
console.log('Loading GLB file from:', modelPath);

loader.load(
    modelPath,
    (gltf) => {
        console.log('GLB loaded successfully:', gltf);
        ballParent = gltf.scene;
        scene.add(ballParent);

        // Find die and hide it
        die = ballParent.getObjectByName('Die') || ballParent.getObjectByName('die');
        if (!die) {
            ballParent.traverse((child) => {
                if (child.isMesh && !die) die = child;
            });
        }
        if (die) die.visible = false;
        if (!die) die = ballParent; // fallback

        // Enhance glass material
        const glass = ballParent.getObjectByName('Glass');
        if (glass) {
            glass.material = new THREE.MeshPhysicalMaterial({
                color: 0x88aadd,
                transparent: true,
                opacity: 0.1,
                transmission: 1.0,
                roughness: 0.05,
                metalness: 0.0,
                clearcoat: 0.3,
                clearcoatRoughness: 0.2,
                ior: 1.33,
                thickness: 0.1,
                specularIntensity: 0.5,
                envMapIntensity: 0.8,
                side: THREE.DoubleSide,
                depthWrite: false,
                premultipliedAlpha: true,
            });
        }

        // === Animations ===
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(ballParent);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                actions.push(action);
            });
            console.log('🎬 Found', gltf.animations.length, 'animation clips');
        }

        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        console.log('Magic 8-Ball loaded.');
    },
    (progress) => {
        if (progress.total)
            console.log(
                'Loading progress:',
                ((progress.loaded / progress.total) * 100).toFixed(2) + '%'
            );
    },
    (err) => console.error('Error loading model:', err)
);

// === Animation Helpers ===
function shakeObject(object, intensity = 0.01, duration = 0.2) {
    if (!object) return;
    const originalPosition = object.position.clone();
    const shakeInterval = setInterval(() => {
        object.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
        object.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;
    }, 16);

    setTimeout(() => {
        clearInterval(shakeInterval);
        object.position.copy(originalPosition);
    }, duration * 1000);
}

// === Spin Function ===
let isAnimating = false;
function triggerSpin() {
    if (!die || isAnimating) return;
    isAnimating = true;

    if (ballParent) shakeObject(ballParent, 0.03, 0.3);

    // Remove unused quaternion variables since we're using rotation directly

    // Create a timeline for more control over the animation
    const tl = gsap.timeline({
        onComplete() {
            if (actions.length) {
                actions.forEach((a) => a.stop());
                const action = actions[Math.floor(Math.random() * actions.length)];
                action.reset();
                action.setLoop(THREE.LoopOnce, 0);
                action.clampWhenFinished = true;
                action.timeScale = 0.5;
                action.play();
            }
            isAnimating = false;
        }
    });

    // First phase: Super fast initial spin with strong ease-in
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 8, // More initial rotation
        duration: 0.2,
        ease: 'power4.in',
        onUpdate: () => {
            die.quaternion.setFromEuler(die.rotation);
        }
    });
    
    // Second phase: Fast spin with slight deceleration
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 12, // Significant additional rotation
        duration: 0.4,
        ease: 'sine.out',
        onUpdate: () => {
            die.quaternion.setFromEuler(die.rotation);
        }
    }, '-=0.05');
    
    // Final phase: Slow down and settle with bounce
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 6, // Final rotation
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)', // Bouncy finish
        onUpdate: () => {
            die.quaternion.setFromEuler(die.rotation);
        }
    }, '-=0.1');
}

// Configure orbit controls for up-down rotation and zoom
controls.enablePan = false;  // Disable panning
controls.enableZoom = true;  // Enable zooming (for pinch-to-zoom)
controls.enableRotate = true; // Enable rotation
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1.0; // Increased zoom speed for better responsiveness

// Configure touch controls
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
};
controls.screenSpacePanning = true;

// Enable zoom and set up constraints
controls.enableZoom = true;
controls.zoomSpeed = 1.5; // Increase zoom speed for better responsiveness
controls.minDistance = 2;
controls.maxDistance = 10;

// Add touch event listeners for better iOS handling
renderer.domElement.style.touchAction = 'none';
renderer.domElement.addEventListener('gesturestart', (e) => {
    e.preventDefault();
    touchMoved = true;
});

renderer.domElement.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    touchMoved = true;
});

renderer.domElement.addEventListener('gestureend', (e) => {
    e.preventDefault();
    touchMoved = true;
});

// Standard mouse controls
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
};

// Set up zoom constraints
controls.minDistance = 2;  // Minimum zoom distance
controls.maxDistance = 10; // Maximum zoom distance

// Set up rotation constraints for up-down rotation only (around X-axis)
controls.minPolarAngle = 0; // Allow looking all the way up
controls.maxPolarAngle = Math.PI; // Allow looking all the way down
controls.minAzimuthAngle = 0; // Prevent horizontal rotation
controls.maxAzimuthAngle = 0; // Prevent horizontal rotation

// Set up touch controls
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,  // Single finger for up-down rotation
    TWO: THREE.TOUCH.DOLLY_PAN  // Two fingers for pinch-to-zoom
};

// Lock to Y-axis rotation only (up-down)
const originalUpdate = controls.update;
controls.update = function() {
    originalUpdate.call(this);

    if (!ballParent) return;

    // Get the camera's up vector
    const up = new THREE.Vector3(0, 1, 0);

    // Make camera look at the ball, but only allow up/down movement
    camera.lookAt(ballParent.position);

    // Lock camera's up vector to prevent tilting
    camera.up.copy(up);

    // Force camera to maintain distance from ball
    const distance = 5; // Adjust this value as needed
    camera.position.sub(controls.target);
    camera.position.setLength(distance);
    camera.position.add(ballParent.position);
    controls.target.copy(ballParent.position);
};

// === Desktop double-click ===
renderer.domElement.addEventListener('dblclick', triggerSpin);

// === Mobile Interactions ===
let touchStartTime = 0;
let lastInteractionTime = 0;
const interactionCooldown = 1000; // ms
const tapTimeThreshold = 300; // ms

// Haptic feedback helper
function triggerHapticFeedback() {
    if ('vibrate' in navigator) {
        navigator.vibrate = navigator.vibrate ||
                           navigator.webkitVibrate ||
                           navigator.mozVibrate ||
                           navigator.msVibrate;
        navigator.vibrate(50); // 50ms vibration
    }
}

// Visual feedback helper
function triggerVisualFeedback() {
    if (!ballParent) return;

    // Add a subtle scale effect
    gsap.to(ballParent.scale, {
        x: 1.05,
        y: 1.05,
        z: 1.05,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
    });
}

// Touch state tracking
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;
const moveThreshold = 10; // pixels of movement allowed before considering it a swipe

// Touch start handler
renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        // Single touch - handle rotation/tap
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
    } else if (e.touches.length === 2) {
        // Two touches - handle pinch zoom
        touchMoved = true;
    }
}, { passive: true });

// Touch move handler
renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        // Single touch - check for swipe
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);

        if (dx > moveThreshold || dy > moveThreshold) {
            touchMoved = true;
        }
    }
}, { passive: true });

// Touch end handler
renderer.domElement.addEventListener('touchend', () => {
    const now = Date.now();

    // Only trigger if it was a quick tap (not a swipe) and not during cooldown
    if (!touchMoved && (now - touchStartTime) < tapTimeThreshold && (now - lastInteractionTime) >= interactionCooldown) {
        triggerHapticFeedback();
        triggerVisualFeedback();
        triggerSpin();
        lastInteractionTime = now;
    }

    // Reset touch state
    touchMoved = false;
});

// Click handler for desktop
document.addEventListener('click', (e) => {
    // Only handle if not from touch events (to prevent double-trigger on mobile)
    if (e.pointerType !== 'touch') {
        const now = Date.now();
        if ((now - lastInteractionTime) >= interactionCooldown) {
            triggerHapticFeedback();
            triggerVisualFeedback();
            triggerSpin();
            lastInteractionTime = now;
        }
    }
});

// === Resize ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Animate loop ===
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    controls.update();
    renderer.render(scene, camera);
}
animate();

console.log('🎱 Magic 8-Ball ready: double-click (desktop) or swipe hard (mobile)');
