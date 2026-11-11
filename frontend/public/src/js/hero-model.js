import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const canvas = document.querySelector("#heroModelCanvas");
const stage = document.querySelector(".character-stage");
if (canvas && stage) initializeHeroModel();

async function initializeHeroModel() {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(0, 1.65, 5.5);
    camera.lookAt(0, 1.22, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8c91a1, 2.1));
    const keyLight = new THREE.DirectionalLight(0xfff7ec, 3.2);
    keyLight.position.set(-2.8, 4.5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc6e6ff, 1.1);
    fillLight.position.set(3, 2.2, 2);
    scene.add(fillLight);

    const loader = new FBXLoader();
    loader.setResourcePath("./assets/textures/");
    const textureLoader = new THREE.TextureLoader();
    const avatarTexture = await textureLoader.loadAsync("./assets/textures/MikeAlger_Texture.jpeg");
    avatarTexture.colorSpace = THREE.SRGBColorSpace;
    avatarTexture.flipY = false;
    avatarTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const model = await new Promise((resolve, reject) => {
      loader.load("./assets/source/MikeAlger.fbx", resolve, undefined, reject);
    });
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (!material) continue;
          if (!material.map) material.map = avatarTexture;
          material.needsUpdate = true;
        }
      }
    });

    // Relax the T-pose into a composed, arms-at-the-sides stance.
    const bones = new Map();
    model.traverse((node) => {
      if (node.isBone) bones.set(node.name.replace(/[^a-z]/gi, "").toLowerCase(), node);
    });
    const leftArm = bones.get("leftarm");
    const rightArm = bones.get("rightarm");
    if (leftArm) leftArm.rotation.z += 0.78;
    if (rightArm) rightArm.rotation.z -= 0.78;
    const leftForeArm = bones.get("leftforearm");
    const rightForeArm = bones.get("rightforearm");
    if (leftForeArm) leftForeArm.rotation.z -= 0.12;
    if (rightForeArm) rightForeArm.rotation.z += 0.12;

    const originalBounds = new THREE.Box3().setFromObject(model);
    const originalSize = originalBounds.getSize(new THREE.Vector3());
    const center = originalBounds.getCenter(new THREE.Vector3());
    const targetHeight = 2.45;
    const scale = targetHeight / Math.max(originalSize.y, 0.001);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -originalBounds.min.y * scale, -center.z * scale);
    model.rotation.y = -0.08;
    scene.add(model);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    stage.classList.add("model-ready");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    const renderFrame = () => {
      if (!reduceMotion) model.rotation.y = -0.08 + Math.sin(clock.elapsedTime * 0.38) * 0.025;
      renderer.render(scene, camera);
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
  } catch (error) {
    console.warn("3D hero model could not load; using the portrait fallback.", error);
  }
}
