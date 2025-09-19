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
    alpha: true
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
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;

// Touch settings
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
};
renderer.domElement.style.touchAction = 'none';

// === Lights ===
// Soft ambient
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

// Main highlight
const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
mainLight.position.set(5, 8, 5);
scene.add(mainLight);

// Fill light, bluish
const fillLight = new THREE.DirectionalLight(0x4466ff, 1.0);
fillLight.position.set(-5, 7, 3);
scene.add(fillLight);

// Rim lights
const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
rimLight1.position.set(-6, 3, -5);
scene.add(rimLight1);

const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight2.position.set(6, 2, -4);
scene.add(rimLight2);

// Sparkles
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

// === Variables ===
let die = null;
let ballParent = null;
let mixer = null;
let actions = [];

// === GLTF Loader ===
const loader = new GLTFLoader();
loader.load(
    'assets/magic8ball.glb',
    (gltf) => {
        ballParent = gltf.scene;
        scene.add(ballParent);

        // Find die
        die = ballParent.getObjectByName('Die') || ballParent.getObjectByName('die');
        if (!die) {
            ballParent.traverse((child) => {
                if (child.isMesh && !die) die = child;
            });
        }
        if (die) die.visible = false;
        if (!die) die = ballParent;

        // Glass
        const glass = ballParent.getObjectByName('Glass');
        if (glass) {
            glass.material = new THREE.MeshPhysicalMaterial({
                color: 0x88aadd,
                transparent: true,
                opacity: 0.5,
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

        // Murky dark blue liquid
        const liquid = ballParent.getObjectByName('Liquid');
        if (liquid) {
            liquid.material = new THREE.MeshPhysicalMaterial({
                color: 0x001133,
                transparent: true,
                opacity: 1,
                transmission: 0.2,
                roughness: 0.2,
                metalness: 0.0,
                clearcoat: 0.2,
                clearcoatRoughness: 0.3,
                ior: 1.3,
                thickness: 1.0,
                specularIntensity: 0.6,
                envMapIntensity: 0.5,
                side: THREE.DoubleSide,
                premultipliedAlpha: true,
            });
        }

        // Animations
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(ballParent);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                actions.push(action);
            });
        }

        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        console.log('Magic 8-Ball loaded.');
    },
    (progress) => {
        if (progress.total)
            console.log('Loading progress:', ((progress.loaded / progress.total) * 100).toFixed(2) + '%');
    },
    (err) => console.error('Error loading model:', err)
);

// === Helpers ===
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

// === Spin ===
let isAnimating = false;
function triggerSpin() {
    if (!die || isAnimating) return;
    isAnimating = true;

    if (ballParent) shakeObject(ballParent, 0.03, 0.3);

    const tl = gsap.timeline({
        onComplete() {
            if (actions.length) {
                const action = actions[Math.floor(Math.random() * actions.length)];
                action.reset();
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                action.timeScale = 1;
                action.play();
            }
            isAnimating = false;
        }
    });

    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 4,
        duration: 0.15,
        ease: 'sine.in',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    });
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 16,
        duration: 0.3,
        ease: 'power2.inOut',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 10,
        duration: 0.4,
        ease: 'sine.out',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
    tl.to(die.rotation, {
        x: die.rotation.x + Math.PI * 4,
        duration: 0.6,
        ease: 'elastic.out(1, 0.7)',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
}

// === Event Listeners ===
// Desktop
renderer.domElement.addEventListener('dblclick', () => triggerSpin());

// Mobile
let touchStartTime = 0;
let lastInteractionTime = 0;
const interactionCooldown = 1000;
const tapTimeThreshold = 300;
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;
const moveThreshold = 10;

function triggerHapticFeedback() {
    if ('vibrate' in navigator) navigator.vibrate(50);
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
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > moveThreshold || dy > moveThreshold) touchMoved = true;
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

// === Animate ===
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
