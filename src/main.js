import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // boost overall brightness

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

// Lock horizontal rotation, allow full up/down rotation
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = 0;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;

// Touch gestures
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
renderer.domElement.style.touchAction = 'none';

// === HDRI Environment ===
new RGBELoader().setPath('assets/hdri/').load('studio_small_08_1k.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = new THREE.Color(0x111111);
});

// === Lights ===
scene.add(new THREE.AmbientLight(0xffffff, 0.2)); // subtle ambient

// Main directional highlight
const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 8, 5);
scene.add(mainLight);

// Secondary key light (bluish)
const fillLight = new THREE.DirectionalLight(0x4466ff, 0.8);
fillLight.position.set(-5, 7, 3);
scene.add(fillLight);

// Rim / edge lights
const rimLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
rimLight1.position.set(-6, 3, -5);
scene.add(rimLight1);

const rimLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight2.position.set(6, 2, -4);
scene.add(rimLight2);

// Sparkling points for subtle glitter
[
    [2, 4, 2],
    [-2, 3, 3],
    [1, 5, -2],
    [-1, 4, -3]
].forEach(pos => {
    const p = new THREE.PointLight(0x88ccff, 0.3, 15);
    p.position.set(...pos);
    scene.add(p);
    gsap.to(p.position, {
        x: "+=0.3", y: "+=0.3", z: "+=0.3",
        duration: 2 + Math.random(),
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });
});

// === Load Magic 8-Ball ===
let die = null;
let ballParent = null;
let mixer = null;
let actions = [];

const loader = new GLTFLoader();
loader.load('assets/magic8ball.glb', (gltf) => {
    ballParent = gltf.scene;
    scene.add(ballParent);

    // Find die
    die = ballParent.getObjectByName('Die') || ballParent.getObjectByName('die');
    if (!die) {
        ballParent.traverse(c => { if (c.isMesh && !die) die = c; });
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
            specularIntensity: 1.0,
            envMapIntensity: 1.8,
            side: THREE.DoubleSide,
            depthWrite: false,
            premultipliedAlpha: true,
        });
    }

    // Dark blue murky liquid
    const liquid = ballParent.getObjectByName('Liquid');
    if (liquid) {
        liquid.material = new THREE.MeshPhysicalMaterial({
            color: 0x001133,
            transparent: true,
            opacity: 0.8,
            transmission: 0.3,
            roughness: 0.15,
            metalness: 0.0,
            clearcoat: 0.2,
            clearcoatRoughness: 0.25,
            ior: 1.33,
            thickness: 1.0,
            specularIntensity: 1.2,
            envMapIntensity: 2.0,
            side: THREE.DoubleSide,
            premultipliedAlpha: true,
        });
    }

    // Animations
    if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(ballParent);
        gltf.animations.forEach(clip => {
            const action = mixer.clipAction(clip);
            actions.push(action);
        });
    }

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}, undefined, (err) => console.error(err));

// === Spin Function ===
let isAnimating = false;
function shakeObject(obj, intensity = 0.01, duration = 0.2) {
    if (!obj) return;
    const orig = obj.position.clone();
    const interval = setInterval(() => {
        obj.position.x = orig.x + (Math.random() - 0.5) * intensity;
        obj.position.y = orig.y + (Math.random() - 0.5) * intensity;
    }, 16);
    setTimeout(() => { clearInterval(interval); obj.position.copy(orig); }, duration*1000);
}

function triggerSpin() {
    if (!die || isAnimating) return;
    isAnimating = true;
    if (ballParent) shakeObject(ballParent, 0.03, 0.3);

    const tl = gsap.timeline({
        onComplete() {
            if (actions.length) {
                actions.forEach(a => a.stop());
                const action = actions[Math.floor(Math.random()*actions.length)];
                action.reset();
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                action.timeScale = 0.7;
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
        ease: 'elastic.out(1,0.7)',
        onUpdate: () => die.quaternion.setFromEuler(die.rotation)
    }, '-=0.1');
}

// === Event Listeners ===
renderer.domElement.addEventListener('dblclick', e => { if (e.pointerType!=='touch') triggerSpin(); });

// Mobile taps
let touchStartTime = 0, lastInteractionTime = 0;
const interactionCooldown = 1000, tapThreshold = 300;
let touchStartX=0, touchStartY=0, touchMoved=false;

renderer.domElement.addEventListener('touchstart', e => {
    if (e.touches.length===1) {
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved=false;
    }
}, {passive:true});
renderer.domElement.addEventListener('touchmove', e => {
    if (e.touches.length===1) {
        const dx=Math.abs(e.touches[0].clientX-touchStartX);
        const dy=Math.abs(e.touches[0].clientY-touchStartY);
        if(dx>10 || dy>10) touchMoved=true;
    }
}, {passive:true});
renderer.domElement.addEventListener('touchend', ()=>{
    const now = Date.now();
    if(!touchMoved && (now-touchStartTime)<tapThreshold && (now-lastInteractionTime)>=interactionCooldown){
        if('vibrate' in navigator) navigator.vibrate(50);
        gsap.to(ballParent.scale,{x:1.05,y:1.05,z:1.05,duration:0.1,yoyo:true,repeat:1,ease:'power2.inOut'});
        triggerSpin();
        lastInteractionTime=now;
    }
    touchMoved=false;
});

// === Resize ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Animate Loop ===
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
}
animate();

console.log('🎱 Magic 8-Ball ready!');
