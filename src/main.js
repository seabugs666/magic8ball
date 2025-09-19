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
renderer.domElement.style.touchAction = 'none';

// === Controls ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.enablePan = false;
controls.enableZoom = true;
controls.enableRotate = true;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1.5;
// Lock horizontal rotation, allow up/down only
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = 0;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;

// Touch config for mobile
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// Prevent multi-touch scroll
const preventDefault = (e) => { if(e.touches.length > 1) e.preventDefault(); };
renderer.domElement.addEventListener('touchstart', preventDefault, { passive: false });
renderer.domElement.addEventListener('touchmove', preventDefault, { passive: false });

// === Lights ===
const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight1.position.set(5, 10, 7);
scene.add(dirLight1);

// Rim / edge lights
const rim1 = new THREE.DirectionalLight(0xffffff, 0.5);
rim1.position.set(5, 5, -5);
scene.add(rim1);

const rim2 = new THREE.PointLight(0x88ccff, 0.3, 15);
rim2.position.set(-2, 4, 2);
scene.add(rim2);
gsap.to(rim2.position, { x: "+=0.3", y: "+=0.3", z: "+=0.3", duration: 2, yoyo:true, repeat:-1, ease:"sine.inOut" });

// Ambient subtle fill
scene.add(new THREE.AmbientLight(0xffffff, 5));

// === Load Magic 8-Ball ===
let die = null;
let ballParent = null;
let mixer = null;
let actions = [];

const loader = new GLTFLoader();
loader.load(
    'assets/magic8ball.glb',
    (gltf) => {
        ballParent = gltf.scene;
        scene.add(ballParent);

        die = ballParent.getObjectByName('Die') || ballParent.getObjectByName('die') || ballParent;
        die.visible = false;

        const glass = ballParent.getObjectByName('Glass');
        if(glass){
            glass.material = new THREE.MeshPhysicalMaterial({
                color: 0x88aadd,
                transparent: true,
                opacity: 0.5,
                transmission: 1.0,
                roughness: 0.05,
                metalness: 0,
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

        const liquid = ballParent.getObjectByName('Liquid');
        if(liquid){
            liquid.material = new THREE.MeshPhysicalMaterial({
                color: 0x001133,
                transparent: true,
                opacity: 1,
                transmission: 0.2,
                roughness: 0.2,
                metalness: 0,
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

        if(gltf.animations.length){
            mixer = new THREE.AnimationMixer(ballParent);
            gltf.animations.forEach(clip => actions.push(mixer.clipAction(clip)));
        }

        const loading = document.getElementById('loading');
        if(loading) loading.style.display = 'none';
    },
    (progress) => { if(progress.total) console.log(`Loading: ${((progress.loaded/progress.total)*100).toFixed(2)}%`); },
    (err) => console.error('Error loading GLB:', err)
);

// === Helpers ===
function shakeObject(object, intensity=0.01, duration=0.2){
    if(!object) return;
    const orig = object.position.clone();
    const interval = setInterval(() => {
        object.position.x = orig.x + (Math.random()-0.5)*intensity;
        object.position.y = orig.y + (Math.random()-0.5)*intensity;
    },16);
    setTimeout(()=>{ clearInterval(interval); object.position.copy(orig); }, duration*1000);
}

// Spin function
let isAnimating = false;
function triggerSpin(){
    if(!die || isAnimating) return;
    isAnimating = true;
    if(ballParent) shakeObject(ballParent,0.03,0.3);

    const tl = gsap.timeline({onComplete: ()=>{
            if(actions.length){
                const action = actions[Math.floor(Math.random()*actions.length)];
                action.reset();
                action.setLoop(THREE.LoopOnce,1);
                action.clampWhenFinished=true;
                action.timeScale=0.7;
                action.play();
            }
            isAnimating=false;
        }});

    tl.to(die.rotation,{ x: die.rotation.x+Math.PI*4, duration:0.15, ease:'sine.in', onUpdate:()=>die.quaternion.setFromEuler(die.rotation) });
    tl.to(die.rotation,{ x: die.rotation.x+Math.PI*16, duration:0.3, ease:'power2.inOut', onUpdate:()=>die.quaternion.setFromEuler(die.rotation) },'-=0.1');
    tl.to(die.rotation,{ x: die.rotation.x+Math.PI*10, duration:0.4, ease:'sine.out', onUpdate:()=>die.quaternion.setFromEuler(die.rotation) },'-=0.1');
    tl.to(die.rotation,{ x: die.rotation.x+Math.PI*4, duration:0.6, ease:'elastic.out(1,0.7)', onUpdate:()=>die.quaternion.setFromEuler(die.rotation) },'-=0.1');
}

// === Event Listeners ===
renderer.domElement.addEventListener('dblclick', e=>{ if(e.pointerType!=='touch') triggerSpin(); });

let touchStartTime=0, lastInteractionTime=0;
const interactionCooldown=1000, tapTimeThreshold=300;
let touchStartX=0, touchStartY=0, touchMoved=false;

function triggerHaptic(){ if('vibrate' in navigator) navigator.vibrate(50); }
function triggerVisual(){ if(ballParent) gsap.to(ballParent.scale,{ x:1.05,y:1.05,z:1.05,duration:0.1,yoyo:true,repeat:1,ease:'power2.inOut' }); }

renderer.domElement.addEventListener('touchstart', e=>{
    if(e.touches.length===1){
        touchStartTime=Date.now();
        touchStartX=e.touches[0].clientX;
        touchStartY=e.touches[0].clientY;
        touchMoved=false;
    }
},{ passive:true });

renderer.domElement.addEventListener('touchmove', e=>{
    if(e.touches.length===1){
        const dx=Math.abs(e.touches[0].clientX-touchStartX);
        const dy=Math.abs(e.touches[0].clientY-touchStartY);
        if(dx>10||dy>10) touchMoved=true;
    }
},{ passive:true });

renderer.domElement.addEventListener('touchend', ()=>{
    const now = Date.now();
    if(!touchMoved&&(now-touchStartTime)<tapTimeThreshold&&(now-lastInteractionTime)>=interactionCooldown){
        triggerHaptic();
        triggerVisual();
        triggerSpin();
        lastInteractionTime=now;
    }
    touchMoved=false;
});

// === Resize ===
window.addEventListener('resize', ()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Animate loop ===
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);
    controls.update();
    if(ballParent && keyLight) {
        keyLight.position.copy(camera.position);
        keyLight.target.position.copy(ballParent.position);
    }
    renderer.render(scene,camera);
}
animate();

console.log('🎱 Magic 8-Ball ready!');
