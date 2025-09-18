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
scene.add(new THREE.AmbientLight(0xffffff, 1.0));
const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight1.position.set(5, 10, 7);
scene.add(dirLight1);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight2.position.set(-5, 5, 5);
scene.add(dirLight2);
const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
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

        // Find die
        die = ballParent.getObjectByName('Die') || ballParent.getObjectByName('die');
        if (!die) {
            ballParent.traverse((child) => {
                if (child.isMesh && !die) die = child;
            });
        }
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
function randomQuaternion() {
    const q = new THREE.Quaternion();
    q.setFromEuler(
        new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        )
    );
    return q;
}

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

    const startQuat = die.quaternion.clone();
    const rollQuat = randomQuaternion();
    gsap.to({ t: 0 }, {
        t: 1,
        duration: 0.6,
        ease: 'power2.inOut',
        onUpdate() {
            const currentQuat = new THREE.Quaternion();
            currentQuat.slerpQuaternions(startQuat, rollQuat, this.t);
            die.quaternion.copy(currentQuat);
        },
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
        },
    });
}

// === Desktop double-click ===
renderer.domElement.addEventListener('dblclick', triggerSpin);

// === Mobile hard swipe ===
let touchStartPos = null;
let swipeThreshold = 150; // minimum distance in pixels
let swipeSpeedThreshold = 1; // px/ms
let lastSwipeTime = 0;
let swipeCooldown = 100000; // ms

renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY, time: Date.now() };
}, { passive: true });

renderer.domElement.addEventListener('touchend', (e) => {
    if (!touchStartPos) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;
    const dt = Date.now() - touchStartPos.time;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = distance / dt; // px/ms
    const now = Date.now();

    if (distance > swipeThreshold && speed > swipeSpeedThreshold && now - lastSwipeTime > swipeCooldown) {
        lastSwipeTime = now;
        triggerSpin();
    }

    touchStartPos = null;
}, { passive: true });

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
