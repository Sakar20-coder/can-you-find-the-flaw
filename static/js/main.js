// ======================== MAIN.JS – FULL CTF CLIENT (with welcome overlay) ========================
let solvedStages = [];

// ----- Leaderboard pagination variables (new) -----
let lbPage = 0;
const LB_PER_PAGE = 8;

// ----- Helper: Toast messages -----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.style.background = 'rgba(0,0,0,0.85)';
  toast.style.backdropFilter = 'blur(12px)';
  toast.style.borderLeft = `4px solid ${type === 'success' ? '#28c840' : '#e55a1c'}`;
  toast.style.padding = '10px 18px';
  toast.style.borderRadius = '12px';
  toast.style.fontFamily = "'JetBrains Mono', monospace";
  toast.style.fontSize = '0.75rem';
  toast.style.color = '#eee';
  toast.style.marginBottom = '8px';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.2s';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// ----- Speech: Welcome to the arena -----
function speakWelcome(name) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`Welcome to the arena, ${name}.`);
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  utterance.volume = 1;
  utterance.lang = 'en-US';
  setTimeout(() => window.speechSynthesis.speak(utterance), 50);
}

// ----- Timer (localStorage) -----
let startTime = parseInt(localStorage.getItem('ctf_startTime') || '0');
let timerInterval = null;

function startGlobalTimer() {
  if (timerInterval) clearInterval(timerInterval);
  if (!startTime) {
    startTime = Date.now();
    localStorage.setItem('ctf_startTime', startTime);
  }
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  const timerSpan = document.getElementById('timerValue');
  if (timerSpan) timerSpan.innerText = `${hours}:${minutes}:${seconds}`;
}

// ----- Backend API calls -----
async function fetchCounter() {
  try {
    const res = await fetch('/api/counter', { credentials: 'include' });
    const data = await res.json();
    const counterEl = document.getElementById('counter');
    if (counterEl) counterEl.innerText = `🔍 ${data.total} people have found the flaw so far`;
  } catch (err) {
    console.error('Counter fetch failed', err);
  }
}

async function checkSolved() {
  try {
    const res = await fetch('/api/check_solved', { credentials: 'include' });
    const data = await res.json();
    solvedStages = data.solved || [];
    renderStages();
    // NEW: after we know the solved stages, send progress to backend for leaderboard
    updatePlayerProgress();
  } catch (err) {
    console.error('Check solved failed', err);
  }
}

function renderStages() {
  const container = document.getElementById('stages');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= 4; i++) {
    let unlocked = false;
    if (i === 1) unlocked = true;
    else if (solvedStages.includes(i - 1)) unlocked = true;
    container.appendChild(createStageCard(i, unlocked));
  }
}

function createStageCard(stage, unlocked) {
  const div = document.createElement('div');
  div.className = `stage-card ${unlocked ? '' : 'locked'}`;
  if (!unlocked) div.style.opacity = '0.5';
  div.id = `stage${stage}`;

  const titles = {
    1: '01 · Password Reset (JWT None)',
    2: '02 · API Gateway (JSONP)',
    3: '03 · Product Listing (Blind SQLi)',
    4: '04 · Avatar Upload (XXE)'
  };
  const descriptions = {
    1: '<code>POST /api/stage1/forgot</code> – request a reset token.<br><code>POST /api/stage1/reset</code> – submit token for verification.',
    2: '<code>GET /api/stage2/flag</code> – fetch something? Try different parameters.<br><code>POST /api/stage2/submit</code> – submit what you find.',
    3: '<code>GET /api/stage3/products?sort=name</code> – sort product list.<br><code>POST /api/stage3/submit</code> – submit the hidden secret.',
    4: '<code>POST /api/stage4/upload</code> – upload an avatar (SVG).<br><code>POST /api/stage4/submit</code> – submit the flag after extraction.'
  };
  const defaultMethods = {1:'POST',2:'GET',3:'GET',4:'POST'};
  const defaultUrls = {
    1:'/api/stage1/forgot',
    2:'/api/stage2/flag',
    3:'/api/stage3/products?sort=name',
    4:'/api/stage4/upload'
  };
  const defaultHeaders = {
    1:'{"Content-Type": "application/json"}',
    2:'{"Content-Type": "application/json"}',
    3:'{"Content-Type": "application/json"}',
    4:'{"Content-Type": "multipart/form-data"}'
  };
  const defaultBodies = {
    1:'{"email": "admin@ctf.local"}',
    2:'{}',
    3:'{}',
    4:''
  };

  div.innerHTML = `
    <div class="stage-header">
      <span>${titles[stage]}</span>
      ${unlocked ? '<span class="status-active">ACTIVE</span>' : '<span class="status-locked">LOCKED</span>'}
    </div>
    <div class="stage-body">
      <p>${descriptions[stage]}</p>
      <div class="request-builder">
        <div class="rb-row">
          <select id="method${stage}">
            <option>${defaultMethods[stage]}</option>
            ${stage === 2 || stage === 3 ? '<option>POST</option>' : ''}
          </select>
          <input type="text" id="url${stage}" value="${defaultUrls[stage]}" size="50">
        </div>
        <label class="rb-label">Headers (JSON)</label>
        <textarea id="headers${stage}" rows="2">${defaultHeaders[stage]}</textarea>
        <label class="rb-label">Body (JSON or file data)</label>
        <textarea id="body${stage}" rows="3">${defaultBodies[stage]}</textarea>
        <div class="rb-actions">
          <button class="btn btn-primary" onclick="sendRequest(${stage})">SEND REQUEST</button>
          <button class="btn btn-secondary" onclick="getHint(${stage})">HINT</button>
        </div>
      </div>
      <div class="response-terminal">
        <div class="rt-header"><div class="rt-dot"></div><div class="rt-dot"></div><div class="rt-dot"></div><span class="rt-title">RESPONSE</span></div>
        <div class="rt-body" id="response${stage}"><span class="placeholder">// awaiting request...</span></div>
      </div>
      <div class="hint-box" id="hint${stage}" style="display:none;"></div>
    </div>
  `;
  return div;
}

// Expose sendRequest and getHint globally
window.sendRequest = async function(stage) {
  const method = document.getElementById(`method${stage}`).value;
  let url = document.getElementById(`url${stage}`).value;
  if (!url.startsWith('/')) url = '/' + url;
  const headersText = document.getElementById(`headers${stage}`).value;
  let bodyText = document.getElementById(`body${stage}`).value;
  let headers = {};
  try {
    headers = JSON.parse(headersText);
  } catch(e) {
    document.getElementById(`response${stage}`).innerHTML = `<span class="err">Invalid headers JSON</span>`;
    return;
  }

  let fetchOptions = { method, headers, credentials: 'include' };
  if (method !== 'GET' && bodyText.trim()) fetchOptions.body = bodyText;

  // For stage 4 file upload, show a helpful message
  if (stage === 4 && method === 'POST' && url.includes('upload')) {
    document.getElementById(`response${stage}`).innerHTML = `<span class="err">File uploads require curl or similar. Example: curl -F "file=@payload.svg" ${url}</span>`;
    return;
  }

  try {
    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    const respEl = document.getElementById(`response${stage}`);
    respEl.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    if (data.solved === true) {
      showToast(`🎉 Flag found: ${data.flag}`, 'success');
      await checkSolved();   // this will also trigger updatePlayerProgress and fetchLeaderboard
    }
    if (data.total_winners) {
      document.getElementById('counter').innerText = `🔍 ${data.total_winners} people have found the flaw so far`;
    }
  } catch(err) {
    document.getElementById(`response${stage}`).innerHTML = `<span class="err">Error: ${err.message}</span>`;
  }
};

window.getHint = async function(stage) {
  try {
    const res = await fetch(`/api/hint/${stage}`, { credentials: 'include' });
    const data = await res.json();
    const hintDiv = document.getElementById(`hint${stage}`);
    hintDiv.innerHTML = `<strong>Hint:</strong> ${data.hint}`;
    hintDiv.style.display = 'block';
  } catch(err) {
    showToast('Hint not available', 'error');
  }
};

// ----- Prize claim -----
const claimBtn = document.getElementById('claimBtn');
if (claimBtn) {
  claimBtn.addEventListener('click', async () => {
    const prizeDiv = document.getElementById('prizeResponse');
    if (!prizeDiv) return;
    try {
      const res = await fetch('/api/claim', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        prizeDiv.innerHTML = `
          <div style="background: rgba(40,200,64,0.2); border-left:4px solid #28c840; padding:1rem; border-radius:12px;">
            <p>${data.message}</p>
            <p><strong>QR Token:</strong> ${data.qr_text}</p>
            <p>Total winners: ${data.total_winners}</p>
            <p><em>Show this to the organizer to claim your prize!</em></p>
          </div>
        `;
        const counterEl = document.getElementById('counter');
        if (counterEl) counterEl.innerText = `🔍 ${data.total_winners} people have found the flaw so far`;
      } else {
        prizeDiv.innerHTML = `<div style="background: rgba(192,57,43,0.2); padding:1rem;">${data.error}</div>`;
      }
    } catch(err) {
      prizeDiv.innerHTML = `<div style="background: rgba(192,57,43,0.2);">Error claiming prize</div>`;
    }
  });
}

// ======================== NEW LEADERBOARD (LIVE) ========================
async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    renderLeaderboard(data);
  } catch(e) {
    console.error('Leaderboard fetch failed', e);
  }
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('lbBody');
  if (!tbody) return;
  if (!players.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">No solvers yet. Be the first.</td></tr>';
    document.getElementById('lbPageInfo').innerText = 'Showing 0 entries';
    return;
  }
  const start = lbPage * LB_PER_PAGE;
  const slice = players.slice(start, start + LB_PER_PAGE);
  const totalPages = Math.ceil(players.length / LB_PER_PAGE);
  tbody.innerHTML = slice.map((p, i) => {
    const rank = start + i + 1;
    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'other';
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const isMe = (p.callsign === callsign);
    const stageDots = [1,2,3,4].map(n => `<div class="lb-stage-dot ${p.solved_count >= n ? 'done' : ''}">${n}</div>`).join('');
    const timeStr = secondsToHms(p.elapsed_seconds);
    return `<tr class="${isMe ? 'my-row' : ''}">
      <td><span class="lb-rank ${rankClass}">${rankEmoji}</span></td>
      <td class="lb-handle">${escapeHtml(p.callsign)}${isMe ? '<span class="you-tag">YOU</span>' : ''}</td>
      <td><div class="lb-stages">${stageDots}</div></td>
      <td class="lb-time">${timeStr}</td>
    </tr>`;
  }).join('');
  // Pagination controls
  const btnWrap = document.getElementById('lbPageBtns');
  if (totalPages <= 1) {
    btnWrap.innerHTML = '';
  } else {
    let btns = `<button class="lb-page-btn" onclick="lbGo(${lbPage-1})" ${lbPage===0?'disabled':''}>‹</button>`;
    for (let p=0; p<totalPages; p++) {
      btns += `<button class="lb-page-btn ${p===lbPage?'active':''}" onclick="lbGo(${p})">${p+1}</button>`;
    }
    btns += `<button class="lb-page-btn" onclick="lbGo(${lbPage+1})" ${lbPage===totalPages-1?'disabled':''}>›</button>`;
    btnWrap.innerHTML = btns;
  }
  document.getElementById('lbPageInfo').innerText = `Showing ${players.length} entries`;
}

function secondsToHms(sec) {
  if (!sec && sec !== 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.lbGo = function(p) {
  const totalPlayers = 0; // we'll fetch fresh data; we can re-fetch leaderboard after page change
  // Actually we need to know total pages from current data. Simplest: re-fetch and then set lbPage.
  // But we can just re-fetch leaderboard and re-render with new page.
  lbPage = Math.max(0, Math.min(p, 100)); // temporary, will be recalculated on render
  fetchLeaderboard();
};

async function updatePlayerProgress() {
  if (!callsign) return;
  const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
  try {
    await fetch('/api/update_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ solved: solvedStages, elapsed_seconds: elapsedSec })
    });
    // Refresh leaderboard after update
    fetchLeaderboard();
  } catch(e) {
    console.error('Progress update failed', e);
  }
}

// ======================== AUTHENTICATION FLOW ========================
const authModal = document.getElementById('authModal');
const gameContainer = document.getElementById('gameContainer');
const callsignInput = document.getElementById('callsignInput');
const enterBtn = document.getElementById('enterArenaBtn');
const callsignDisplaySpan = document.getElementById('callsignDisplay');

let callsign = ''; // will be set during auth

async function submitCallsignToBackend(callsign) {
  try {
    const res = await fetch('/api/set_callsign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ callsign })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function authenticateAndEnter(rawCallsign) {
  if (!rawCallsign.trim()) {
    showToast('Callsign cannot be empty', 'error');
    return false;
  }
  const sanitized = rawCallsign.trim().replace(/[<>/\\]/g, '').slice(0, 30);
  if (sanitized.length === 0) return false;

  const success = await submitCallsignToBackend(sanitized);
  if (!success) {
    showToast('Server error. Try again.', 'error');
    return false;
  }

  callsign = sanitized;
  if (callsignDisplaySpan) callsignDisplaySpan.innerText = sanitized;
  if (authModal) authModal.style.display = 'none';

  // Show the full-screen welcome overlay
  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const welcomeCallsignSpan = document.getElementById('welcomeCallsign');
  if (welcomeOverlay && welcomeCallsignSpan) {
    welcomeCallsignSpan.innerText = sanitized.toUpperCase();
    welcomeOverlay.style.display = 'flex';
  }

  speakWelcome(sanitized);
  showToast(`Access granted, ${sanitized}. Entering arena...`, 'success');

  if (!startTime) {
    startTime = Date.now();
    localStorage.setItem('ctf_startTime', startTime);
  }
  startGlobalTimer();

  // Wait 2.5 seconds, then fade out overlay and show game container
  setTimeout(() => {
    if (welcomeOverlay) {
      welcomeOverlay.style.opacity = '0';
      setTimeout(() => {
        welcomeOverlay.style.display = 'none';
        welcomeOverlay.style.opacity = '';
      }, 500);
    }
    if (gameContainer) {
      gameContainer.style.display = 'flex';
      void gameContainer.offsetHeight;
      gameContainer.classList.add('visible');
    }
  }, 2500);

  await fetchCounter();
  await checkSolved();
  // NEW: fetch leaderboard after login
  fetchLeaderboard();
  return true;
}

async function checkExistingSession() {
  try {
    const res = await fetch('/api/check_solved', { credentials: 'include' });
    if (res.status === 401 || res.status === 403) {
      if (authModal) authModal.style.display = 'flex';
      if (gameContainer) gameContainer.style.display = 'none';
      return;
    }
    const data = await res.json();
    if (data.callsign) {
      callsign = data.callsign;
      if (callsignDisplaySpan) callsignDisplaySpan.innerText = data.callsign;
      if (authModal) authModal.style.display = 'none';
      if (gameContainer) {
        gameContainer.style.display = 'flex';
        gameContainer.classList.add('visible');
      }
      startGlobalTimer();
      await fetchCounter();
      await checkSolved();
      showToast(`Welcome back, ${data.callsign}.`, 'info');
      // NEW: fetch leaderboard on session resume
      fetchLeaderboard();
    } else {
      if (authModal) authModal.style.display = 'flex';
    }
  } catch (err) {
    if (authModal) authModal.style.display = 'flex';
  }
}

// Event listeners
if (enterBtn) enterBtn.addEventListener('click', () => authenticateAndEnter(callsignInput.value));
if (callsignInput) {
  callsignInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') authenticateAndEnter(callsignInput.value);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', checkExistingSession);

// ===== NEW HOMEPAGE FUNCTIONS (append to main.js) =====

// Update progress strip
function updateProgress() {
  const solved = solvedStages || [];
  const pct = Math.round((solved.length / 4) * 100);
  const pctEl = document.getElementById('ps-pct');
  if (pctEl) pctEl.textContent = pct + '%';

  for (let i = 0; i < 4; i++) {
    const node = document.getElementById('ps-node-' + i);
    const line = document.getElementById('ps-line-' + i);
    if (!node) continue;
    node.classList.remove('active', 'done');
    if (solved.includes(i)) {
      node.classList.add('done');
      const numEl = node.querySelector('.ps-num');
      if (numEl) {
        numEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      }
      if (line) line.classList.add('done');
    } else if (solved.length === i || (i === 0 && solved.length === 0)) {
      node.classList.add('active');
    }
  }
}

// Theme toggle
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('ctf_theme', t);
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');
  if (sun && moon) {
    sun.style.display = t === 'dark' ? 'block' : 'none';
    moon.style.display = t === 'light' ? 'block' : 'none';
  }
}
function getTheme() { return localStorage.getItem('ctf_theme') || 'dark'; }

// Event listeners (these do not replace your existing ones)
document.addEventListener('DOMContentLoaded', function() {
  // Theme toggle
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  }
  setTheme(getTheme());

  // CTA button -> scroll to stages
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const section = document.getElementById('stages-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Progress nodes -> scroll to stages
  for (let i = 0; i < 4; i++) {
    const node = document.getElementById('ps-node-' + i);
    if (node) {
      node.addEventListener('click', function() {
        const section = document.getElementById('stages-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // Nav links -> smooth scroll
  document.querySelectorAll('.header-nav-inner .nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = this.getAttribute('href');
      if (target && target.startsWith('#')) {
        const section = document.querySelector(target);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // If user already authenticated, update progress and leaderboard
  if (typeof callsign !== 'undefined' && callsign) {
    updateProgress();
    if (typeof fetchLeaderboard === 'function') fetchLeaderboard();
  }
});
