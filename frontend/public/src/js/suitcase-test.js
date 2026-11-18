import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#suitcaseCanvas");
const stage = document.querySelector("#suitcaseStage");
const button = document.querySelector("#openSuitcase");
const loaderLabel = document.querySelector("#suitcaseLoader");
const errorLabel = document.querySelector("#suitcaseError");
const hint = document.querySelector("#interactionHint");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer;
let caseModel;
let lidGroup;
let isOpen = false;
let transitionTimeline;

function animateOpenState() {
  if (!caseModel) return;
  isOpen = !isOpen;
  button.setAttribute("aria-pressed", String(isOpen));
  button.innerHTML = isOpen
    ? '<span aria-hidden="true">↙</span> Close the suitcase'
    : '<span aria-hidden="true">↗</span> Open the suitcase';
  stage.classList.toggle("is-open", isOpen);
  hint.textContent = isOpen ? "The case is open — click to close it" : "Click the suitcase or use the button";

  if (transitionTimeline) transitionTimeline.kill();
  if (window.gsap && !reducedMotion) {
    transitionTimeline = window.gsap.timeline({ defaults: { overwrite: "auto" } });
    if (lidGroup) {
      transitionTimeline.to(lidGroup.rotation, {
        y: isOpen ? -1.95 : 0,
        duration: isOpen ? 1.2 : 0.95,
        ease: isOpen ? "power3.inOut" : "back.out(1.25)",
      }, 0);
    }
    transitionTimeline.to(caseModel.rotation, {
      x: isOpen ? -0.05 : 0,
      y: isOpen ? -0.1 : 0,
      duration: 0.65,
      ease: "power2.inOut",
    }, 0);
    transitionTimeline.to(caseModel.position, {
      y: caseModel.userData.baseY + (isOpen ? 0.12 : 0),
      duration: 0.65,
      ease: "power2.inOut",
    }, 0);
  } else if (lidGroup) {
    lidGroup.rotation.y = isOpen ? -1.95 : 0;
  }
}

async function initialize() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.65, 6.2);
  camera.lookAt(0, 0.88, 0);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene.add(new THREE.HemisphereLight(0xdfffe6, 0x252719, 2.0));
  const key = new THREE.DirectionalLight(0xffefce, 3.6);
  key.position.set(-3.4, 5, 4.8);
  scene.add(key);
  const greenRim = new THREE.DirectionalLight(0x9aff30, 4.2);
  greenRim.position.set(3.5, 2.2, -3.5);
  scene.add(greenRim);
  const frontFill = new THREE.PointLight(0x9be638, 35, 7);
  frontFill.position.set(-2.2, 0.4, 2.5);
  scene.add(frontFill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 64),
    new THREE.MeshBasicMaterial({ color: 0x132117, transparent: true, opacity: 0.62, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.015;
  scene.add(floor);

  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().load("./assets/vintage_suitcase.glb", resolve, undefined, reject);
  });
  caseModel = gltf.scene;
  caseModel.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) node.material.needsUpdate = true;
    }
  });

  const bounds = new THREE.Box3().setFromObject(caseModel);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 2.55 / Math.max(size.x, size.y, size.z);
  caseModel.scale.setScalar(scale);
  caseModel.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  caseModel.userData.baseY = caseModel.position.y;

  // This asset has no embedded animation. Its two top shell groups are separate,
  // so pivot the lid group at the case center edge to provide a prototype hinge.
  lidGroup = caseModel.getObjectByName("Cube.008") || caseModel.getObjectByName("Cube.002");
  if (lidGroup) {
    const hingeX = 0;
    const hingeZ = 0;
    lidGroup.position.x -= hingeX;
    lidGroup.position.z -= hingeZ;
    const lidPivot = new THREE.Group();
    lidPivot.position.set(hingeX, 0, hingeZ);
    const parent = lidGroup.parent;
    const originalPosition = lidGroup.position.clone();
    parent.remove(lidGroup);
    lidPivot.add(lidGroup);
    lidGroup.position.copy(originalPosition);
    parent.add(lidPivot);
    lidGroup = lidPivot;
  }

  scene.add(caseModel);
  loaderLabel.hidden = true;
  button.disabled = false;
  const resize = () => {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  const clock = new THREE.Clock();
  const render = () => {
    const elapsed = clock.getElapsedTime();
    if (!reducedMotion && !transitionTimeline?.isActive()) {
      caseModel.rotation.y = (isOpen ? -0.12 : 0.12) + Math.sin(elapsed * 0.38) * 0.025;
      if (!isOpen) caseModel.position.y = caseModel.userData.baseY + Math.sin(elapsed * 0.8) * 0.025;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };
  render();
  window.addEventListener("beforeunload", () => {
    observer.disconnect();
    renderer.dispose();
  }, { once: true });
}

button.addEventListener("click", animateOpenState);
canvas.addEventListener("click", animateOpenState);

initialize().catch((error) => {
  console.error("Could not load the vintage suitcase GLB:", error);
  loaderLabel.hidden = true;
  errorLabel.hidden = false;
});
