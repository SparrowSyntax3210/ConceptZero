const letterRoot = document.querySelector("#letterRoot");
const letterCacheKey = "stackedFutureSelfLetterV1";

function escapeLetter(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderLetter(result) {
  const letter = result.letter || {};
  const paragraphs = Array.isArray(letter.paragraphs) ? letter.paragraphs : [];
  letterRoot.innerHTML = `<section class="letter-intro"><span class="letter-eyebrow">A MOMENT FROM THE FUTURE</span><h1>A note from <span>you.</span></h1><p>A hopeful reflection from a version of you who kept showing up for the small things.</p></section>
    <article class="letter-card"><div class="letter-paper-mark" aria-hidden="true">✉</div><p class="letter-subject">${escapeLetter(letter.subject || "A letter to my past self")}</p><p class="letter-greeting">${escapeLetter(letter.greeting || "Dear me,")}</p><div class="letter-body">${paragraphs.map((paragraph) => `<p>${escapeLetter(paragraph)}</p>`).join("")}</div><p class="letter-signoff">${escapeLetter(letter.signoff || "With care,")}</p><span class="letter-future-label">${escapeLetter(letter.futureSelfLabel || "A possible future you")}</span></article>
    <p class="letter-grounding">${escapeLetter(letter.groundingNote || result.disclaimer || "A hopeful reflection based on your check-in, not a prediction.")}</p><div class="letter-actions"><button type="button" id="rewriteLetter">Write another reflection</button></div>`;
  letterRoot.querySelector("#rewriteLetter")?.addEventListener("click", () => loadLetter(true));
}

async function loadLetter(force = false) {
  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(letterCacheKey) || "null");
      if (cached?.letter) {
        renderLetter(cached);
        return;
      }
    } catch {
      sessionStorage.removeItem(letterCacheKey);
    }
  }

  letterRoot.innerHTML = `<section class="letter-intro"><span class="letter-eyebrow">A MOMENT FROM THE FUTURE</span><h1>A note from <span>you.</span></h1><p>A hopeful reflection from a version of you who kept showing up for the small things.</p></section><section class="letter-loading"><span class="letter-spinner"></span><p>Gathering your small steps…</p></section>`;
  try {
    const response = await fetch("/api/analysis/letter", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = await response.json();
    if (response.status === 401) return window.location.replace("/login.html");
    if (!response.ok) throw new Error(result.message || "Could not write your letter.");
    sessionStorage.setItem(letterCacheKey, JSON.stringify(result));
    renderLetter(result);
  } catch (error) {
    letterRoot.innerHTML = `<section class="letter-intro"><span class="letter-eyebrow">A MOMENT FROM THE FUTURE</span><h1>A note from <span>you.</span></h1><p>A hopeful reflection from a version of you who kept showing up for the small things.</p></section><section class="letter-error"><h2>Your letter is not ready yet.</h2><p>${escapeLetter(error.message)}</p><button type="button" id="retryLetter">Try again</button></section>`;
    letterRoot.querySelector("#retryLetter")?.addEventListener("click", () => loadLetter(true));
  }
}

loadLetter();
