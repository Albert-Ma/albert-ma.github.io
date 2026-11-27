(() => {
  const key = "xinyu-color-theme";
  let preference = document.documentElement.dataset.theme;

  function apply() {
    const theme = preference === "light" ? "light" : "dark";
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
      try { sessionStorage.setItem(key, preference); } catch { /* Apply for this page. */ }
      apply();
    });
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      try { preference = sessionStorage.getItem(key); } catch { /* Keep this page’s theme. */ }
      apply();
    }
  });
})();
