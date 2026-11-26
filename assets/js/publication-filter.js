(() => {
  const filter = document.querySelector(".topic-filter");
  const options = filter.querySelector(".topic-options");
  const total = filter.querySelector(".topic-total");
  const years = [...document.querySelectorAll("section[aria-labelledby^='year-']")];
  const papers = [...document.querySelectorAll(".pub-grid .pub")];
  const buttons = new Map();

  function matches(paper, topic) {
    return topic === "all" || (paper.dataset.topics || "").split(" ").includes(topic);
  }

  function show(topic) {
    if (!buttons.has(topic)) topic = "all";
    let count = 0;
    for (const paper of papers) {
      paper.hidden = !matches(paper, topic);
      if (!paper.hidden) count++;
    }
    for (const year of years) year.hidden = !year.querySelector(".pub:not([hidden])");
    for (const [key, button] of buttons) button.setAttribute("aria-pressed", String(key === topic));
    total.textContent = count + (count === 1 ? " paper" : " papers");
  }

  for (const [key, label] of Object.entries({all: "All topics", ...publicationTopics})) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      const url = new URL(location.href);
      if (key === "all") url.searchParams.delete("topic");
      else url.searchParams.set("topic", key);
      url.hash = "";
      history.pushState(null, "", url);
      show(key);
    });
    buttons.set(key, button);
    options.append(button);
  }

  function restore() {
    show(new URLSearchParams(location.search).get("topic"));
  }
  window.addEventListener("popstate", restore);
  restore();
  filter.hidden = false;
})();
