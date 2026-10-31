import { Game } from './game.js';
import { loadMap } from './map-api.js';
import { parseUserMapData } from './user-map.js';
import { SIGNAL_ORIGIN, SIGNAL_PROTOCOL, ICE_SERVERS } from './online-config.js';

const $ = id => document.getElementById(id);
let session = null;
const controlPointers = new Map();
function status(message) {
    $('status').textContent = message;
    if (!session) $('lobby-status').textContent = message;
}
function connectionFailure(s, error) {
    end(s, `Could not start the race: ${error.message}`);
}
function peerDeadline(s) {
    if (s.peerTimeout || s.ready || s.starting || s.closed) return;
    s.peerTimeout = setTimeout(() => end(s, 'Could not connect to your opponent. This network may require a TURN relay.'), 35000);
}
function raceControls(enabled) {
    if (!enabled) for (const pointers of controlPointers.values()) pointers.clear();
    for (const button of document.querySelectorAll('[data-control]')) {
        button.disabled = !enabled;
        button.classList.remove('pressed');
    }
}
function releaseMovement() {
    for (const pointers of controlPointers.values()) pointers.clear();
    session?.game?.setInput('left', false);
    session?.game?.setInput('right', false);
    for (const button of document.querySelectorAll('[data-control]')) button.classList.remove('pressed');
}
function send(s, message) {
    if (s.ws?.readyState === WebSocket.OPEN) s.ws.send(JSON.stringify(message));
}
function clean(s) {
    if (!s || s.closed) return;
    s.closed = true;
    $('countdown').hidden = true;
    raceControls(false);
    clearTimeout(s.timeout);
    clearTimeout(s.peerTimeout);
    clearInterval(s.ticker);
    clearInterval(s.stream);
    s.abort.abort();
    s.game?.stop();
    s.channel?.close();
    s.pc?.close();
    s.ws?.close();
}
function end(s, message) {
    if (session !== s || s.closed || s.result) return;
    clean(s);
    status(message);
    if (s.starting) $('players').textContent = message;
    else $('waiting-title').textContent = 'Connection stopped';
    $('reset').textContent = 'BACK TO LOBBY';
    $('reset').hidden = false;
    document.body.classList.remove('racing');
}
function reset() {
    clean(session);
    session = null;
    $('arena').hidden = true;
    $('waiting').hidden = true;
    $('result-screen').hidden = true;
    document.body.classList.remove('in-arena');
    $('lobby').hidden = false;
    $('reset').hidden = false;
    $('reset').textContent = 'CANCEL';
    document.body.classList.remove('racing');
    for (const button of $('room-form').querySelectorAll('button')) button.disabled = false;
    status('Enter a nickname and a room number to play.');
}
$('reset').addEventListener('click', reset);
$('leave').addEventListener('click', reset);
$('result-lobby').addEventListener('click', reset);
window.addEventListener('pagehide', () => clean(session));
window.addEventListener('blur', releaseMovement);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseMovement();
});

function attachChannel(s, channel) {
    s.channel = channel;
    channel.onopen = () => ready(s);
    channel.onclose = () => end(s, 'The peer connection closed. The race was cancelled.');
    channel.onerror = () => end(s, 'The peer connection failed. Please try another room.');
    channel.onmessage = event => {
        if (s.closed || typeof event.data !== 'string' || event.data.length > 2048) return;
        try {
            const m = JSON.parse(event.data);
            if (m?.type === 'state') s.game?.setOpponent(m);
            else if (s.relay) relayControl(s, m);

        } catch (error) { connectionFailure(s, error); }
    };
    if (channel.readyState === 'open') ready(s);
}
function peerSend(s, m) {
    if (!s.closed && s.channel?.readyState === 'open') s.channel.send(JSON.stringify(m));
}
function showResult(s, m) {
    if (s.closed || s.result || !['host', 'guest'].includes(m.winner)) return;
    s.result = true;
    $('countdown').hidden = true;
    raceControls(false);
    clearTimeout(s.timeout);
    clearInterval(s.stream);
    clearInterval(s.ticker);
    s.game?.freezeRace();
    const name = s.names?.[m.winner] || m.name || 'Opponent';
    const resultText = `${name} wins! ${m.winner === s.role ? 'You won.' : 'You lost.'}`;
    status(resultText);
    $('players').textContent = resultText;
    const won = m.winner === s.role;
    $('lobby').hidden = true;
    $('waiting').hidden = true;
    $('arena').hidden = true;
    $('result-screen').className = won ? 'victory' : 'defeat';
    $('result-screen').hidden = false;
    $('result-title').textContent = won ? 'VICTORY' : 'DEFEAT';
    $('result-description').textContent = won ? 'You reached the goal first. Well played!' : `${name} reached the goal first. Try again!`;
    $('result-winner').textContent = name;
    $('result-match').textContent = s.names ? `${s.names.host} vs ${s.names.guest}` : 'Online Dual';
    $('result-map').textContent = s.map || 'User map';
    $('result-room').textContent = s.room;
    document.body.classList.remove('in-arena');
    $('result-title').focus?.();
    $('reset').hidden = false;
    document.body.classList.remove('racing');
    // Let the reliable channel deliver the result before closing either transport.
    s.timeout = setTimeout(() => clean(s), 1000);
}
function declareWinner(s, winner) {
    if (s.result || !s.raceStarted || s.role !== 'host') return;
    const result = { type: 'race-result', winner };
    peerSend(s, result);
    showResult(s, result);
}
function maybeStart(s) {
    if (!s.relay || s.role !== 'host' || !s.ready || !s.remoteHash || s.starting) return;
    if (s.remoteHash !== s.hash) {
        peerSend(s, { type: 'race-error' });
        end(s, 'The map versions do not match. Please create a new room.');
        return;
    }
    peerSend(s, { type: 'race-start' });
    void message(s, { type: 'start', startAt: 3000, serverNow: 0 }).catch(error => connectionFailure(s, error));
}
function relayControl(s, m) {
    if (!m || typeof m !== 'object' || s.result) return;
    if (m.type === 'race-ready' && /^[a-f0-9]{64}$/.test(m.hash || '')) {
        s.remoteHash = m.hash;
        if (s.ready && s.hash !== m.hash) return end(s, 'The map versions do not match. Please create a new room.');
        maybeStart(s);
    } else if (m.type === 'race-start' && s.role === 'guest' && s.ready && s.remoteHash === s.hash) {
        void message(s, { type: 'start', startAt: 3000, serverNow: 0 }).catch(error => connectionFailure(s, error));
    } else if (m.type === 'race-finish' && s.role === 'host') {
        declareWinner(s, 'guest');
    } else if (m.type === 'race-result' && s.role === 'guest' && s.starting) {
        showResult(s, m);
    } else if (m.type === 'race-error') {
        end(s, 'The map versions do not match. Please create a new room.');
    }
}
function roster(s, names) {
    s.names = names;
    $('players').textContent = `${names.host} vs ${names.guest} · Room ${s.room}`;
    $('waiting-players').textContent = `${names.host} vs ${names.guest}`;
}
function ready(s) {
    if (s.closed || s.ready || !s.stage || s.channel?.readyState !== 'open') return;
    s.ready = true;
    clearTimeout(s.timeout);
    clearTimeout(s.peerTimeout);
    s.peerTimeout = null;
    $('waiting-title').textContent = 'Players connected';
    status('Connected. Waiting for both players to be ready…');
    s.timeout = setTimeout(() => end(s, 'The opponent did not become ready. Please try again.'), 30000);
    if (s.relay) {
        s.channel.send(JSON.stringify({ type: 'race-ready', hash: s.hash }));
        maybeStart(s);
    } else send(s, { type: 'ready', hash: s.hash });
}
function peer(s) {
    peerDeadline(s);
    if (s.pc) return s.pc;
    const pc = s.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = event => {
        if (event.candidate) send(s, { type: 'candidate', candidate: event.candidate.toJSON() });
    };
    pc.ondatachannel = event => attachChannel(s, event.channel);
    pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(pc.connectionState)) end(s, 'The peer connection was lost. The race was cancelled.');
    };
    return pc;
}
async function message(s, m) {
    if (s.closed || session !== s) return;
    switch (m.type) {
        case 'error': end(s, m.message); break;
        case 'ready':
            if (!s.relay) break;
            clearTimeout(s.timeout);
            if (s.role === 'host') await message(s, { type: 'welcome', role: 'host', map: s.map });
            else {
                status(`Room ${s.room} · Waiting for the host's map…`);
                peer(s);
            }
            break;
        case 'guest-joined':
            if (s.relay && s.role === 'host') await message(s, { type: 'paired', names: { host: s.name, guest: 'Opponent' } });
            break;
        case 'host-left':
        case 'guest-left':
            end(s, 'Your opponent left. The race was cancelled.');
            break;
        case 'welcome': {
            clearTimeout(s.timeout);
            s.role = m.role;
            s.map = String(m.map);
            $('waiting-map').textContent = m.map;
            status(`Room ${s.room} · Loading user map ${m.map}…`);
            s.timeout = setTimeout(() => end(s, "The user map took too long to load. Please try again."), 20000);
            const response = await loadMap(m.map, { signal: s.abort.signal });
            if (s.closed) return;
            clearTimeout(s.timeout);
            s.stage = parseUserMapData(response);
            if (s.stage.objects.goal.length !== 1) throw new Error('The race map must contain exactly one goal.');
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(response.mapData)));
            if (s.closed) return;
            s.hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            $('waiting-title').textContent = s.role === 'host' ? 'Room ready' : 'Joining room';
            status(s.role === 'host' ? 'Share the room number with your friend. Waiting for an opponent…' : 'Map loaded. Connecting to your opponent…');
            ready(s);
            break;
        }
        case 'paired': {
            roster(s, m.names);
            $('waiting-title').textContent = 'Opponent joined';
            status('Opponent joined. Connecting…');
            const pc = peer(s);
            if (s.role === 'host') {
                attachChannel(s, pc.createDataChannel('race', { ordered: true }));
                await pc.setLocalDescription(await pc.createOffer());
                if (!s.closed) send(s, { type: 'offer', description: pc.localDescription, map: s.map, name: s.name, game: 'layers-dual-v1' });
            }
            break;
        }
        case 'offer':
        case 'answer': {
            if (s.relay) {
                if (m.game !== 'layers-dual-v1' || typeof m.name !== 'string' || !m.name.trim() || m.name.length > 20) {
                    return end(s, 'This room belongs to an incompatible game. Please use a different room number.');
                }
                if (m.type === 'offer') {
                    if (s.role !== 'guest' || !/^[1-9]\d{0,14}$/.test(m.map || '')) return end(s, 'The host sent an invalid map number.');
                    await message(s, { type: 'welcome', role: 'guest', map: m.map });
                    if (s.closed) return;
                    roster(s, { host: m.name, guest: s.name });
                } else roster(s, { host: s.name, guest: m.name });
            }
            const pc = peer(s);
            await pc.setRemoteDescription(m.description);
            for (const candidate of s.candidates.splice(0)) await pc.addIceCandidate(candidate);
            if (m.type === 'offer') {
                await pc.setLocalDescription(await pc.createAnswer());
                if (!s.closed) send(s, { type: 'answer', description: pc.localDescription, name: s.name, game: 'layers-dual-v1' });
            }
            break;
        }
        case 'candidate':
            if (s.pc?.remoteDescription) await s.pc.addIceCandidate(m.candidate);
            else s.candidates.push(m.candidate);
            break;
        case 'start': {
            if (s.starting || !s.ready) return;
            s.starting = true;
            clearTimeout(s.timeout);
            // Relative to the server message: both players receive the same countdown.
            const startAt = performance.now() + Math.max(0, m.startAt - m.serverNow);
            $('lobby').hidden = true;
            $('waiting').hidden = true;
            $('arena').hidden = false;
            document.body.classList.add('in-arena');
            // Build and render the real map before the countdown; physics and input stay paused.
            s.game = new Game($('canvas'), s.stage, finished => {
                if (!finished || s.finished || s.closed) return;
                s.finished = true;
                if (s.relay) {
                    if (s.role === 'host') { declareWinner(s, 'host'); return; }
                    peerSend(s, { type: 'race-finish' });
                } else send(s, { type: 'finish' });
                status('Goal reached. Waiting for the result…');
                s.timeout = setTimeout(() => end(s, 'The result could not be confirmed. Please try a new room.'), 10000);
            }, false, true);
            s.game.setCountdownPaused(true);
            s.game.run();
            raceControls(false);
            $('countdown').hidden = false;
            const tick = () => {
                if (s.closed) return;
                const left = startAt - performance.now();
                if (left > 0) {
                    const digit = String(Math.min(3, Math.ceil(left / 1000)));
                    if ($('countdown').textContent !== digit) $('countdown').textContent = digit;
                    status('Get ready…');
                    return;
                }
                clearInterval(s.ticker);
                s.raceStarted = true;
                $('countdown').hidden = true;
                s.game.setCountdownPaused(false);
                raceControls(true);
                document.body.classList.add('racing');
                status('GO! First to the goal wins.');
                s.stream = setInterval(() => {
                    if (!s.closed && s.channel?.readyState === 'open' && s.channel.bufferedAmount < 8192) {
                        s.channel.send(JSON.stringify({ type: 'state', ...s.game.getOnlineState() }));
                    }
                }, 50);
            };
            s.ticker = setInterval(tick, 50);
            tick();
            break;
        }
        case 'result': showResult(s, m); break;
        case 'opponent-left': end(s, 'Your opponent left. The race was cancelled.'); break;
    }
}

$('room-form').addEventListener('submit', event => {
    event.preventDefault();
    if (session) return;
    const role = event.submitter?.value || 'host';
    const name = $('nickname').value.trim();
    const room = $('room').value.trim();
    const map = $('map').value.trim();
    if (!name || /[\x00-\x1f\x7f]/.test(name)) return status('Enter a valid nickname.');
    if (!/^\d{6,12}$/.test(room)) return status('Enter a room number with 6–12 digits.');
    if (role === 'host' && !/^[1-9]\d{0,14}$/.test(map)) return status('Enter a valid user map number to create a room.');
    if (!window.isSecureContext || !window.RTCPeerConnection) return status('Online play requires HTTPS or localhost and a browser with WebRTC support.');
    const s = session = { role, room, name, map, relay: SIGNAL_PROTOCOL === 'relay', candidates: [], closed: false, abort: new AbortController() };
    $('lobby').hidden = true;
    $('waiting').hidden = false;
    $('arena').hidden = true;
    $('result-screen').hidden = true;
    $('waiting-title').textContent = role === 'host' ? 'Creating room' : 'Joining room';
    $('waiting-room').textContent = room;
    $('waiting-map').textContent = role === 'host' ? map : 'Selected by host';
    $('waiting-players').textContent = `${name} · Waiting for opponent`;
    $('reset').textContent = 'CANCEL';
    for (const button of $('room-form').querySelectorAll('button')) button.disabled = true;
    $('reset').hidden = false;
    status('Connecting to the room server…');
    try {
        const url = new URL(`/signal/${s.relay ? room.padStart(12, '0') : room}`, SIGNAL_ORIGIN);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.search = new URLSearchParams({ role, name, ...(role === 'host' ? { map } : {}) });
        s.ws = new WebSocket(url);
        let queue = Promise.resolve();
        s.ws.onmessage = event => {
            queue = queue.then(() => message(s, JSON.parse(event.data))).catch(error => end(s, `Could not start the race: ${error.message}`));
        };
        s.ws.onerror = () => end(s, 'Could not connect to Cloudflare. The room may be full, missing, or the site origin may not be allowed.');
        s.ws.onclose = () => end(s, 'Disconnected from the room server. The race was cancelled.');
        s.timeout = setTimeout(() => end(s, 'The room server did not respond. Please try again.'), 15000);
    } catch (error) { end(s, error.message); }
});

for (const button of document.querySelectorAll('[data-control]')) {
    const control = button.dataset.control;
    const pointers = new Set();
    controlPointers.set(control, pointers);
    const release = event => {
        pointers.delete(event.pointerId);
        if (!pointers.size) {
            session?.game?.setInput(control, false);
            button.classList.remove('pressed');
        }
    };
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        if (!session?.game || session.closed || !session.raceStarted || session.result) return;
        pointers.add(event.pointerId);
        button.setPointerCapture(event.pointerId);
        button.classList.add('pressed');
        if (control === 'jump') session.game.jump();
        else if (control === 'layer') session.game.cycleLayer();
        else session.game.setInput(control, true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
}
