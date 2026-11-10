import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FBXLoader.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";

const canvas = document.querySelector("#model-canvas");
const stage = document.querySelector(".stage");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
camera.position.set(0, 2.35, 10.8);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0xffffff, 0x77798e, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(-3, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0xc9f46b, 2.1);
rim.position.set(5, 4, -3);
scene.add(rim);

const figures = new THREE.Group();
scene.add(figures);

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const loader = new FBXLoader();
loader.setResourcePath("./assets/textures/");
loader.load(
  "./assets/source/MikeAlger.fbx",
  (fbx) => {
    fbx.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const mats = Array.isArray(node.material)
        ? node.material
        : [node.material];
      mats.forEach((mat) => {
        if (!mat) return;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      });
    });

    const bounds = new THREE.Box3().setFromObject(fbx);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // FBX source is authored in centimeters; normalize to a human sized scene.
    const scale = 3.55 / size.y;
    fbx.scale.setScalar(scale);
    fbx.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale,
    );

    fbx.position.set(0, -1.75, 0);
    figures.add(fbx);

    figures.scale.setScalar(1.08);
    gsap.fromTo(
      figures.scale,
      { x: 0.001, y: 0.001, z: 0.001 },
      {
        x: 1.08,
        y: 1.08,
        z: 1.08,
        duration: 1.65,
        ease: "power3.out",
        delay: 0.45,
      },
    );
    gsap.fromTo(
      figures.position,
      { y: -0.3 },
      { y: 0, duration: 1.8, ease: "power3.out", delay: 0.45 },
    );
  },
  undefined,
  (error) => {
    console.error("Could not load the 3D model:", error);
  },
);

// A soft floating platform anchors the figures without hiding their feet.
const platformMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8f8fc,
  roughness: 0.72,
  metalness: 0.02,
});
const platform = new THREE.Mesh(
  new THREE.CircleGeometry(3.5, 96),
  platformMaterial,
);
platform.rotation.x = -Math.PI / 2;
platform.position.set(0, -1.78, -0.08);
platform.receiveShadow = true;
scene.add(platform);
const halo = new THREE.Mesh(
  new THREE.RingGeometry(2.45, 2.49, 120),
  new THREE.MeshBasicMaterial({
    color: 0xc7ef61,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  }),
);
halo.rotation.x = -Math.PI / 2;
halo.position.set(0, -1.765, -0.08);
scene.add(halo);

let pointerX = 0;
let pointerY = 0;
window.addEventListener("pointermove", (event) => {
  pointerX = (event.clientX / window.innerWidth - 0.5) * 0.22;
  pointerY = (event.clientY / window.innerHeight - 0.5) * 0.1;
});

function render() {
  figures.rotation.y += (pointerX - figures.rotation.y) * 0.025;
  camera.position.y += (2.35 - pointerY - camera.position.y) * 0.025;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

gsap.set(
  [
    ".brand",
    "nav a",
    ".avatar",
    ".copy-block",
    ".wordmark",
    ".float-card",
    ".side-character",
    ".edge-orbit",
  ],
  { autoAlpha: 0 },
);
const intro = gsap.timeline({ defaults: { ease: "power2.out" } });
intro
  .to(
    ".brand, nav a, .avatar",
    { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08 },
    0.05,
  )
  .fromTo(
    ".wordmark",
    { autoAlpha: 0, y: 18 },
    { autoAlpha: 1, y: 0, duration: 1.1 },
    0.12,
  )
  .fromTo(
    ".copy-block",
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.85 },
    0.35,
  )
  .fromTo(
    ".side-character",
    { autoAlpha: 0, y: 22 },
    { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.15 },
    0.55,
  )
  .fromTo(
    ".float-card",
    { autoAlpha: 0, y: 14, scale: 0.97 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08 },
    0.7,
  )
  .fromTo(
    ".edge-orbit",
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 1.2 },
    0.85,
  );

document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const label = link.textContent.trim();
    document
      .querySelectorAll("nav a")
      .forEach((item) => item.classList.toggle("active", item === link));
    gsap.fromTo(
      ".copy-block",
      { y: 5 },
      { y: 0, duration: 0.35, ease: "power2.out" },
    );
    if (label === "Tracker") window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

