// Positions are representative IANA time-zone coordinates on a Natural Earth basemap.
async function startVisitorMap() {
  const section = document.querySelector("#visitors");
  const totals = section.querySelector(".map-totals");
  const pins = section.querySelector(".map-pins");
  const list = section.querySelector(".region-list");
  const unknown = section.querySelector("#map-unknown");
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  let zones;
  try {
    const response = await fetch("/assets/data/visitor-zones.json");
    if (!response.ok) throw Error();
    zones = await response.json();
  } catch {
    totals.textContent = "Visitor map temporarily unavailable.";
    return;
  }

  let sessionId = crypto.randomUUID();
  try {
    const key = "xinyu-map-session";
    sessionId = sessionStorage.getItem(key) || sessionId;
    sessionStorage.setItem(key, sessionId);
  } catch {
    // Keep an in-memory session when browser storage is unavailable.
  }
  let selected = "";
  let registered = false;
  let refreshing = false;
  let lastRegions;

  function render(counts, localOnly = false) {
    const regions = Object.entries(counts)
      .filter(([key, count]) => Array.isArray(zones[key]) && count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const summary = total + (total === 1 ? " visit" : " visits") + " · " +
      regions.length + (regions.length === 1 ? " region" : " regions");
    totals.textContent = localOnly ? "This visit · Shared counts offline" : summary;
    unknown.textContent = counts.Unknown ? counts.Unknown + " unlocated" : "";
    const regionState = JSON.stringify(regions);
    if (regionState === lastRegions) return;
    lastRegions = regionState;
    const active = regions.some(([key]) => key === selected) ? selected : regions[0]?.[0];
    const focused = document.activeElement;
    const focusGroup = pins.contains(focused) ? pins : list.contains(focused) ? list : null;
    const focusedRegion = focused?.dataset.region;
    const scrollTop = list.scrollTop;
    pins.replaceChildren();
    list.replaceChildren();

    function select(key) {
      selected = key;
      for (const button of section.querySelectorAll("button[data-region]")) {
        button.setAttribute("aria-pressed", String(button.dataset.region === key));
      }
    }
    for (const [key, count] of regions) {
      const name = key.split("/").pop().replaceAll("_", " ");
      const label = name + " time zone · " + count + (count === 1 ? " visit" : " visits");
      const [lat, lon] = zones[key];
      const pin = document.createElement("button");
      pin.className = "map-pin";
      pin.style.left = ((lon + 180) / 360 * 100) + "%";
      pin.style.top = ((90 - lat) / 180 * 100) + "%";
      pin.title = label;
      pin.setAttribute("aria-label", label);
      const text = document.createElement("button");
      text.textContent = name + " · " + count;
      for (const button of [pin, text]) {
        button.type = "button";
        button.dataset.region = key;
        button.setAttribute("aria-pressed", String(key === active));
        button.addEventListener("click", () => select(key));
      }
      const item = document.createElement("li");
      item.append(text);
      list.append(item);
      pins.append(pin);
    }
    list.scrollTop = scrollTop;
    if (focusGroup && focusedRegion) {
      const buttons = [...focusGroup.querySelectorAll("button")];
      const next = buttons.find(button => button.dataset.region === focusedRegion)
        || buttons.find(button => button.dataset.region === active);
      next?.focus({preventScroll:true});
    }
  }

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const options = registered ? {} : {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:sessionId, zone})
      };
      const response = await fetch(section.dataset.endpoint, {...options, cache:"no-store"});
      if (!response.ok) throw Error();
      const {counts} = await response.json();
      if (!counts || typeof counts !== "object") throw Error();
      registered = true;
      render(counts);
    } catch {
      if (registered) {
        totals.textContent = "Showing last available visit counts";
      } else {
        const canonical = typeof zones[zone] === "string" ? zones[zone] : zone;
        render({[Array.isArray(zones[canonical]) ? canonical : "Unknown"]:1}, true);
      }
    } finally {
      refreshing = false;
    }
  }
  await refresh();
  window.setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
}

startVisitorMap();
