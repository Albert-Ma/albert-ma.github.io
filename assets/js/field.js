function landscape(canvas, peak, angle, yearButtons) {
  const { ctx, width, height } = fitCanvas(canvas);
  if (!width || !height) return [];
  const day = document.documentElement.dataset.theme === "light";
  const mesh = day ? "72,114,66" : "188,228,140";
  const crossMesh = day ? "79,119,77" : "175,213,130";
  // The trail runs from the far right toward the reader, ending just left of center.
  const hills = [
    {x:.94, z:-.70, height:.22, spread:.11},
    {x:.28, z:-.08, height:.77, spread:.145},
    {x:-.30, z:.57, height:1.16, spread:.24}
  ];
  const cos = Math.cos(angle), sin = Math.sin(angle);
  function terrainAt(x, z) {
    const ripple = 4*x + 3*z;
    let altitude = .025 * (1 + Math.sin(ripple));
    let dx = .1 * Math.cos(ripple), dz = .075 * Math.cos(ripple);
    for (const hill of hills) {
      const u = x - hill.x, v = z - hill.z;
      const rise = hill.height * Math.exp(-(u*u + v*v) / hill.spread);
      altitude += rise;
      dx -= 2*u*rise / hill.spread;
      dz -= 2*v*rise / hill.spread;
    }
    // A fixed light from the upper left models the curved face of each hill.
    const light = Math.max(0, (.72 + .62*dx - .30*dz) / Math.hypot(dx, 1, dz));
    return {altitude, light};
  }
  function project(x, z, altitude) {
    const horizontal = cos*x - sin*z;
    const depth = sin*x + cos*z;
    const scale = 1 / (1 - .35*depth - .09*altitude);
    return [width * (.50 + .36*horizontal*scale), height * (.68 + (.35*depth - .39*altitude)*scale)];
  }
  const surface = (x, z, lift = 0) => project(x, z, terrainAt(x, z).altitude + lift);
  function line(points, color, weight) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  }

  ctx.fillStyle = "#8aa87835";
  for (let x=17; x<width; x+=25) {
    for (let y=14; y<height; y+=25) ctx.fillRect(x,y,1,1);
  }
  // Extend the foreground and sides beyond the frame at both drag limits.
  const rows = 68, columns = 112;
  function rowAt(z) {
    const points = [], lighting = [];
    for (let col=0; col<=columns; col++) {
      const x = -1.85 + col/columns*3.7;
      const {altitude, light} = terrainAt(x,z);
      points.push(project(x,z,altitude));
      lighting.push(light);
    }
    return {points, lighting};
  }
  let back = rowAt(-1);
  for (let row=1; row<=rows; row++) {
    const depth = row/rows;
    const front = rowAt(2.48*depth - 1);
    const points = front.points;
    const left = points[0][0], span = points[columns][0]-left;
    const shade = ctx.createLinearGradient(left,0,left+span,0);
    for (let col=0; col<=columns; col+=4) {
      const lit = front.lighting[col] * (.65 + .35*depth);
      const stop = Math.max(0,Math.min(1,(points[col][0]-left)/span));
      const surfaceColor = day
        ? `rgb(${177+55*lit} ${200+40*lit} ${172+51*lit})`
        : `rgb(${15+36*lit} ${28+49*lit} ${20+18*lit})`;
      shade.addColorStop(stop, surfaceColor);
    }
    ctx.beginPath();
    ctx.moveTo(...back.points[0]);
    for (const point of back.points.slice(1)) ctx.lineTo(...point);
    for (let col=columns; col>=0; col--) ctx.lineTo(...points[col]);
    ctx.closePath();
    ctx.fillStyle = shade;
    ctx.fill();
    line(points, 'rgba('+mesh+',' + (.27+.52*depth) + ')', row%4===0 ? .95 : .6);
    ctx.beginPath();
    for (let col=0; col<=columns; col+=2) {
      ctx.moveTo(...back.points[col]);
      ctx.lineTo(...points[col]);
    }
    ctx.strokeStyle = 'rgba('+crossMesh+',' + (.2+.5*depth) + ')';
    ctx.lineWidth = .58;
    ctx.stroke();
    back = front;
  }

  // Follow the actual surface between summits, including the valleys.
  function surfacePath(anchors, lift) {
    const path = [];
    for (let i = 1; i < anchors.length; i++) {
      const from = anchors[i - 1], to = anchors[i];
      for (let step = 0; step <= 36; step++) {
        const t = step / 36;
        path.push(surface(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, lift));
      }
    }
    return path;
  }
  const trail = surfacePath(hills, .012);
  ctx.setLineDash([2,4]);
  line(trail,day ? "#476c35" : "#d9ff9ab5",1.4);
  ctx.setLineDash([]);
  const route = trail.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
  trailLight.style.offsetPath = 'path("' + route + '")';

  const summits = hills.map(hill => surface(hill.x,hill.z));
  // Intersect the summit's screen column with the near slope at the tick's depth.
  // This keeps each year on the mesh and directly below its peak as the view turns.
  function slopePoint(screenX, z) {
    let left = -1.85, right = 1.85;
    for (let i = 0; i < 18; i++) {
      const x = (left + right) / 2;
      if (surface(x,z)[0] < screenX) left = x;
      else right = x;
    }
    return {x:(left + right) / 2, z};
  }
  const [[searchX], [ragX], [agentX]] = summits;
  const yearAnchors = [
    slopePoint(agentX, hills[2].z + .37),
    slopePoint(ragX, hills[1].z + .40),
    slopePoint((ragX + searchX) / 2, .12),
    slopePoint(searchX, hills[0].z + .43)
  ];
  yearButtons[2].classList.toggle("label-above", (searchX - ragX) / 2 < yearButtons[2].offsetWidth + 2);
  const axis = surfacePath(yearAnchors, 0);
  line(axis, day ? "#f8fcf0bb" : "#152016bc", 2.8);
  line(axis, day ? "#436647" : "#c6ddb7dc", 1);
  yearButtons.forEach((button, i) => {
    const anchor = yearAnchors[i];
    const tick = surface(anchor.x, anchor.z);
    button.style.left = tick[0] + "px";
    button.style.top = tick[1] + "px";
  });
  hills.forEach((hill,index) => {
    const [x,y] = summits[index];
    const button = stageButtons[index];
    const active = index===peak;
    const labelBottom = Math.max(button.offsetHeight+3, y-9);
    const marker = day ? (active ? "#305922" : "#566e55") : (active ? "#dcff9d" : "#bac9a3");
    line([[x,y],[x,labelBottom]],marker,1);
    ctx.beginPath();
    ctx.arc(x,y,active ? 4 : 2.5,0,Math.PI*2);
    ctx.fillStyle = marker;
    ctx.fill();
    button.style.left = x+"px";
    button.style.top = labelBottom+"px";

    // The affiliation sits on the camera-facing slope, independently of its summit button.
    const offset = index===2 ? .28 : .21;
    const [tx,ty] = surface(hill.x+sin*offset,hill.z+cos*offset);
    ctx.save();
    ctx.translate(tx,ty);
    ctx.rotate(-.07 + angle*.09);
    const size = Math.max(10, Math.min(width/43,14)) * (1+.20*index);
    ctx.font = '600 '+size+'px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = day ? "#eaf4e3" : "#1b291c";
    ctx.strokeText(button.dataset.affiliation,0,0);
    ctx.fillStyle = day ? "#25482d" : active ? "#e2ffae" : "#d2debf";
    ctx.fillText(button.dataset.affiliation,0,0);
    ctx.restore();
  });
  return summits;
}

const terrain = document.querySelector("#landscape");
const trailLight = document.querySelector(".trail-light");
const stageButtons = [...document.querySelectorAll(".peaks button")];
if (terrain) {
  const viewport = terrain.parentElement;
  const timeline = viewport.querySelector(".stage-timeline");
  const timelineButtons = [...timeline.querySelectorAll("button")];
  let peak = stageButtons.findIndex(button => button.getAttribute("aria-pressed") === "true");
  let angle = .19;
  let summits = [];
  let drag = null;
  let frame = 0;
  function draw() {
    summits = landscape(terrain, peak, angle, timelineButtons);
  }
  function select(index, yearButton) {
    peak = index;
    stageButtons.forEach((stage, i) => {
      stage.setAttribute("aria-pressed", String(i === peak));
      document.getElementById(stage.getAttribute("aria-controls")).hidden = i !== peak;
    });
    const selectedPanel = stageButtons[peak].getAttribute("aria-controls");
    const activeYear = yearButton ?? timelineButtons.findLast(button => button.getAttribute("aria-controls") === selectedPanel);
    for (const button of timelineButtons) {
      button.setAttribute("aria-pressed", String(button === activeYear));
    }
    draw();
  }
  // Both groups follow their visual left-to-right order for arrow-key navigation.
  for (const controls of [[...stageButtons].reverse(), timelineButtons]) {
    controls.forEach((button, position) => {
      const index = stageButtons.findIndex(stage => stage.getAttribute("aria-controls") === button.getAttribute("aria-controls"));
      button.addEventListener("click", () => select(index, controls === timelineButtons ? button : undefined));
      button.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const step = event.key === "ArrowLeft" ? -1 : 1;
        const next = controls[(position + step + controls.length) % controls.length];
        next.focus();
        next.click();
      });
    });
  }
  let suppressPointerClick = false;
  viewport.addEventListener("click", event => {
    if (suppressPointerClick && event.detail > 0) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  viewport.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressPointerClick = false;
    drag = {x:event.clientX, angle, moved:false, target:event.target};
    event.target.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", event => {
    if (!event.isPrimary || !drag) return;
    const dx = event.clientX - drag.x;
    drag.moved ||= Math.abs(dx) > 5;
    if (!drag.moved) return;
    angle = Math.max(-.32, Math.min(.32, drag.angle + dx / terrain.clientWidth * 1.5));
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
  });
  viewport.addEventListener("pointerup", event => {
    if (!drag || !event.isPrimary) return;
    suppressPointerClick = drag.moved;
    if (!drag.moved && drag.target === terrain && summits.length) {
      const box = terrain.getBoundingClientRect();
      const distances = summits.map(([x,y]) => Math.hypot(event.clientX-box.left-x, event.clientY-box.top-y));
      select(distances.indexOf(Math.min(...distances)));
    }
    drag = null;
  });
  viewport.addEventListener("lostpointercapture", () => { drag = null; });
  const observer = new ResizeObserver(draw);
  observer.observe(terrain);
  document.addEventListener("themechange", draw);
}
