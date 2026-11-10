document.addEventListener("DOMContentLoaded", () => {
  const avatar = document.querySelector(".avatar");
  const logoutButton = document.querySelector(".logout-button");
  if (!avatar || !logoutButton) return;

  let authenticated = false;
  let statusReady = false;
  avatar.disabled = true;

  fetch("/api/users/status", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not check session status");
      return response.json();
    })
    .then(({ authenticated: isAuthenticated, user }) => {
      authenticated = Boolean(isAuthenticated);
      if (authenticated && user?.username) {
        avatar.querySelector("span").textContent = user.username.charAt(0).toUpperCase();
        avatar.setAttribute("aria-label", `Account for ${user.username}`);
      }
    })
    .catch((error) => console.error(error))
    .finally(() => {
      statusReady = true;
      avatar.disabled = false;
    });

  avatar.addEventListener("click", () => {
    if (!statusReady) return;
    if (!authenticated) {
      window.location.href = "/login.html";
      return;
    }

    logoutButton.hidden = !logoutButton.hidden;
    avatar.setAttribute("aria-expanded", String(!logoutButton.hidden));
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/users/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Could not log out");
      window.location.replace("/");
    } catch (error) {
      console.error(error);
      logoutButton.textContent = "Try again";
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".account-control")) {
      logoutButton.hidden = true;
      avatar.setAttribute("aria-expanded", "false");
    }
  });
});
