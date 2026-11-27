const publicationTopics = {
  "agent-memory": "Agent memory",
  "agentic-search": "Agentic search",
  "post-training": "Reasoning & post-training",
  "web-ranking": "Web ranking",
  rag: "RAG & AI search",
  "generative-retrieval": "Generative retrieval",
  "neural-retrieval": "Neural retrieval",
  "ir-pretraining": "IR pre-training",
  "model-editing": "Model editing",
  recommendation: "Recommendation",
  evaluation: "Benchmarks & evaluation"
};
const sections = [
  {title:"Research profile", type:"Profile", url:"/#overview", terms:"current research directions agents llm large language models baidu search ranking AI Overview 研究方向"},
  {title:"Agent RSI", type:"Research", url:"/#agent-rsi", terms:"recursive self-improvement llm agents large language models 递归自我改进 自进化"},
  {title:"Agent post-training", type:"Research", url:"/#agent-post-training", terms:"posttraining post training llm agents large language models 后训练"},
  {title:"Selected research", type:"Papers", url:"/research/", terms:"selected publications featured papers starred research 代表作 精选论文"},
  {title:"Publications", type:"Archive", url:"/publications/", terms:"all papers publication list 所有论文 发表 论文列表"},
  {title:"News", type:"Section", url:"/news/", terms:"news updates highlights awards best paper ecir 2026 positional bias reasonrank bright 获奖 新闻 近况"},
  {title:"Experience & education", type:"Background", url:"/experience/", terms:"career experience education phd advisor jiafeng guo baidu agents shandong cas 工作 经历 教育 导师"},
  {title:"Honors and Awards", type:"Awards", url:"/awards/", terms:"honors awards graduate scholarship travel grant 荣誉 奖项"},
  {title:"Curriculum vitae", type:"PDF", url:"/files/XinyuMa_CV_en_2026-11-27.pdf", terms:"cv resume 简历"},
  {title:"Email Xinyu", type:"Contact", url:"mailto:xinyuma2016@gmail.com", terms:"contact email 联系 邮箱"},
  {homeOnly:true, title:"Google Scholar", type:"Profile", url:"https://scholar.google.com/citations?user=DXYzAIkAAAAJ&hl=en", terms:"citations scholar 谷歌学术 引用"},
  {title:"OpenReview", type:"Profile", url:"https://openreview.net/profile?id=~Xinyu_Ma4", terms:"openreview profile 学术主页"}
];
const profileAnswers = [
  {
    prompt:"Research focus", match:/research (focus|interests?|areas?)|what.*(work on|research)|研究(方向|兴趣|什么)|主要做什么/i,
    answer:"At Baidu I work on Agent RSI (recursive self-improvement) and Agent post-training for large language models. Previously, I worked on training ranking models (2023–2024) and AI Overview (2025–2026) for Baidu Search.",
    chinese:"我现在在百度研究基于大语言模型的智能体，聚焦 Agent RSI（递归自我改进）和 Agent post-training（智能体后训练）。此前在百度搜索从事排序模型训练（2023–2024）和 AI Overview（2025–2026）相关工作。",
    source:"Research profile", url:"/#overview"
  },
  {
    prompt:"Paper awards", match:/paper awards?|award.winning|what.*awards?|获奖|得过.*奖|哪些.*奖/i,
    answer:"Our listwise reranking paper won Best Paper at ECIR 2026. Our work on ChatGPT as a re-ranking agent received an Outstanding Paper Award at EMNLP 2023.",
    chinese:"我们关于列表重排与位置偏差的论文获得了 ECIR 2026 最佳论文奖。关于 ChatGPT 重排能力的研究获得了 EMNLP 2023 杰出论文奖。",
    source:"News", url:"/news/"
  },
  {
    prompt:"Ph.D. advisor", match:/advisor|supervisor|where.*(study|ph\.?d)|博士|导师/i,
    answer:"I earned my Ph.D. in Computer Science at the Institute of Computing Technology, Chinese Academy of Sciences, in 2023, advised by Prof. Jiafeng Guo.",
    chinese:"我于 2023 年在中国科学院计算技术研究所取得计算机科学博士学位，导师是郭嘉丰教授。",
    source:"Experience", url:"/experience/"
  }
];
const dialog = document.createElement("dialog");
dialog.setAttribute("aria-label","Search this site");
dialog.innerHTML = '<header><span class="icon" aria-hidden="true">&#xf002;</span><input type="search" aria-label="Search papers, people, or topics" placeholder="Search papers, people, or topics…" autocomplete="off"><button aria-label="Close search">Close</button></header><div class="prompts" aria-label="Suggested questions"></div><div class="answer" hidden></div><div class="results"></div><span class="sr-only" role="status"></span>';
document.body.append(dialog);
const query = dialog.querySelector("input");
const results = dialog.querySelector(".results");
const prompts = dialog.querySelector(".prompts");
const answerBox = dialog.querySelector(".answer");
for (const entry of profileAnswers) {
  const button = document.createElement("button");
  button.textContent = entry.prompt;
  button.addEventListener("click", () => {
    query.value = entry.prompt;
    renderResults();
    query.focus();
  });
  prompts.append(button);
}
let papers, loading, loadError = false;
function indexPapers(doc) {
  return Array.from(doc.querySelectorAll(".pub"), item => ({
    title:(item.querySelector(".paper-title") || item.querySelector("h3")).textContent,
    url:"/publications/#"+item.id,
    type:"Paper",
    entry:item,
    topics:(item.dataset.topics || "").split(/\s+/).filter(Boolean),
    terms:item.textContent
  }));
}
async function loadPapers() {
  if (papers) return;
  if (document.querySelector(".pub")) {
    papers = indexPapers(document);
    return;
  }
  if (!loading) {
    loadError = false;
    loading = fetch("/publications/").then(response => {
      if (!response.ok) throw Error("Archive unavailable");
      return response.text();
    }).then(html => { papers = indexPapers(new DOMParser().parseFromString(html,"text/html")); })
      .catch(() => { loadError = true; }).finally(() => { loading = null; });
  }
  await loading;
}
// The archive supplies the card content; publication metadata controls the selection.
async function showSelectedPapers(grid) {
  grid.setAttribute("aria-busy", "true");
  grid.replaceChildren();
  try {
    const [metadata] = await Promise.all([
      fetch("/assets/data/publications.json").then(response => {
        if (!response.ok) throw Error("Publication metadata unavailable");
        return response.json();
      }),
      loadPapers()
    ]);
    if (!papers) throw Error("Archive unavailable");

    const selected = papers.filter(({entry}) => metadata[entry.id]?.starred === true);
    const published = ({entry}) => metadata[entry.id].published || entry.closest("section").querySelector(".pub-year").textContent.trim();
    const preprint = ({entry}) => metadata[entry.id].preprint || "";
    selected.sort((a,b) => published(b).localeCompare(published(a))
      || preprint(b).localeCompare(preprint(a))
      || a.title.localeCompare(b.title, "en"));

    const columnsPerPage = 5;
    const cardsPerPage = columnsPerPage * 2;
    const cards = selected.map(({entry}, index) => {
      const card = document.createElement("a");
      card.className = "card";
      // Fill each five-column spread in reading order before extending it to the right.
      const firstColumn = Math.floor(index / cardsPerPage) * columnsPerPage + 1;
      card.style.setProperty("--paper-column", firstColumn + index % columnsPerPage);
      card.style.setProperty("--paper-row", Math.floor((index % cardsPerPage) / columnsPerPage) + 1);
      card.href = entry.querySelector(".resources a").getAttribute("href");
      setExternalLinkTarget(card);
      const body = document.createElement("div");
      body.className = "card-body";
      for (const node of entry.querySelectorAll(".card-body > small, .card-body > h3, .card-body > p")) {
        body.append(node.cloneNode(true));
      }
      const action = document.createElement("strong");
      action.textContent = "Read paper ↗︎";
      body.append(action);
      let cover = entry.querySelector(".art").cloneNode(true);
      const award = body.querySelector(".paper-award");
      if (award) {
        const venue = award.parentElement;
        award.remove();
        venue.remove();
        card.classList.add("award-card", ...Array.from(award.classList).filter(name => name.startsWith("prize-")));
        cover = document.createElement("div");
        cover.className = "art award-cover";
        const emblem = document.createElement("i");
        emblem.setAttribute("aria-hidden", "true");
        const awardName = document.createElement("b");
        awardName.textContent = award.textContent;
        cover.append(venue, emblem, awardName);
      }
      card.append(cover, body);
      return card;
    });
    grid.replaceChildren(...cards);
    grid.querySelectorAll("canvas[data-art]").forEach(canvas => paperArtObserver.observe(canvas));
  } catch {
    const retry = document.createElement("button");
    retry.className = "button";
    retry.textContent = "Retry loading selected papers";
    retry.addEventListener("click", () => showSelectedPapers(grid));
    grid.replaceChildren(retry);
  } finally {
    grid.setAttribute("aria-busy", "false");
  }
}
const selectedGrid = document.getElementById("selected-publications");
if (selectedGrid) {
  document.addEventListener("DOMContentLoaded", () => showSelectedPapers(selectedGrid), {once:true});
}
function renderResults() {
  const aliases = {检索:"retrieval",智能体:"agent",排序:"ranking",重排:"reranking",大模型:"language models",基准:"benchmark"};
  let term = query.value.trim().toLowerCase();
  for (const [word, alias] of Object.entries(aliases)) term=term.replaceAll(word," "+alias+" ");
  const words=term.match(/[\p{L}\p{N}]+/gu) || [];
  const normalized = words.join(" ");
  const topicKey = Object.keys(publicationTopics).find(key =>
    [key, publicationTopics[key]].some(label => label.toLowerCase().match(/[a-z0-9]+/g).join(" ") === normalized)
  );
  const found=[...sections,...(papers || [])].map(item => {
    if (item.homeOnly && document.body.dataset.page !== "home") return null;
    if (topicKey && item.topics) return item.topics.includes(topicKey) ? {item, score:5} : null;
    const title=item.title.toLowerCase();
    const labels=(item.topics || []).map(key => publicationTopics[key] || key).join(" ");
    const body=(item.terms+" "+labels).toLowerCase();
    if (!words.every(word=>title.includes(word)||body.includes(word))) return null;
    const score=words.reduce((sum,word)=>sum+(title.includes(word)?5:1),0);
    return {item,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const answer = profileAnswers.find(entry => entry.match.test(query.value));
  answerBox.hidden = !answer;
  answerBox.replaceChildren();
  if (answer) {
    const body = document.createElement("p"), source = document.createElement("a");
    body.textContent = /[\u3400-\u9fff]/.test(query.value) ? answer.chinese : answer.answer;
    source.textContent = answer.source+" →";
    source.href = answer.url;
    setExternalLinkTarget(source);
    answerBox.append(body,source);
  }
  results.replaceChildren();
  const shown=words.length ? found : found.slice(0,5);
  for (const {item} of shown) {
    const link=document.createElement("a"), text=document.createElement("span"), type=document.createElement("small");
    link.href=item.url;
    setExternalLinkTarget(link);
    text.textContent=item.title;type.textContent=item.type+" ↗︎";
    link.append(text,type);results.append(link);
  }
  if ((!found.length && !answer) || loadError) {
    const notice=document.createElement("p");
    notice.textContent=loadError ? "The publication archive could not be loaded. Reopen search to retry." : loading ? "Searching publications…" : "No matches. Try a topic, author, or year.";
    results.append(notice);
  }
  dialog.querySelector('[role="status"]').textContent=shown.length+" results";
}
async function openSearch() {
  if (!dialog.open) dialog.showModal();
  query.value="";query.focus();renderResults();await loadPapers();renderResults();
}
document.querySelector("[data-open-search]").addEventListener("click",openSearch);
dialog.querySelector("button").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{
  if (event.target.closest(".results a, .answer a") || event.target===dialog) dialog.close();
});
query.addEventListener("input",renderResults);
document.addEventListener("keydown",event=>{
  if ((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==="k") {
    event.preventDefault();openSearch();
  }
  if (!dialog.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    dialog.close();
    return;
  }
  const links=Array.from(dialog.querySelectorAll(".answer a, .results a"));
  if (["ArrowDown","ArrowUp"].includes(event.key) && links.length) {
    event.preventDefault();
    const index=links.indexOf(document.activeElement);
    links[event.key==="ArrowDown" ? (index+1)%links.length : (Math.max(0,index)-1+links.length)%links.length].focus();
  } else if (event.key==="Enter" && document.activeElement===query && links.length) {
    event.preventDefault();links[0].click();
  }
});
if (!/Mac|iPhone|iPad/.test(navigator.platform)) document.querySelector(".find kbd").textContent="Ctrl K";
// Preserve bookmarks from the former single-page layout.
if (document.body.dataset.page === "home") {
  const oldSections = {
    updates:"/news/", "highlight-title":"/news/", "highlight-archive-year":"/news/#highlight-archive-year",
    "thesis-defense":"/news/#thesis-defense", research:"/research/", "selected-work":"/research/",
    "selected-publications":"/research/#selected-publications", background:"/experience/",
    "experience-title":"/experience/", awards:"/awards/", "awards-title":"/awards/",
    "qian-award-details":"/awards/#honors-2024"
  };
  function followOldSection() {
    const id = location.hash.slice(1);
    const destination = /^honors-\d{4}$/.test(id) ? "/awards/#" + id : Object.hasOwn(oldSections, id) && oldSections[id];
    if (destination) location.replace(destination);
  }
  followOldSection();
  window.addEventListener("hashchange", followOldSection);
}

// Direct year links select the same native control used by the timeline.
function openLinkedAwardYear() {
  const year = /^#honors-(\d{4})$/.exec(location.hash);
  if (!year) return;
  const choice = document.querySelector('.honors-track input[value="' + year[1] + '"]');
  if (choice) {
    choice.checked = true;
    document.getElementById(choice.getAttribute("aria-controls")).scrollIntoView({block:"nearest"});
  }
}
openLinkedAwardYear();
window.addEventListener("hashchange", openLinkedAwardYear);


// Frames already have their final dimensions in CSS. Only decorate pending images.
for (const img of document.querySelectorAll(".highlight-photo img, .organization-mark img")) {
  if (img.complete) continue;
  const frame = img.parentElement;
  frame.classList.add("media-pending");
  const finish = () => {
    frame.classList.remove("media-pending");
    img.removeEventListener("load", finish);
    img.removeEventListener("error", finish);
  };
  img.addEventListener("load", finish);
  img.addEventListener("error", finish);
}
