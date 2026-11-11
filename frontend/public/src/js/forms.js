const categoryNames = {
  "health-fitness": "Health & Fitness",
  "mind-digital": "Mind & Digital Wellbeing",
  "academics-career": "Academics & Career Growth",
  "lifestyle-growth": "Lifestyle & Personal Growth",
};

const categoryOrder = Object.keys(categoryNames);
const categoryForms = [...document.querySelectorAll("[data-category-form]")];
const categoryButtons = [...document.querySelectorAll("[data-category-select]")];
const categoryTitle = document.querySelector("#categoryTitle");
const categoryEyebrow = document.querySelector("#categoryEyebrow");
const toast = document.querySelector("#toast");
const analysisOverlay = document.querySelector("#analysisOverlay");
let activeCategoryId = null;
let toastTimer;

function setPath(target, path, value) {
  const parts = path.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) {
    current[part] ||= {};
    current = current[part];
  }
  current[parts.at(-1)] = value;
}

function getPath(source, path) {
  return path.split(".").reduce((value, part) => value?.[part], source);
}

function parseArrayField(type, rawValue) {
  const lines = rawValue.split("\n").map((line) => line.trim()).filter(Boolean);
  if (type === "string-list") {
    return rawValue.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }
  if (type === "skills") {
    return lines.map((line) => {
      const [name, level] = line.split("|").map((part) => part.trim());
      return { name, ...(level ? { level: Number(level) } : {}) };
    }).filter((item) => item.name);
  }
  if (type === "experiences") {
    return lines.map((line) => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      const acceptedTypes = new Set(["project", "hackathon", "internship", "certification", "other"]);
      const first = (parts[0] || "").toLowerCase();
      const hasType = acceptedTypes.has(first);
      const experienceType = hasType ? first : "other";
      const trailingDate = /^\d{4}-\d{2}-\d{2}$/.test(parts.at(-1) || "");
      const titleParts = hasType ? parts.slice(1, 2) : (trailingDate ? parts.slice(0, -1) : parts);
      const title = titleParts.join(" | ");
      const possibleDate = hasType ? parts[2] : trailingDate ? parts.at(-1) : null;
      const completedAt = /^\d{4}-\d{2}-\d{2}$/.test(possibleDate || "") ? possibleDate : null;
      return {
        type: experienceType,
        title,
        ...(title && completedAt ? { completedAt } : {}),
      };
    }).filter((item) => item.type && item.title);
  }
  if (type === "goals") {
    return lines.map((line) => {
      const [title, targetDate, progressPct] = line.split("|").map((part) => part.trim());
      return {
        title,
        ...(targetDate ? { targetDate } : {}),
        ...(progressPct ? { progressPct: Number(progressPct) } : {}),
      };
    }).filter((item) => item.title);
  }
  return [];
}

function serializeArrayField(type, value) {
  if (!Array.isArray(value)) return "";
  if (type === "string-list") return value.join(", ");
  if (type === "skills") return value.map((item) => `${item.name}${item.level ? ` | ${item.level}` : ""}`).join("\n");
  if (type === "experiences") return value.map((item) => `${item.type === "other" ? item.title : `${item.type} | ${item.title}`}${item.completedAt ? ` | ${String(item.completedAt).slice(0, 10)}` : ""}`).join("\n");
  if (type === "goals") return value.map((item) => `${item.title}${item.targetDate ? ` | ${String(item.targetDate).slice(0, 10)}` : ""}${item.progressPct != null ? ` | ${item.progressPct}` : ""}`).join("\n");
  return "";
}

function setFormValues(form, data) {
  for (const field of form.querySelectorAll("[data-path]")) {
    const value = getPath(data, field.dataset.path);
    if (value == null) continue;
    const type = field.dataset.valueType;
    field.value = type ? serializeArrayField(type, value) : String(value);
  }
}

function collectFormValues(form) {
  const data = {};
  for (const field of form.querySelectorAll("[data-path]")) {
    const rawValue = field.value.trim();
    const type = field.dataset.valueType;
    let value;

    if (["string-list", "skills", "experiences", "goals"].includes(type)) {
      value = parseArrayField(type, rawValue);
    } else if (rawValue === "") {
      value = null;
    } else if (type === "number" || field.type === "number") {
      value = Number(rawValue);
    } else {
      value = rawValue;
    }

    setPath(data, field.dataset.path, value);
  }
  return data;
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

async function analyzeWhenComplete(categoryId) {
  document.querySelector("#analysisOverlayMessage").textContent = `Reviewing ${categoryNames[categoryId]} and shaping measurable suggestions…`;
  analysisOverlay.hidden = false;
  const response = await fetch(`/api/analysis/category/${encodeURIComponent(categoryId)}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const result = await response.json();
  if (response.status === 401) {
    window.location.replace("/login.html");
    return false;
  }
  if (!response.ok) throw new Error(result.message || "Could not create your comparison.");
  sessionStorage.setItem("stackedAnalysisResult", JSON.stringify(result));
  sessionStorage.setItem("stackedSubmittedCategory", categoryId);
  localStorage.setItem("lastInsightCategoryId", categoryId);
  window.location.assign("/analysis.html");
  return true;
}

function selectCategory(categoryId) {
  if (!categoryNames[categoryId]) categoryId = categoryOrder[0];
  activeCategoryId = categoryId;
  localStorage.setItem("selectedCategoryId", categoryId);
  categoryTitle.textContent = categoryNames[categoryId];
  categoryEyebrow.textContent = `CATEGORY ${String(categoryOrder.indexOf(categoryId) + 1).padStart(2, "0")}`;

  for (const form of categoryForms) {
    form.hidden = form.dataset.categoryForm !== categoryId;
  }
  for (const button of categoryButtons) {
    const selected = button.dataset.categorySelect === categoryId;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-current", selected ? "step" : "false");
  }

  loadCategory(categoryId);
}

async function loadCategory(categoryId) {
  const form = categoryForms.find((item) => item.dataset.categoryForm === categoryId);
  if (!form) return;
  const message = form.querySelector(".save-message");
  message.textContent = "Loading saved answers…";
  try {
    const response = await fetch(`/api/categories/${categoryId}`, { credentials: "same-origin" });
    if (response.status === 401) return window.location.replace("/login.html");
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not load this category");
    if (result.data) setFormValues(form, result.data);
    message.textContent = result.data ? "Your saved answers are loaded." : "No answers saved yet.";
  } catch (error) {
    console.error(error);
    message.textContent = "Could not load saved answers.";
  }
}

async function checkSession() {
  try {
    const response = await fetch("/api/users/status", { credentials: "same-origin" });
    const result = await response.json();
    if (!response.ok || !result.authenticated) {
      window.location.replace("/login.html");
      return false;
    }
    document.body.dataset.userId = result.user.id;
    return true;
  } catch (error) {
    console.error(error);
    showToast("Could not verify your session. Please sign in again.", true);
    return false;
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => selectCategory(button.dataset.categorySelect));
});

categoryForms.forEach((form) => {
  const categoryId = form.dataset.categoryForm;
  form.addEventListener("focusin", (event) => {
    if (event.target.id) localStorage.setItem("selectedCategoryFieldId", event.target.id);
    localStorage.setItem("selectedCategoryId", categoryId);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector(".save-button");
    const message = form.querySelector(".save-message");
    button.disabled = true;
    message.textContent = "Saving…";

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectFormValues(form)),
      });
      if (response.status === 401) return window.location.replace("/login.html");
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save this category");
      setFormValues(form, result.data);
      message.textContent = "Saved to your profile.";
      await analyzeWhenComplete(categoryId);
    } catch (error) {
      console.error(error);
      message.textContent = error.message;
      analysisOverlay.hidden = true;
      showToast(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
});

categoryForms.forEach((form) => { form.hidden = true; });
categoryButtons.forEach((button) => button.classList.remove("active"));
checkSession().then((authenticated) => {
  if (!authenticated) return;
  const requestedCategory = localStorage.getItem("selectedCategoryId");
  selectCategory(categoryNames[requestedCategory] ? requestedCategory : categoryOrder[0]);
});
