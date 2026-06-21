// ======================== MAIN.JS – FULL CTF CLIENT ========================
let solvedStages = [];
let lbPage = 0;
const LB_PER_PAGE = 8;
let startTime = parseInt(localStorage.getItem('ctf_startTime') || '0');
let timerInterval = null;
let callsign = '';
let allPlayers = [];
let achievementShown = {};

// ----- Toast -----
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

// ----- Speech -----
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

// ----- Timer (server‑side) -----
function updateServerTimer() {
  fetch('/api/session_status', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.elapsed !== undefined) {
        const hrs = String(Math.floor(data.elapsed / 3600)).padStart(2, '0');
        const mins = String(Math.floor((data.elapsed % 3600) / 60)).padStart(2, '0');
        const secs = String(data.elapsed % 60).padStart(2, '0');
        const timerSpan = document.getElementById('timerValue');
        if (timerSpan) timerSpan.innerText = `${hrs}:${mins}:${secs}`;
      }
    })
    .catch(() => { });
}

function startGlobalTimer() {
  if (timerInterval) clearInterval(timerInterval);
  updateServerTimer();
  timerInterval = setInterval(updateServerTimer, 2000);
}

// ----- Backend API calls -----
async function fetchCounter() {
  try {
    const res = await fetch('/api/counter', { credentials: 'include' });
    const data = await res.json();
    const counterEl = document.getElementById('counter');
    if (counterEl) counterEl.innerText = `🔍 ${data.total} people have found the flaw so far`;
    const statSolvers = document.getElementById('stat-solvers');
    if (statSolvers) statSolvers.innerText = data.total;
  } catch (err) {
    console.error('Counter fetch failed', err);
  }
}

async function checkSolved() {
  try {
    const res = await fetch('/api/check_solved', { credentials: 'include' });
    const data = await res.json();
    const prevSolved = [...solvedStages];
    solvedStages = data.solved || [];
    callsign = data.callsign || '';
    renderStages();
    updateProgress();
    updatePrizeLock();
    updatePlayerProgress();

    const newStages = solvedStages.filter(s => !prevSolved.includes(s));
    if (newStages.length > 0) {
      newStages.forEach(stage => {
        showStageAchievement(stage + 1);
      });
    }

    if (solvedStages.length === 4 && prevSolved.length < 4) {
      setTimeout(() => showFullAchievement(), 800);
    }
  } catch (err) {
    console.error('Check solved failed', err);
  }
}

function showStageAchievement(stageNum) {
  const emojis = ['🔓', '🛡️', '💎', '🚀'];
  const titles = ['STAGE 1 COMPLETE!', 'STAGE 2 COMPLETE!', 'STAGE 3 COMPLETE!', 'STAGE 4 COMPLETE!'];
  const subs = [
    'You bypassed the rate limit and reset the password!',
    'You exploited the JSONP leak!',
    'You poisoned the cache and leaked the flag!',
    'You exploited the blind SQL injection!'
  ];
  showToast(`${emojis[stageNum - 1]} ${titles[stageNum - 1]} ${subs[stageNum - 1]}`, 'success');
}

function showFullAchievement() {
  const overlay = document.getElementById('achievementOverlay');
  const title = document.getElementById('achievementTitle');
  const sub = document.getElementById('achievementSub');
  const emoji = document.getElementById('achievementEmoji');
  const stagesSolved = document.getElementById('achStagesSolved');
  const rank = document.getElementById('achPlayerRank');
  const total = document.getElementById('achTotalSolvers');

  const sorted = sortPlayers(allPlayers);
  const playerRank = sorted.findIndex(p => p.callsign === callsign) + 1;
  const totalSolvers = sorted.length;

  const celebrationEmojis = ['🎉', '🎊', '👏', '🏆', '⭐', '🔥', '💪', '🚀'];
  const randomEmoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];

  emoji.textContent = randomEmoji;
  title.textContent = '🏆 YOU DID IT!';
  sub.textContent = `You're the #${playerRank} person to solve all 4 challenges!`;
  stagesSolved.textContent = '4';
  rank.textContent = `#${playerRank}`;
  total.textContent = totalSolvers;

  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#1dd1a1'];
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = (Math.random() * 8 + 4) + 'px';
    confetti.style.height = (Math.random() * 8 + 4) + 'px';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confetti.style.animationDelay = (Math.random() * 2) + 's';
    container.appendChild(confetti);
  }

  overlay.classList.add('show');

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Congratulations ${callsign}! You solved all 4 challenges! You are number ${playerRank} to complete the arena!`
    );
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    setTimeout(() => window.speechSynthesis.speak(utterance), 300);
  }
}

document.getElementById('achievementBtn')?.addEventListener('click', function () {
  document.getElementById('achievementOverlay').classList.remove('show');
  document.getElementById('prize').scrollIntoView({ behavior: 'smooth' });
});

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
    1: '01 · Forgot Password (Rate Limit Bypass)',
    2: '02 · API Gateway (JSONP)',
    3: '03 · Profile Viewer (Cache Poisoning)',
    4: '04 · Product Sorting (Blind SQLi)'
  };
  const descriptions = {
    1: '<code>POST /api/stage1/forgot</code> – answer the security question.<br>You have 3 attempts per IP. Can you bypass the limit?<br><code>GET /api/internal/notes</code> – hidden endpoint with <code>X-Admin: true</code>',
    2: '<code>GET /api/stage2/flag</code> – fetch something? Try different parameters.<br><code>POST /api/stage2/submit</code> – submit what you find.',
    3: '<code>GET /api/stage3/profile</code> – view your profile.<br>Try using <code>X-Original-URL</code> to poison the cache.',
    4: '<code>GET /api/stage4/products?sort=name</code> – blind SQL injection in ORDER BY.<br><code>POST /api/stage4/submit</code> – submit the extracted flag.'
  };
  const defaultMethods = { 1: 'POST', 2: 'GET', 3: 'GET', 4: 'POST' };
  const defaultUrls = {
    1: '/api/stage1/forgot',
    2: '/api/stage2/flag',
    3: '/api/stage3/profile',
    4: '/api/stage4/products?sort=name'
  };
  const defaultHeaders = {
    1: '{"Content-Type": "application/json"}',
    2: '{"Content-Type": "application/json"}',
    3: '{"Content-Type": "application/json", "X-Original-URL": "/admin/flag"}',
    4: '{"Content-Type": "application/json"}'
  };
  const defaultBodies = {
    1: '{"answer": ""}',
    2: '{}',
    3: '{}',
    4: '{}'
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
            ${stage === 1 || stage === 4 ? '<option>GET</option>' : ''}${stage === 2 || stage === 3 || stage === 4 ? '<option>POST</option>' : ''}
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

// ================================================================
// FIXED sendRequest – unlocks next stage immediately
// ================================================================
window.sendRequest = async function (stage) {
  const method = document.getElementById(`method${stage}`).value;
  let url = document.getElementById(`url${stage}`).value;
  if (!url.startsWith('/')) url = '/' + url;
  const headersText = document.getElementById(`headers${stage}`).value;
  let bodyText = document.getElementById(`body${stage}`).value;
  let headers = {};
  try {
    headers = JSON.parse(headersText);
  } catch (e) {
    document.getElementById(`response${stage}`).innerHTML = `<span class="err">Invalid headers JSON</span>`;
    return;
  }

  let fetchOptions = { method, headers, credentials: 'include' };
  if (method !== 'GET' && bodyText.trim()) fetchOptions.body = bodyText;

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

      // === FIX: update local solvedStages immediately ===
      if (!solvedStages.includes(stage)) {
        solvedStages.push(stage);
      }
      // Re‑render the stages so the next one unlocks instantly
      renderStages();
      updateProgress();
      updatePrizeLock();
      // Send progress to server and refresh leaderboard (async)
      updatePlayerProgress();
      fetchLeaderboard();

      // If callsign is missing, fetch it silently
      if (!callsign) {
        try {
          const csRes = await fetch('/api/check_solved', { credentials: 'include' });
          const csData = await csRes.json();
          if (csData.callsign) callsign = csData.callsign;
        } catch (e) { }
      }
      // Optionally sync with server (non‑blocking)
      setTimeout(checkSolved, 300);
    }
    if (data.total_winners) {
      document.getElementById('counter').innerText = `🔍 ${data.total_winners} people have found the flaw so far`;
    }
  } catch (err) {
    document.getElementById(`response${stage}`).innerHTML = `<span class="err">Error: ${err.message}</span>`;
  }
};

window.getHint = async function (stage) {
  try {
    const res = await fetch(`/api/hint/${stage}`, { credentials: 'include' });
    const data = await res.json();
    const hintDiv = document.getElementById(`hint${stage}`);
    hintDiv.innerHTML = `<strong>Hint:</strong> ${data.hint}`;
    hintDiv.style.display = 'block';
  } catch (err) {
    showToast('Hint not available', 'error');
  }
};

// ======================== SCORING (per‑stage time limits) ========================

function calculateScore(player) {
  const solved = player.solved_count || 0;
  const totalTime = player.elapsed_seconds || 0;
  const stageLimits = [600, 1500, 1800, 1200];
  let score = solved * 500;
  if (solved === 4 && totalTime > 0) {
    const totalLimit = stageLimits.reduce((a, b) => a + b, 0);
    const ratio = Math.max(0, Math.min(1, 1 - (totalTime / totalLimit)));
    const bonus = Math.round(ratio * 500);
    score += bonus;
  } else if (solved > 0 && solved < 4) {
    const avgTime = totalTime / solved;
    const avgLimit = stageLimits.slice(0, solved).reduce((a, b) => a + b, 0) / solved;
    const ratio = Math.max(0, Math.min(1, 1 - (avgTime / avgLimit)));
    const bonus = Math.round(ratio * 200);
    score += bonus;
  }
  return score;
}

// ======================== LEADERBOARD ========================

function sortPlayers(players) {
  return [...players].sort((a, b) => {
    if (a.solved_count !== b.solved_count) {
      return b.solved_count - a.solved_count;
    }
    return (a.elapsed_seconds || 0) - (b.elapsed_seconds || 0);
  });
}

let leaderboardPollInterval = null;

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    allPlayers = data;
    renderLeaderboard(data);
  } catch (e) {
    console.error('Leaderboard fetch failed', e);
  }
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('lbBody');
  if (!tbody) return;

  const sorted = sortPlayers(players);

  const podiumPlayers = sorted.slice(0, 3);
  const podiumSlots = [
    { id: 'podium-1' },
    { id: 'podium-2' },
    { id: 'podium-3' }
  ];

  podiumSlots.forEach((slot, index) => {
    const el = document.getElementById(slot.id);
    if (!el) return;
    const player = podiumPlayers[index];
    if (player) {
      el.querySelector('.podium-handle').textContent = player.callsign || '—';
      el.querySelector('.podium-stages').textContent = `${player.solved_count || 0}/4`;
      el.querySelector('.podium-time').textContent = secondsToHms(player.elapsed_seconds);
      el.querySelector('.podium-score').textContent = calculateScore(player);
      el.style.display = 'flex';
    } else {
      el.querySelector('.podium-handle').textContent = '—';
      el.querySelector('.podium-stages').textContent = '0/4';
      el.querySelector('.podium-time').textContent = '—';
      el.querySelector('.podium-score').textContent = '0';
    }
  });

  if (!sorted.length) {
    tbody.innerHTML = '<div class="lb-empty">No solvers yet. Be the first.</div>';
    document.getElementById('lbPageInfo').innerHTML = 'Showing <strong>0</strong> entries';
    return;
  }

  const start = lbPage * LB_PER_PAGE;
  const slice = sorted.slice(start, start + LB_PER_PAGE);
  const totalPages = Math.ceil(sorted.length / LB_PER_PAGE);

  tbody.innerHTML = slice.map((p) => {
    const rank = sorted.indexOf(p) + 1;
    let rankClass = 'other';
    let rankDisplay = `#${rank}`;
    if (rank === 1) { rankClass = 'gold'; rankDisplay = '🥇'; }
    else if (rank === 2) { rankClass = 'silver'; rankDisplay = '🥈'; }
    else if (rank === 3) { rankClass = 'bronze'; rankDisplay = '🥉'; }

    const isMe = (p.callsign === callsign);
    const stageDots = [1, 2, 3, 4].map(n => {
      return `<div class="lb-stage-dot ${p.solved_count >= n ? 'done' : ''}">${n}</div>`;
    }).join('');
    const timeStr = secondsToHms(p.elapsed_seconds);
    const score = calculateScore(p);

    return `<div class="lb-table-row ${isMe ? 'my-row' : ''}">
      <span class="lb-rank ${rankClass}">${rankDisplay}</span>
      <span class="lb-handle">${escapeHtml(p.callsign)}${isMe ? '<span class="you-tag">YOU</span>' : ''}</span>
      <div class="lb-stages">${stageDots}</div>
      <span class="lb-time">${timeStr}</span>
      <span class="lb-score">${score}</span>
    </div>`;
  }).join('');

  const btnWrap = document.getElementById('lbPageBtns');
  if (totalPages <= 1) {
    btnWrap.innerHTML = '';
  } else {
    let btns = `<button class="lb-page-btn" onclick="lbGo(${lbPage - 1})" ${lbPage === 0 ? 'disabled' : ''}>‹</button>`;
    for (let p = 0; p < totalPages; p++) {
      btns += `<button class="lb-page-btn ${p === lbPage ? 'active' : ''}" onclick="lbGo(${p})">${p + 1}</button>`;
    }
    btns += `<button class="lb-page-btn" onclick="lbGo(${lbPage + 1})" ${lbPage === totalPages - 1 ? 'disabled' : ''}>›</button>`;
    btnWrap.innerHTML = btns;
  }

  const startEntry = start + 1;
  const endEntry = Math.min(start + LB_PER_PAGE, sorted.length);
  document.getElementById('lbPageInfo').innerHTML = `
    Showing <strong>${startEntry}</strong> – <strong>${endEntry}</strong> of <strong>${sorted.length}</strong> entries
  `;
}

function secondsToHms(sec) {
  if (!sec && sec !== 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.lbGo = function (p) {
  lbPage = Math.max(0, p);
  fetchLeaderboard();
};

async function updatePlayerProgress() {
  if (!callsign) return;
  let elapsedSec = 0;
  try {
    const statusRes = await fetch('/api/session_status', { credentials: 'include' });
    const statusData = await statusRes.json();
    if (statusData.elapsed !== undefined) elapsedSec = statusData.elapsed;
  } catch (e) { }
  try {
    await fetch('/api/update_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ solved: solvedStages, elapsed_seconds: elapsedSec })
    });
    fetchLeaderboard();
  } catch (e) {
    console.error('Progress update failed', e);
  }
}

// ======================== AUTHENTICATION ========================
const authModal = document.getElementById('authModal');
const gameContainer = document.getElementById('gameContainer');
const callsignInput = document.getElementById('callsignInput');
const enterBtn = document.getElementById('enterArenaBtn');
const callsignDisplaySpan = document.getElementById('callsignDisplay');

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

  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const welcomeCallsignSpan = document.getElementById('welcomeCallsign');
  if (welcomeOverlay && welcomeCallsignSpan) {
    welcomeCallsignSpan.innerText = sanitized.toUpperCase();
    welcomeOverlay.style.display = 'flex';
  }

  speakWelcome(sanitized);
  showToast(`Access granted, ${sanitized}. Entering arena...`, 'success');

  startGlobalTimer();

  if (leaderboardPollInterval) clearInterval(leaderboardPollInterval);
  leaderboardPollInterval = setInterval(fetchLeaderboard, 3000);

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
  updatePrizeLock();
  fetchLeaderboard();
  setTimeout(createQuitButton, 500);
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
      if (leaderboardPollInterval) clearInterval(leaderboardPollInterval);
      leaderboardPollInterval = setInterval(fetchLeaderboard, 3000);
      await fetchCounter();
      await checkSolved();
      updatePrizeLock();
      showToast(`Welcome back, ${data.callsign}.`, 'info');
      fetchLeaderboard();
      setTimeout(createQuitButton, 500);
    } else {
      if (authModal) authModal.style.display = 'flex';
    }
  } catch (err) {
    if (authModal) authModal.style.display = 'flex';
  }
}

if (enterBtn) enterBtn.addEventListener('click', () => authenticateAndEnter(callsignInput.value));
if (callsignInput) {
  callsignInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') authenticateAndEnter(callsignInput.value);
  });
}

// ======================== HOMEPAGE ENHANCEMENTS ========================

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

function createQuitButton() {
  const headerRight = document.querySelector('.header-right-inner');
  if (!headerRight) return;
  if (document.getElementById('quitBtn')) return;
  const quitBtn = document.createElement('button');
  quitBtn.id = 'quitBtn';
  quitBtn.className = 'btn-quit';
  quitBtn.textContent = '🚪 QUIT';
  quitBtn.style.marginLeft = '12px';
  quitBtn.style.background = 'transparent';
  quitBtn.style.border = '1px solid var(--border)';
  quitBtn.style.color = 'var(--text-dim)';
  quitBtn.style.padding = '6px 14px';
  quitBtn.style.borderRadius = '24px';
  quitBtn.style.cursor = 'pointer';
  quitBtn.style.fontFamily = "'JetBrains Mono', monospace";
  quitBtn.style.fontSize = '0.6rem';
  quitBtn.style.fontWeight = '700';
  quitBtn.style.letterSpacing = '0.08em';
  quitBtn.style.transition = 'all 0.3s';
  quitBtn.addEventListener('click', showQuitDialog);
  headerRight.appendChild(quitBtn);
}

function showQuitDialog() {
  const overlay = document.getElementById('quitOverlay');
  const stagesSolved = document.getElementById('quitStagesSolved');
  const timeSpent = document.getElementById('quitTimeSpent');
  const affirmation = document.getElementById('quitAffirmation');

  fetch('/api/session_status', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data.elapsed !== undefined) {
        const hrs = String(Math.floor(data.elapsed / 3600)).padStart(2, '0');
        const mins = String(Math.floor((data.elapsed % 3600) / 60)).padStart(2, '0');
        const secs = String(data.elapsed % 60).padStart(2, '0');
        timeSpent.textContent = `${hrs}:${mins}:${secs}`;
      } else {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        timeSpent.textContent = `${hrs}:${mins}:${secs}`;
      }
    })
    .catch(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      timeSpent.textContent = `${hrs}:${mins}:${secs}`;
    });

  stagesSolved.textContent = solvedStages.length;
  affirmation.style.display = 'none';
  overlay.classList.add('show');
}

document.getElementById('quitCancel')?.addEventListener('click', function () {
  document.getElementById('quitOverlay').classList.remove('show');
});

document.getElementById('quitConfirm')?.addEventListener('click', function () {
  const affirmation = document.getElementById('quitAffirmation');
  const solved = solvedStages.length;
  const total = 4;

  let message = '';
  const emojis = ['💪', '🔥', '🌟', '👏', '🎯', '🚀'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  if (solved === 0) {
    message = `${randomEmoji} Every master was once a beginner. Keep going!`;
  } else if (solved < 3) {
    message = `${randomEmoji} You've solved ${solved}/${total}. That's solid progress! Come back stronger!`;
  } else if (solved === 3) {
    message = `${randomEmoji} So close! Just 1 more stage to go! You got this!`;
  } else if (solved === 4) {
    message = `🏆 LEGEND! You conquered all 4 stages! Go claim your prize! 🏆`;
  }

  affirmation.textContent = message;
  affirmation.style.display = 'block';

  setTimeout(() => {
    fetch('/api/quit_session', { method: 'POST', credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'quit') {
          document.getElementById('quitOverlay').classList.remove('show');
          window.location.href = data.redirect;
        }
      });
  }, 2000);
});

// ================================================================
// PRIZE SECTION – LOCK & TOKEN
// ================================================================

function updatePrizeLock() {
  const solved = solvedStages || [];
  const lock = document.getElementById('prizeLock');
  const dots = document.querySelectorAll('.lock-dot');
  const claimBtn = document.getElementById('claimBtn');
  const tokenBox = document.getElementById('prizeTokenBox');

  dots.forEach((dot, i) => {
    dot.classList.remove('done', 'active');
    if (solved.includes(i)) {
      dot.classList.add('done');
    } else if (solved.length === i) {
      dot.classList.add('active');
    }
  });

  const allSolved = solved.length === 4;

  if (allSolved) {
    if (lock) lock.classList.add('hidden');
    if (claimBtn) claimBtn.disabled = false;
  } else {
    if (lock) lock.classList.remove('hidden');
    if (claimBtn) claimBtn.disabled = true;
    if (tokenBox) tokenBox.classList.remove('show');
  }
}

// ================================================================
// DOM READY
// ================================================================

document.addEventListener('DOMContentLoaded', function () {
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  }
  setTheme(getTheme());

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const section = document.getElementById('stages-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  for (let i = 0; i < 4; i++) {
    const node = document.getElementById('ps-node-' + i);
    if (node) {
      node.addEventListener('click', function () {
        const section = document.getElementById('stages-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  document.querySelectorAll('.header-nav-inner .nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const target = this.getAttribute('href');
      if (target && target.startsWith('#')) {
        const section = document.querySelector(target);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const claimBtn = document.getElementById('claimBtn');
  const prizeResponse = document.getElementById('prizeResponse');
  const tokenBox = document.getElementById('prizeTokenBox');
  const tokenValue = document.getElementById('prizeTokenValue');
  const copyBtn = document.getElementById('prizeCopyBtn');

  if (claimBtn) {
    const newClaimBtn = claimBtn.cloneNode(true);
    claimBtn.parentNode.replaceChild(newClaimBtn, claimBtn);

    newClaimBtn.addEventListener('click', async function () {
      if (!prizeResponse) return;
      if (solvedStages.length < 4) {
        prizeResponse.innerHTML = '<div class="prize-error">⚠️ Complete all 4 stages first!</div>';
        return;
      }

      try {
        const res = await fetch('/api/claim', {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
          if (tokenBox && tokenValue) {
            tokenValue.textContent = data.qr_text || data.token || '—';
            tokenBox.classList.add('show');
          }

          prizeResponse.innerHTML = `
            <div class="prize-success">
              <p>✅ ${data.message || 'Prize claimed successfully!'}</p>
              <p style="margin-top:8px;font-size:0.75rem;color:var(--text-dim);">
                Total winners: ${data.total_winners || '—'}
              </p>
              <p style="margin-top:4px;font-size:0.7rem;color:var(--text-dim);">
                <em>Show this token to the organizer to claim your prize!</em>
              </p>
            </div>
          `;

          const counterEl = document.getElementById('counter');
          if (counterEl && data.total_winners) {
            counterEl.innerText = `🔍 ${data.total_winners} people have found the flaw so far`;
          }
          if (document.getElementById('stat-solvers') && data.total_winners) {
            document.getElementById('stat-solvers').textContent = data.total_winners;
          }
        } else {
          prizeResponse.innerHTML = `<div class="prize-error">❌ ${data.error || 'Failed to claim prize'}</div>`;
        }
      } catch (err) {
        prizeResponse.innerHTML = `<div class="prize-error">❌ Error: ${err.message}</div>`;
      }
    });
  }

  if (copyBtn && tokenValue) {
    copyBtn.addEventListener('click', function () {
      const text = tokenValue.textContent;
      if (!text || text === '—') return;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            COPIED!
          `;
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              COPY TOKEN
            `;
          }, 2500);
        });
      }
    });
  }

  checkExistingSession();
});

window.addEventListener('scroll', function () {
  const header = document.querySelector('.game-header-inner');
  if (header) {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
});