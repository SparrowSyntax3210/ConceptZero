const navAvatar = document.querySelector("#navAvatar");
const navLogout = document.querySelector("#navLogout");
const navLinks = [...document.querySelectorAll(".app-links a")];

function markActiveLink() {
  const path = window.location.pathname;
  for (const link of navLinks) {
    const active =
      link.pathname === path ||
      ((path === "/dashboard.html" || path === "/forms.html") &&
        link.pathname === "/tracker.html");
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

async function loadNavUser() {
  try {
    const response = await fetch("/api/users/status", {
      credentials: "same-origin",
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated || !result.user) {
      window.location.replace("/login.html");
      return;
    }
    document.body.dataset.userId = result.user.id;
    navAvatar.textContent = result.user.username.charAt(0).toUpperCase();
    navAvatar.setAttribute("aria-label", `Account for ${result.user.username}`);
  } catch (error) {
    console.error("Could not load account menu:", error);
  }
}

navAvatar.addEventListener("click", () => {
  navLogout.hidden = !navLogout.hidden;
  navAvatar.setAttribute("aria-expanded", String(!navLogout.hidden));
});

navLogout.addEventListener("click", async () => {
  navLogout.disabled = true;
  try {
    const response = await fetch("/api/users/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not log out.");
    sessionStorage.removeItem("stackedInsightsViewsV1");
    sessionStorage.removeItem("stackedFutureSelfLetterV1");
    sessionStorage.removeItem("stackedAnalysisResult");
    sessionStorage.removeItem("stackedSubmittedCategory");
    window.location.replace("/");
  } catch (error) {
    navLogout.disabled = false;
    navLogout.textContent = error.message;
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".app-account")) {
    navLogout.hidden = true;
    navAvatar.setAttribute("aria-expanded", "false");
  }
});

markActiveLink();
loadNavUser();
