async function loadDashboard() {
  const heading = document.querySelector("#welcomeHeading");

  try {
    const response = await fetch("/api/users/status", {
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not check the account session");

    const { authenticated, user } = await response.json();
    if (!authenticated || !user) {
      window.location.replace("/login.html");
      return;
    }

    document.body.dataset.userId = user.id;
    heading.textContent = `Welcome, ${user.username}.`;
  } catch (error) {
    console.error(error);
    heading.textContent = "Could not load your account.";
  }
}

document.querySelector("#logoutButton").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/users/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Could not log out");
    window.location.replace("/");
  } catch (error) {
    console.error(error);
    document.querySelector("#logoutButton").textContent = "Try logging out again";
  }
});

loadDashboard();
