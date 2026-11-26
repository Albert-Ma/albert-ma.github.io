// Illustrative surfaces and textures are drawn at the device's pixel density.
function fitCanvas(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  return { ctx, width, height };
}

function drawArt(canvas) {
  const {ctx, width:w, height:h} = fitCanvas(canvas);
  const kind = canvas.dataset.art;
  const phase = Number(canvas.dataset.variant || 0) * .63;
  const palette = document.documentElement.dataset.theme === "light"
    ? {search:"73,115,48", retrieval:"117,83,151", agents:"54,114,127"}
    : {search:"170,220,113", retrieval:"183,157,229", agents:"134,202,218"};
  const color = palette[kind];
  for (let y = 7; y < h; y += 13) for (let x = 8; x < w; x += 13) {
    ctx.fillStyle = 'rgba('+color+',.16)';ctx.fillRect(x,y,1,1);
  }
  ctx.save();
  ctx.translate(w*.56,h*.56);
  ctx.scale(w/370,h/135);
  if (kind === "retrieval") {
    // An isometric lattice of document vectors.
    for (let row = 0; row < 13; row++) for (let col = 0; col < 22; col++) {
      const x=(col-10)*10-(row-6)*7, y=(col-10)*2.4+(row-6)*4.6;
      const height=4+36*Math.exp(-((col-14)**2/24+(row-5)**2/15))+12*(1+Math.sin(row*.9+col*.4+phase));
      ctx.fillStyle='rgba('+color+',.26)';ctx.fillRect(x,y-height,2,height);
      ctx.fillStyle='rgba('+color+',.9)';ctx.fillRect(x-1,y-height,4,2);
    }
  } else {
    const flow = kind === "agents";
    for (let line = 0; line < (flow ? 64 : 52); line++) {
      ctx.beginPath();
      for (let k=0;k<=240;k++) {
        const t=k/240*Math.PI*2;
        const r=19+line*2.2;
        const wobble=1+.14*Math.sin(3*t+line*.035+phase)+.09*Math.cos(5*t-line*.025);
        const x=flow ? (103+27*Math.cos(3*t+line*.058+phase))*Math.cos(t+line*.013) : r*wobble*Math.cos(t)*1.25;
        const y=flow ? (36+17*Math.cos(3*t+line*.058+phase))*Math.sin(t+line*.013)+21*Math.sin(2*t+line*.085) : r*wobble*Math.sin(t)*.39+Math.sin(2*t)*r*.12+(line-26)*.42;
        if (k) ctx.lineTo(x,y); else ctx.moveTo(x,y);
      }
      ctx.closePath();ctx.lineWidth=flow?.55:.7;
      ctx.strokeStyle='rgba('+color+','+(.32+(.25*(1+Math.sin(line*.19))))+')';ctx.stroke();
    }
  }
  ctx.restore();
}

// Draw nearby covers over successive frames, leaving time for input and scrolling.
const pendingCovers = new Set();
const paintedCovers = new WeakMap();
let coverFrame = 0;

function paintNextCover() {
  coverFrame = 0;
  for (const canvas of pendingCovers) {
    pendingCovers.delete(canvas);
    const size = canvas.getBoundingClientRect();
    if (!size.width || !size.height) continue;
    const signature = [size.width, size.height, devicePixelRatio, document.documentElement.dataset.theme].join("/");
    if (paintedCovers.get(canvas) === signature) continue;
    drawArt(canvas);
    paintedCovers.set(canvas, signature);
    break;
  }
  if (pendingCovers.size) coverFrame = requestAnimationFrame(paintNextCover);
}

function queueCover(canvas) {
  pendingCovers.add(canvas);
  if (!coverFrame) coverFrame = requestAnimationFrame(paintNextCover);
}

const nearbyCovers = new Set();
const coverSizes = new ResizeObserver(entries => {
  for (const {target} of entries) if (nearbyCovers.has(target)) queueCover(target);
});
const paperArtObserver = new IntersectionObserver(entries => {
  for (const {target, isIntersecting} of entries) {
    if (isIntersecting) {
      nearbyCovers.add(target);
      coverSizes.observe(target);
      queueCover(target);
    } else {
      nearbyCovers.delete(target);
      pendingCovers.delete(target);
      coverSizes.unobserve(target);
    }
  }
}, {rootMargin:"180px"});

document.querySelectorAll("canvas[data-art]").forEach(canvas => paperArtObserver.observe(canvas));
document.addEventListener("themechange", () => nearbyCovers.forEach(queueCover));
