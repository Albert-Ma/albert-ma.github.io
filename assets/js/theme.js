(() => {
  const key = "xinyu-color-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }

  function apply() {
    const theme = ["light", "dark"].includes(preference) ? preference : system.matches ? "dark" : "light";
    const changed = document.documentElement.dataset.theme !== theme;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === "light" ? "#ffffff" : "#101211";
    const button = document.querySelector(".theme-toggle");
    if (button) {
      button.title = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
      button.setAttribute("aria-label", button.title);
    }
    if (changed) document.dispatchEvent(new Event("themechange"));
  }

  apply();
  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".theme-toggle");
    apply();
    button.hidden = false;
    button.addEventListener("click", () => {
      preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(key, preference); } catch { /* Apply for this page. */ }
      apply();
    });
  });
  system.addEventListener("change", apply);
  window.addEventListener("storage", event => {
    if (event.key === key || event.key === null) {
      preference = event.newValue;
      apply();
    }
  });
})();
