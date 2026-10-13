const KEY = 'bingo-tasks-v1';
const TOY = [
  ['Write the methods paragraph', 'Draft 150 words on the alignment + variant calling steps.'],
  ['Clean the sample sheet', 'Fix duplicated IDs and inconsistent date formats.'],
  ['Run FastQC on batch 2', 'Collect the MultiQC report and flag samples with adapter content.'],
  ['Refactor plot_volcano()', 'Split data wrangling from plotting; add a minimal example.'],
  ['Reply to reviewer emails', 'Only the ones waiting longer than a week.'],
  ['Back up the project folder', 'Verify the checksum of the copy.'],
  ['Read one paper from the queue', 'Take 3 bullet-point notes, no more.'],
  ['Tidy the bash pipeline README', 'Document inputs, outputs, and the one command to run it.'],
];

const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- storage ----------
let tasks = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return toy();
}
function toy() { return TOY.map(([title, description], i) => ({ id: Date.now() + i, title, description })); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {} }

// ---------- panes 1 & 2 ----------
function render() {
  $('count').textContent = tasks.length;
  $('tasks').innerHTML = tasks.length
    ? tasks.map(t => `<li class="${t.drawn ? 'drawn' : ''}"><div class="txt"><b>${esc(t.title)}</b><small>${esc(t.description || '')}</small></div>` +
        `<input type="checkbox" class="fin" data-id="${t.id}" title="Mark finished (removes it)"></li>`).join('')
    : '<li class="empty">No tasks yet.</li>';
}
$('task-form').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('title').value.trim();
  if (!title) return;
  tasks.push({ id: Date.now(), title, description: $('desc').value.trim() });
  save(); render(); e.target.reset(); $('title').focus();
});
$('tasks').addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (!id || !e.target.classList.contains('fin')) return;
  tasks = tasks.filter(t => String(t.id) !== id);
  save(); render();
});
$('reset').addEventListener('click', () => {
  if (confirm('Replace all tasks with the toy set?')) { tasks = toy(); save(); render(); }
});

// ---------- pane 3: bingo machine ----------
const COLORS = ['#e4572e', '#29a3a3', '#f2b705', '#6a4c93', '#3b8ea5', '#7cb518', '#ef476f', '#ff9f1c'];
const cv = $('cage'), ctx = cv.getContext('2d');
const W = cv.width, R = W / 2 - 8, C = W / 2, BR = 15;
const balls = Array.from({ length: 14 }, (_, i) => ({
  x: C + (Math.random() - .5) * R, y: C + R * .4, vx: 0, vy: 0, n: i + 1, c: COLORS[i % COLORS.length],
}));
let stir = 0, angle = 0;

function step() {
  angle += stir * 0.08;
  for (const b of balls) {
    b.vy += 0.35;                                   // gravity
    if (stir > 0) {                                 // air blast from below
      b.vy -= 0.9 * stir; b.vx += (Math.random() - .5) * 2.5 * stir;
    }
    b.vx *= 0.99; b.vy *= 0.99;
    b.x += b.vx; b.y += b.vy;
    const dx = b.x - C, dy = b.y - C, d = Math.hypot(dx, dy), max = R - BR;
    if (d > max) {                                  // bounce off the globe wall
      const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
      b.x = C + nx * max; b.y = C + ny * max;
      b.vx = (b.vx - 1.6 * dot * nx); b.vy = (b.vy - 1.6 * dot * ny);
    }
  }
  for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
    const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    if (d < BR * 2) {                               // push overlapping balls apart
      const o = (BR * 2 - d) / 2, nx = dx / d, ny = dy / d;
      a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
      const k = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      a.vx -= k * nx; a.vy -= k * ny; b.vx += k * nx; b.vy += k * ny;
    }
  }
}
function draw() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  ctx.clearRect(0, 0, W, W);
  ctx.lineWidth = 6; ctx.strokeStyle = dark ? '#888' : '#999';
  ctx.fillStyle = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)';
  ctx.beginPath(); ctx.arc(C, C, R, 0, 7); ctx.fill(); ctx.stroke();
  for (const b of balls) {
    ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.n, b.x, b.y + .5);
  }
  ctx.strokeStyle = dark ? '#aaa' : '#777'; ctx.lineWidth = 2;   // spinning cage bars
  for (let k = 0; k < 3; k++) {
    const a = angle + k * Math.PI / 3;
    ctx.beginPath(); ctx.moveTo(C + Math.cos(a) * R, C + Math.sin(a) * R);
    ctx.lineTo(C - Math.cos(a) * R, C - Math.sin(a) * R); ctx.globalAlpha = .25; ctx.stroke(); ctx.globalAlpha = 1;
  }
}
(function loop() { step(); draw(); requestAnimationFrame(loop); })();

const sleep = ms => new Promise(r => setTimeout(r, ms));
let busy = false;
$('draw').addEventListener('click', async () => {
  if (busy) return;
  const out = $('result'), ball = $('drop-ball');
  out.className = ''; out.innerHTML = '';
  if (!tasks.length) { out.textContent = 'Add a task first.'; return; }
  busy = true; $('draw').disabled = true;
  ball.className = 'ball-out';
  let pool = tasks.filter(t => !t.drawn);
  let newRound = false;
  if (!pool.length) { tasks.forEach(t => t.drawn = false); pool = tasks; newRound = true; }  // everything drawn: new round
  const pick = pool[Math.floor(Math.random() * pool.length)];   // choose up front; animation is theatre
  pick.drawn = true; save(); render();
  const left = tasks.filter(t => !t.drawn).length;
  $('crank').classList.add('spin'); stir = 1;
  await sleep(2400);
  stir = 0; $('crank').classList.remove('spin');
  ball.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
  ball.classList.add('fall');
  await sleep(900);
  out.className = 'show';
  out.innerHTML = `<h3>${esc(pick.title)}</h3><p>${esc(pick.description || '(no description)')}</p>` +
    `<small>${newRound ? 'New round started. ' : ''}${left} left this round</small>`;
  busy = false; $('draw').disabled = false;
});

render();
