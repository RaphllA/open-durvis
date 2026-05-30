const state = { messages: [], query: '', limit: 20, mode: 'fuzzy', manifest: null };
const $ = (id) => document.getElementById(id);

const WALL_IMAGES = [
  '1png.png','2.png','3.png','4.png','5.jpg','55.png','123.png','124.jpg','1244.jpg','234234.png','23123123.png','暗示对方23123.png','image.png','PixPin_2026-05-30_17-16-10.png','PixPin_2026-05-30_17-18-04.png','PixPin_2026-05-30_17-18-21.png'
];
function setupWall() {
  const wall = $('wall');
  if (!wall) return;
  const count = 56;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    d.className = 'wall-photo';
    d.style.backgroundImage = `url("backend/${WALL_IMAGES[i % WALL_IMAGES.length]}")`;
    d.style.setProperty('--offset', `${(i % 7) * 18}px`);
    wall.appendChild(d);
  }
}
function normalize(s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function terms(q) { return normalize(q).split(' ').filter(Boolean); }
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({'&':'&','<':'<','>':'>','"':'"'}[c])); }
function bigrams(s) { const x = normalize(s).replace(/\s+/g, ''); const arr = []; for (let i = 0; i < x.length - 1; i++) arr.push(x.slice(i, i + 2)); return arr; }
function fuzzyScore(query, text) {
  const q = normalize(query), t = normalize(text);
  if (!q) return 1;
  if (t.includes(q)) return 1;
  const qs = terms(q);
  const termHit = qs.length ? qs.filter(x => t.includes(x)).length / qs.length : 0;
  const qb = bigrams(q), tb = new Set(bigrams(t));
  const bi = qb.length ? qb.filter(x => tb.has(x)).length / qb.length : 0;
  let pos = 0, seq = 0;
  for (const ch of q) { const idx = t.indexOf(ch, pos); if (idx >= 0) { seq++; pos = idx + 1; } }
  const sub = q.length ? seq / q.length : 0;
  return Math.max(termHit, bi * 0.9, sub * 0.55);
}
function exactScore(query, m) {
  const ts = terms(query);
  if (!ts.length) return 1;
  const hay = normalize([m.content, m.author, m.channel, m.category, m.time, m.id].join(' '));
  return ts.every(t => hay.includes(t)) ? 1 : 0;
}
function scoreMessage(m) {
  const q = state.query;
  if (!normalize(q)) return 1;
  const hay = [m.content, m.author, m.channel, m.category, m.time, m.id].join(' ');
  if (state.mode === 'exact') return exactScore(q, m);
  return Math.max(exactScore(q, m), fuzzyScore(q, hay));
}
function highlight(text, query) {
  let out = esc(text || '');
  for (const t of terms(query).sort((a,b)=>b.length-a.length)) {
    if (!t) continue;
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, m => `<mark>${m}</mark>`);
  }
  return out;
}
async function loadData() {
  setupWall();
  const manifest = await fetch('data/manifest.json').then(r => r.json());
  state.manifest = manifest;
  const chunks = await Promise.all(manifest.chunks.map(c => fetch('data/' + c).then(r => r.json())));
  state.messages = chunks.flat();
  $('meta').textContent = `${manifest.total} 条消息 · ${manifest.copiedImages} 张截图 · ${manifest.generatedAt}`;
  render();
}
function render() {
  const scored = state.messages
    .map(m => ({ m, score: scoreMessage(m) }))
    .filter(x => !normalize(state.query) ? true : x.score > 0.08)
    .sort((a, b) => b.score - a.score || String(a.m.time).localeCompare(String(b.m.time)));
  const rows = scored.slice(0, state.limit);
  $('stats').textContent = `${state.mode === 'exact' ? '精确' : '模糊'}搜索 · 命中 ${scored.length} 条 · 显示前 ${rows.length} 条`;
  $('results').innerHTML = rows.length ? rows.map(x => card(x.m, x.score)).join('') : '<div class="empty">没有结果</div>';
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-copy');
    const msg = state.messages.find(m => m.id === id);
    navigator.clipboard.writeText(msg?.content || '');
    btn.textContent = '已复制';
    setTimeout(() => btn.textContent = '复制原文', 1000);
  }));
}
function titleOf(m) {
  const text = (m.content || '').replace(/\s+/g, ' ').trim();
  return text || '(无文字内容)';
}
function card(m, score) {
  const img = m.image ? `<img class="thumb" loading="lazy" src="${esc(m.image)}" alt="${esc(m.id)}" />` : '';
  const dl = m.image ? `<a href="${esc(m.image)}" download>下载图片</a>` : '';
  return `<article class="card">
    ${img}
    <div class="card-body">
      <p class="title">${highlight(titleOf(m), state.query)}</p>
      <div class="meta"><span>${esc(m.time)}</span><span>${esc(m.author)}</span><span>${score.toFixed(3)}</span></div>
      <div class="actions">${dl}<button data-copy="${esc(m.id)}">复制原文</button></div>
    </div>
  </article>`;
}
$('q').addEventListener('input', e => { state.query = e.target.value; render(); });
$('clear').addEventListener('click', () => { $('q').value = ''; state.query = ''; render(); });
$('mode').addEventListener('change', e => { state.mode = e.target.value; render(); });
$('limit').addEventListener('change', e => { state.limit = Number(e.target.value); render(); });
loadData().catch(err => { $('meta').textContent = '加载失败：' + err.message; console.error(err); });
