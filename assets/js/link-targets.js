// Let the browser handle local links, including fragments and downloadable files.
function setExternalLinkTarget(link) {
  if ((link.protocol === "http:" || link.protocol === "https:") && link.origin !== location.origin) {
    link.target = "_blank";
    link.relList.add("noopener");
  }
}

for (const link of document.links) setExternalLinkTarget(link);

// Links inserted by the map and other widgets can appear after the page loads.
document.addEventListener("click", event => {
  const link = event.target.closest?.("a[href]");
  if (link) setExternalLinkTarget(link);
}, true);
