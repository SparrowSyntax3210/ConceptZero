import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const checkpoints = [
  { label: "3 months", short: "3 MO", months: 3 },
  { label: "6 months", short: "6 MO", months: 6 },
  { label: "1 year", short: "1 YR", months: 12 },
  { label: "2 years", short: "2 YR", months: 24 },
  { label: "3 years", short: "3 YR", months: 36 },
  { label: "4 years", short: "4 YR", months: 48 },
  { label: "5 years", short: "5 YR", months: 60 },
];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const range = document.querySelector("#horizonRange");
const status = document.querySelector("#futureStatus");
const stage = document.querySelector("#futureStage");
const timelineTitle = document.querySelector("#timelineTitle");
const labels = document.querySelector("#rangeLabels");
const markers = document.querySelector("#rangeMarkers");
let projectionData = null;
let renderer;
let controls;
let model;
let animationFrame;

function setupTimeline() {
  labels.innerHTML = checkpoints.map((point, index) => `<span data-index="${index}">${point.label}</span>`).join("");
  markers.innerHTML = checkpoints.map((_, index) => `<i data-index="${index}"></i>`).join("");
  range.addEventListener("input", () => updateCheckpoint(Number(range.value)));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function updateCheckpoint(index) {
  const point = checkpoints[Math.max(0, Math.min(checkpoints.length - 1, index))];
  range.value = String(index);
  range.setAttribute("aria-valuetext", point.label);
  timelineTitle.textContent = `Your path at ${point.label}`;
  document.querySelector("#timelineCurrent").textContent = `SELECTED · ${point.short}`;
  document.querySelector("#modelHorizon").textContent = `At ${point.label}`;
  document.querySelectorAll("#rangeLabels span, #rangeMarkers i").forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.index) === index);
  });
  document.querySelector("#rangeProgress").style.width = `${(index / (checkpoints.length - 1)) * 85.72}%`;

  if (!projectionData) return;
  const { baselineScore, currentPath, guidelinePath, sections } = projectionData;
  const trajectoryPoint = projectionData.longTermTrajectory?.find((item) => Number(item.month) === point.months);
  if (!trajectoryPoint) {
    status.textContent = `The ${point.label} projection is not available. Refresh the page to try again.`;
    return;
  }
  const currentScore = Math.round(clamp(trajectoryPoint.currentScore));
  const suggestedScore = Math.round(clamp(trajectoryPoint.guidelineScore));
  setText("currentSummary", trajectoryPoint.currentSummary);
  setText("suggestedSummary", trajectoryPoint.guidelineSummary);
  setText("currentScore", currentScore);
  setText("suggestedScore", suggestedScore);
  setText("modelScore", suggestedScore);
  const currentItems = sections.map((section) => ({
    label: section.label,
    score: clamp(section.currentScore),
  }));
  renderMetrics("currentMetrics", currentItems);
  renderGuidelines("suggestedMetrics", guidelinePath.guidelines || []);
  updateTrajectoryChart(projectionData.longTermTrajectory, index);
  const progress = index / (checkpoints.length - 1);
  stage.style.setProperty("--scene-opacity", String(0.28 + progress * 0.72));
  stage.style.setProperty("--glow-scale", String(1 + index * 0.035));
  stage.classList.toggle("is-future", index >= 2);
  document.querySelector("#timelineNote").textContent =
    index === 0
      ? "Drag to compare each checkpoint. Scores and summaries update with your selection."
      : `At ${point.label}: an illustrative scenario, shaped by consistency and life circumstances.`;

  if (window.gsap && !reduceMotion) {
    window.gsap.fromTo(".score-block strong, .projected-badge strong", { scale: 0.92, opacity: 0.7 }, {
      scale: 1, opacity: 1, duration: 0.38, stagger: 0.035, ease: "back.out(1.7)", overwrite: true,
    });
    if (model) window.gsap.to(model.rotation, { y: model.rotation.y + Math.PI * 0.12, duration: 0.7, ease: "power2.out", overwrite: "auto" });
  }
}

function updateTrajectoryChart(trajectory, index) {
  const yFor = (score) => 86 - (clamp(score) / 100) * 72;
  const checkpointsOnly = trajectory.filter((item) => Number(item.month) > 0);
  const xFor = (pointIndex) => 71.4 + pointIndex * (857.2 / (checkpointsOnly.length - 1));
  const makePath = (field) => checkpointsOnly.map((item, pointIndex) => {
    const x = xFor(pointIndex);
    return `${pointIndex ? "L" : "M"}${x.toFixed(1)} ${yFor(item[field]).toFixed(1)}`;
  }).join(" ");
  document.querySelector("#currentTrajectory").setAttribute("d", makePath("currentScore"));
  document.querySelector("#guidelineTrajectory").setAttribute("d", makePath("guidelineScore"));
  const selected = checkpointsOnly[index];
  const x = xFor(index);
  const currentY = yFor(selected.currentScore);
  const guidelineY = yFor(selected.guidelineScore);
  document.querySelectorAll("#chartCursor").forEach((line) => {
    line.setAttribute("x1", x);
    line.setAttribute("x2", x);
  });
  const currentDot = document.querySelector("#chartCurrentDot");
  currentDot.setAttribute("cx", x);
  currentDot.setAttribute("cy", currentY);
  const guidelineDot = document.querySelector("#chartGuidelineDot");
  guidelineDot.setAttribute("cx", x);
  guidelineDot.setAttribute("cy", guidelineY);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderMetrics(elementId, values) {
  const container = document.getElementById(elementId);
  if (!values.length) {
    container.innerHTML = '<p class="metric-placeholder">Complete a profile area to see category details.</p>';
    return;
  }
  container.innerHTML = values.slice(0, 4).map((item) => `
    <div class="metric-row"><span>${escapeHTML(item.label)}</span><strong>${Math.round(item.score)}%</strong>
      <div class="metric-track"><i style="--value:${clamp(item.score)}%"></i></div>
    </div>`).join("");
}

function renderGuidelines(elementId, guidelines) {
  const container = document.getElementById(elementId);
  if (!guidelines.length) {
    container.innerHTML = '<p class="metric-placeholder">Complete more profile details to receive tailored guidance.</p>';
    return;
  }
  container.innerHTML = `<ul class="guideline-list">${guidelines.slice(0, 4).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

async function loadProjection() {
  try {
    const response = await fetch("/api/analysis/overview", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }
    if (!response.ok) {
      if (response.status === 404) {
        status.innerHTML = 'Add at least one profile area to unlock a personalized comparison. <a href="/forms.html">Complete a check-in →</a>';
      } else {
        status.textContent = result.message || "Your comparison is unavailable right now. Try again later.";
      }
      document.querySelectorAll("#currentMetrics, #suggestedMetrics").forEach((element) => {
        element.innerHTML = '<p class="metric-placeholder">Save a profile check-in to see your personalized values.</p>';
      });
      range.disabled = true;
      return;
    }
    projectionData = result;
    setText("currentSummary", result.currentPath.summary || "Your current habits form this starting path.");
    setText("suggestedSummary", result.guidelinePath.summary || "Small, consistent changes can build a different routine.");
    setText("currentScore", result.baselineScore);
    const guidelineOffset = result.guidelinePath.projectedScore - result.baselineScore;
    setText("suggestedTitle", guidelineOffset > 0 ? "A steadier path" : "A supported path");
    setText("projectionNote", "Illustrative scenarios based on your saved profile. Outcomes vary; this is not a promise or medical advice.");
    range.disabled = false;
    updateCheckpoint(Number(range.value));
    if (window.gsap && !reduceMotion) {
      window.gsap.fromTo(".future-side", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, stagger: 0.12, ease: "power2.out" });
    }
  } catch (error) {
    console.error("Could not load the future comparison:", error);
    status.textContent = "Could not connect to your analysis. Check your connection and try again.";
    range.disabled = true;
  }
}

async function loadCharacter() {
  const canvas = document.querySelector("#characterCanvas");
  const loader = document.querySelector("#modelLoader");
  const error = document.querySelector("#modelError");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  camera.position.set(0, 2.15, 8.7);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  scene.add(new THREE.HemisphereLight(0xe8ffe8, 0x1b2419, 2.15));
  const key = new THREE.DirectionalLight(0xffe6cc, 3.2); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xaaff35, 4.3); rim.position.set(3, 2, -4); scene.add(rim);
  const fill = new THREE.PointLight(0x9eea33, 24, 8); fill.position.set(0, 1.2, 3); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.35, 64), new THREE.MeshBasicMaterial({ color: 0x14251a, transparent: true, opacity: 0.72, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);

  try {
    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().load("./assets/3d_character_young_boy.glb", resolve, undefined, reject);
    });
    model = gltf.scene;
    model.traverse((node) => {
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 4.2 / Math.max(size.y, 0.001);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.userData.baseY = model.position.y;
    scene.add(model);
    loader.hidden = true;
    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 2.0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.75;
    controls.minPolarAngle = 0.42;
    controls.maxPolarAngle = Math.PI - 0.42;
    controls.update();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const clock = new THREE.Clock();
    const render = () => {
      animationFrame = requestAnimationFrame(render);
      if (!reduceMotion) model.position.y = model.userData.baseY + Math.sin(clock.getElapsedTime() * 0.8) * 0.025;
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    window.addEventListener("beforeunload", () => {
      observer.disconnect(); controls?.dispose(); renderer?.dispose(); cancelAnimationFrame(animationFrame);
    }, { once: true });
  } catch (loadError) {
    console.error("Could not load 3d_character_young_boy.glb:", loadError);
    loader.hidden = true;
    error.hidden = false;
  }
}

setupTimeline();
updateCheckpoint(0);
loadCharacter();
loadProjection();
