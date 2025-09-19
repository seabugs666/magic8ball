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
controls.dampingFactor = 0.1;
controls.screenSpacePanning = false;
controls.enablePan = false;
controls.enableZoom = true;
controls.enableRotate = true;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1.5;
controls.minDistance = 2;
controls.maxDistance = 10;

// Lock horizontal rotation (Y-axis) and allow full up/down rotation
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = 0;
controls.minPolarAngle = 0; // look straight up
controls.maxPolarAngle = Math.PI; // look straight down

// Configure touch controls for mobile
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
};

// Disable touch-action on the renderer to prevent browser gestures
renderer.domElement.style.touchAction = 'none';

// Enable passive event listeners for better performance
const passiveSupported = (() => {
    let passiveSupported = false;
    try {
        const options = Object.defineProperty({}, 'passive', {
            get: function() { passiveSupported = true; }
        });
        window.addEventListener('test', null, options);
        window.removeEventListener('test', null, options);
    } catch (err) {}
    return passiveSupported;
})();

// Prevent default touch events to avoid page scrolling/zooming
const preventDefault = (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
};

// Add touch event listeners
if ('ontouchstart' in window) {
    renderer.domElement.addEventListener('touchstart', preventDefault, passiveSupported ? { passive: false } : false);
    renderer.domElement.addEventListener('touchmove', preventDefault, passiveSupported ? { passive: false } : false);
}
// === Remove previous lights ===
scene.children = scene.children.filter(obj => !(obj.isLight));

// === Soft, glinty setup for glossy sphere ===

// Very subtle ambient
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

// Main top-left highlight
const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
mainLight.position.set(5, 8, 5);
scene.add(mainLight);

// Secondary key from right-top, slightly bluish
const fillLight = new THREE.DirectionalLight(0x4466ff, 1.0);
fillLight.position.set(-5, 7, 3);
scene.add(fillLight);

// Rim / edge highlights (wraps the sphere)
const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
rimLight1.position.set(-6, 3, -5);
scene.add(rimLight1);

const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight2.position.set(6, 2, -4);
scene.add(rimLight2);

// Small sparkling point lights around for subtle glitter
const sparklePositions = [
    [2, 4, 2],
    [-2, 3, 3],
    [1, 5, -2],
    [-1, 4, -3]
];

sparklePositions.forEach(pos => {
    const p = new THREE.PointLight(0x88ccff, 0.3, 15);
    p.position.set(...pos);
    scene.add(p);

    // optional gentle animation
    gsap.to(p.position, {
        x: "+=0.3",
        y: "+=0.3",
        z: "+=0.3",
        duration: 2 + Math.random(),
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });
});

// === Adjust liquid for murky glossy look ===
const liquid = ballParent.getObjectByName('Liquid');
if (liquid) {
    liquid.material = new THREE.MeshPhysicalMaterial({
        color: 0x001133,
        transparent: true,
        opacity: 0.65,
        transmission: 1.0,
        roughness: 0.02,        // super smooth for glossy
        metalness: 0.0,
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
        ior: 1.33,
        thickness: 0.9,
        specularIntensity: 1.2, // strong glints
        envMapIntensity: 1.5,   // reflections pop
        side: THREE.DoubleSide,
        depthWrite: false,
        premultipliedAlpha: true
    });
}

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
                opacity: .5,
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

        // Enhance murky dark blue liquid
        const liquid = ballParent.getObjectByName('Liquid');
        if (liquid) {
            liquid.material = new THREE.MeshPhysicalMaterial({
                color: 0x001133,       // Dark, mysterious blue
                transparent: true,
                opacity: 1,         // Almost opaque
                transmission: 0.2,     // Very little light passes through
                roughness: 0.2,        // Slightly soft surface
                metalness: 0.0,
                clearcoat: 0.2,
                clearcoatRoughness: 0.3,
                ior: 1.3,              // Slight refraction
                thickness: 1.0,        // Full depth for murkiness
                specularIntensity: 0.6,
                envMapIntensity: 0.5,  // Subtle reflections
                side: THREE.DoubleSide,
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

    const tl = gsap.timeline({
        onComplete() {
            if (actions.length) {
                actions.forEach((a) => a.stop());
                const action = actions[Math.floor(Math.random() * actions.length)];
                action.reset();
                action.setLoop(THREE.LoopOnce, 1); // Play through once
                action.clampWhenFinished = true;
                action.timeScale = 0.7; // Slightly faster playback
                action.setEffectiveTimeScale(1.5); // Speed up the animation
                action.setEffectiveWeight(1.0); // Full influence
                action.play();
                
                // Add some variation to the animation
                const randomSpeed = 0.8 + Math.random() * 0.4; // Random speed between 0.8 and 1.2
                action.setDuration(action.getClip().duration * randomSpeed);
            }
            isAnimating = false;
        }
    });

    // Initial slow ramp-up
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 4,  // Start with a smaller rotation
        duration: 0.15,
        ease: 'sine.in',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    });
    
    // Rapid acceleration phase
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 16,  // Fast spin
        duration: 0.3,
        ease: 'power2.inOut',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
    
    // Gradual slow down
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 10,
        duration: 0.4,
        ease: 'sine.out',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
    
    // Final settle with bounce
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 4,
        duration: 0.6,
        ease: 'elastic.out(1, 0.7)',  // More pronounced bounce
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
}

// === Event Listeners ===
// Desktop - only trigger on double-click
renderer.domElement.addEventListener('dblclick', (e) => {
    if (e.pointerType !== 'touch') {
        triggerSpin();
    }
});

// Mobile touch controls
let touchStartTime = 0;
let lastInteractionTime = 0;
const interactionCooldown = 1000;
const tapTimeThreshold = 300;

function triggerHapticFeedback() {
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

function triggerVisualFeedback() {
    if (!ballParent) return;
    gsap.to(ballParent.scale, {
        x: 1.05, y: 1.05, z: 1.05,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
    });
}

let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;
const moveThreshold = 10;

renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
    }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartX);
        const dy = Math.abs(touch.clientY - touchStartY);
        if (dx > moveThreshold || dy > moveThreshold) {
            touchMoved = true;
        }
    }
}, { passive: true });

renderer.domElement.addEventListener('touchend', () => {
    const now = Date.now();
    if (!touchMoved && (now - touchStartTime) < tapTimeThreshold && (now - lastInteractionTime) >= interactionCooldown) {
        triggerHapticFeedback();
        triggerVisualFeedback();
        triggerSpin();
        lastInteractionTime = now;
    }
    touchMoved = false;
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

console.log('🎱 Magic 8-Ball ready: double-click (desktop) or tap (mobile)');
