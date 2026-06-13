let solvedStages = [];

async function fetchCounter() {
    const res = await fetch('/api/counter');
    const data = await res.json();
    document.getElementById('counter').innerText = `🔍 ${data.total} people have found the flaw so far`;
}

async function checkSolved() {
    const res = await fetch('/api/check_solved', { credentials: 'include' });
    const data = await res.json();
    solvedStages = data.solved || [];
    renderStages();
}

function renderStages() {
    const container = document.getElementById('stages');
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
    div.className = `stage ${unlocked ? '' : 'locked'}`;
    div.id = `stage${stage}`;

    const titles = {
        1: 'Stage 1: Password Reset',
        2: 'Stage 2: API Gateway',
        3: 'Stage 3: Product Listing',
        4: 'Stage 4: Avatar Upload'
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
        1:'{"username": "admin"}',
        2:'{}',
        3:'{}',
        4:''
    };

    div.innerHTML = `
        <h2>${titles[stage]}</h2>
        <p>${descriptions[stage]}</p>
        <div class="request-builder">
            <div>Method: <select id="method${stage}">
                <option>${defaultMethods[stage]}</option>
                ${stage === 2 ? '<option>POST</option>' : ''}
            </select> URL: <input type="text" id="url${stage}" value="${defaultUrls[stage]}" size="40"></div>
            <div>Headers (JSON): <br><textarea id="headers${stage}" rows="3" cols="60">${defaultHeaders[stage]}</textarea></div>
            <div>Body (JSON or file data): <br><textarea id="body${stage}" rows="3" cols="60">${defaultBodies[stage]}</textarea></div>
            <button onclick="sendRequest(${stage})">Send Request</button>
            <button onclick="getHint(${stage})">Need a hint?</button>
        </div>
        <div class="response" id="response${stage}"></div>
        <div class="hint" id="hint${stage}"></div>
    `;
    return div;
}

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
        document.getElementById(`response${stage}`).innerText = 'Invalid headers JSON';
        return;
    }

    let fetchOptions = {
        method: method,
        headers: headers,
        credentials: 'include'
    };
    if (method !== 'GET' && bodyText.trim()) {
        fetchOptions.body = bodyText;
    }

    if (stage === 4 && method === 'POST' && url.includes('upload')) {
        document.getElementById(`response${stage}`).innerText = 'File uploads require curl or similar. Example: curl -F "file=@payload.svg" http://localhost:5000/api/stage4/upload';
        return;
    }

    try {
        const res = await fetch(url, fetchOptions);
        const data = await res.json();
        document.getElementById(`response${stage}`).innerText = JSON.stringify(data, null, 2);
        if (data.solved === true) {
            alert(`🎉 Flag found: ${data.flag}`);
            await checkSolved();
        }
        if (data.total_winners) {
            document.getElementById('counter').innerText = `🔍 ${data.total_winners} people have found the flaw so far`;
        }
    } catch(err) {
        document.getElementById(`response${stage}`).innerText = 'Error: ' + err;
    }
};

window.getHint = async function(stage) {
    const res = await fetch(`/api/hint/${stage}`, { credentials: 'include' });
    const data = await res.json();
    document.getElementById(`hint${stage}`).innerHTML = `<strong>Hint:</strong> ${data.hint}`;
};

document.getElementById('claimBtn').onclick = async () => {
    const res = await fetch('/api/claim', { method: 'POST', credentials: 'include' });
    const data = await res.json();
    const prizeDiv = document.getElementById('prizeResponse');
    if (data.success) {
        prizeDiv.innerHTML = `
            <div style="background:#d4ffd4; padding:10px;">
                <p>${data.message}</p>
                <p><strong>QR Token:</strong> ${data.qr_text}</p>
                <p>Total winners: ${data.total_winners}</p>
                <p><em>Show this to the organizer to claim your prize!</em></p>
            </div>
        `;
        document.getElementById('counter').innerText = `🔍 ${data.total_winners} people have found the flaw so far`;
    } else {
        prizeDiv.innerHTML = `<div style="background:#ffd4d4;">${data.error}</div>`;
    }
};

fetchCounter();
checkSolved();
