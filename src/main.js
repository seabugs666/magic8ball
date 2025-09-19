import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

// === Scene & Camera ===
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x440066, 0.005); // subtle deep purple fog
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
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = 0;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
renderer.domElement.style.touchAction = 'none';

// Passive touch support
const passiveSupported = (() => {
    let supported = false;
    try {
        const options = Object.defineProperty({}, 'passive', {
            get: function() { supported = true; }
        });
        window.addEventListener('test', null, options);
        window.removeEventListener('test', null, options);
    } catch (err) {}
    return supported;
})();

const preventDefault = (e) => { if (e.touches.length > 1) e.preventDefault(); };
if ('ontouchstart' in window) {
    renderer.domElement.addEventListener('touchstart', preventDefault, passiveSupported ? { passive: false } : false);
    renderer.domElement.addEventListener('touchmove', preventDefault, passiveSupported ? { passive: false } : false);
}

// === Lights ===
scene.add(new THREE.AmbientLight(0xffffff, 4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 10, 0);
dirLight.target.position.set(-5, 0, 0);
scene.add(dirLight);
scene.add(dirLight.target);

// === Load Magic 8-Ball ===
let die = null;
let ballParent = null;
let mixer = null;
let actions = [];
let liquid = null;

const loader = new GLTFLoader();
loader.load('assets/magic8ball.glb',
    (gltf) => {
        ballParent = gltf.scene;
        scene.add(ballParent);

        // Find die and hide it
        die = ballParent.getObjectByName('Die') || ballParent.getObjectByName('die');
        if (!die) {
            ballParent.traverse((child) => { if (child.isMesh && !die) die = child; });
        }
        if (die) die.visible = false;
        if (!die) die = ballParent;

        // Glass material
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

        // Liquid material with animated caustics
        liquid = ballParent.getObjectByName('Liquid');
        if (liquid) {
            const causticTexture = new THREE.TextureLoader().load('textures/caustics.png');
            causticTexture.wrapS = causticTexture.wrapT = THREE.RepeatWrapping;
            causticTexture.repeat.set(3, 3);

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
                emissive: new THREE.Color(0x8888ff),
                emissiveMap: causticTexture,
                emissiveIntensity: 0.3
            });
        }

        // Animations
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(ballParent);
            gltf.animations.forEach((clip) => {
                actions.push(mixer.clipAction(clip));
            });
        }

        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        console.log('Magic 8-Ball loaded.');
    },
    (progress) => { if (progress.total) console.log('Loading progress:', ((progress.loaded / progress.total) * 100).toFixed(2) + '%'); },
    (err) => console.error('Error loading model:', err)
);

// === Animation Helpers ===
function shakeObject(object, intensity = 0.01, duration = 0.2) {
    if (!object) return;
    const originalPosition = object.position.clone();
    const interval = setInterval(() => {
        object.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
        object.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;
    }, 16);
    setTimeout(() => { clearInterval(interval); object.position.copy(originalPosition); }, duration * 1000);
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
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                action.timeScale = 0.7;
                action.setEffectiveTimeScale(1.5);
                action.setEffectiveWeight(1.0);
                action.play();
                const randomSpeed = 0.8 + Math.random() * 0.4;
                action.setDuration(action.getClip().duration * randomSpeed);
            }
            isAnimating = false;
        }
    });

    tl.to(die.rotation, { x: die.rotation.x + Math.PI * 4, duration: 0.15, ease: 'sine.in', onUpdate: () => die.quaternion.setFromEuler(die.rotation) });
    tl.to(die.rotation, { x: die.rotation.x + Math.PI * 16, duration: 0.3, ease: 'power2.inOut', onUpdate: () => die.quaternion.setFromEuler(die.rotation) }, '-=0.1');
    tl.to(die.rotation, { x: die.rotation.x + Math.PI * 10, duration: 0.4, ease: 'sine.out', onUpdate: () => die.quaternion.setFromEuler(die.rotation) }, '-=0.1');
    tl.to(die.rotation, { x: die.rotation.x + Math.PI * 4, duration: 0.6, ease: 'elastic.out(1, 0.7)', onUpdate: () => die.quaternion.setFromEuler(die.rotation) }, '-=0.1');
}

// === Event Listeners ===
renderer.domElement.addEventListener('dblclick', (e) => { if (e.pointerType !== 'touch') triggerSpin(); });

let touchStartTime = 0, lastInteractionTime = 0, touchStartX = 0, touchStartY = 0, touchMoved = false;
const interactionCooldown = 1000, tapTimeThreshold = 300, moveThreshold = 10;

function triggerHapticFeedback() { if ('vibrate' in navigator) navigator.vibrate(50); }
function triggerVisualFeedback() { if (!ballParent) return; gsap.to(ballParent.scale, { x:1.05, y:1.05, z:1.05, duration:0.1, yoyo:true, repeat:1, ease:'power2.inOut' }); }

renderer.domElement.addEventListener('touchstart', (e) => { if(e.touches.length===1){touchStartTime=Date.now();touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;touchMoved=false;}}, {passive:true});
renderer.domElement.addEventListener('touchmove', (e)=>{if(e.touches.length===1){const dx=Math.abs(e.touches[0].clientX-touchStartX); const dy=Math.abs(e.touches[0].clientY-touchStartY); if(dx>moveThreshold||dy>moveThreshold) touchMoved=true;}},{passive:true});
renderer.domElement.addEventListener('touchend', ()=>{
    const now = Date.now();
    if(!touchMoved && (now-touchStartTime)<tapTimeThreshold && (now-lastInteractionTime)>=interactionCooldown){
        triggerHapticFeedback();
        triggerVisualFeedback();
        triggerSpin();
        lastInteractionTime = now;
    }
    touchMoved=false;
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
    if(mixer) mixer.update(delta);
    controls.update();

    // Animate caustics on liquid
    if(liquid && liquid.material.emissiveMap){
        const time = clock.getElapsedTime();
        liquid.material.emissiveMap.offset.x = time * 0.05;
        liquid.material.emissiveMap.offset.y = time * 0.03;
    }

    renderer.render(scene, camera);
}
animate();

console.log('🎱 Magic 8-Ball ready: double-click (desktop) or tap (mobile)');
