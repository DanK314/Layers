export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/signal/')) return env.ASSETS.fetch(request);
    const room = url.pathname.slice(8);
    if (!/^\d{6,12}$/.test(room)) return new Response('Invalid room number', { status: 400 });
    const origins = [url.origin, ...(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())];
    if (!origins.includes(request.headers.get('Origin'))) return new Response('Forbidden origin', { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
  }
};

// A room arbitrates start and result; movement travels over WebRTC.
export class OnlineRoom {
  constructor(ctx) { this.ctx = ctx; }
  send(ws, message) { try { ws.send(JSON.stringify(message)); } catch {} }
  broadcast(message) { for (const ws of this.ctx.getWebSockets()) this.send(ws, message); }
  fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
      const url = new URL(request.url);
      const role = url.searchParams.get('role');
      const name = (url.searchParams.get('name') || '').trim();
      const map = url.searchParams.get('map');
      if (!['host', 'guest'].includes(role) || !name || name.length > 20 || /[\x00-\x1f\x7f]/.test(name)) return new Response('Invalid nickname or role', { status: 400 });
      const sockets = this.ctx.getWebSockets();
      let state = await this.ctx.storage.get('room');
      let error;
      if (role === 'host') {
        if (sockets.length) error = 'That room number is already in use.';
        else if (!/^[1-9]\d{0,14}$/.test(map || '')) error = 'Enter a valid user map number.';
        else {
          state = { map, names: { host: name }, ready: {}, startAt: null, result: null };
          await this.ctx.storage.put('room', state);
        }
      } else {
        if (!this.ctx.getWebSockets('host').length || !state) error = 'Room not found.';
        else if (this.ctx.getWebSockets('guest').length || state.startAt) error = 'This room is full or the race has started.';
        else { state.names.guest = name; await this.ctx.storage.put('room', state); }
      }
      const pair = new WebSocketPair();
      if (error) {
        pair[1].accept();
        this.send(pair[1], { type: 'error', message: error });
        pair[1].close(1008, 'Room unavailable');
      } else {
        this.ctx.acceptWebSocket(pair[1], [role]);
        pair[1].serializeAttachment({ role, count: 0, since: Date.now() });
        await this.ctx.storage.setAlarm(Date.now() + 30 * 60 * 1000);
        this.send(pair[1], { type: 'welcome', role, map: state.map, names: state.names });
        if (role === 'guest') this.broadcast({ type: 'paired', names: state.names });
      }
      return new Response(null, { status: 101, webSocket: pair[0] });
    });
  }
  webSocketMessage(ws, raw) {
    return this.ctx.blockConcurrencyWhile(async () => {
      if (typeof raw !== 'string' || raw.length > 20000) return ws.close(1009, 'Message too large');
      const meta = ws.deserializeAttachment();
      if (Date.now() - meta.since > 60000) { meta.since = Date.now(); meta.count = 0; }
      if (++meta.count > 300) return ws.close(1008, 'Too many messages');
      ws.serializeAttachment(meta);
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;
      const state = await this.ctx.storage.get('room');
      if (!state || state.result) return;
      if (['offer', 'answer', 'candidate'].includes(m.type)) {
        if ((m.type === 'offer' && meta.role !== 'host') || (m.type === 'answer' && meta.role !== 'guest')) return;
        for (const other of this.ctx.getWebSockets(meta.role === 'host' ? 'guest' : 'host')) this.send(other, m);
      } else if (m.type === 'ready' && !state.startAt && /^[a-f0-9]{64}$/.test(m.hash || '')) {
        state.ready[meta.role] = m.hash;
        if (state.ready.host && state.ready.guest) {
          if (state.ready.host !== state.ready.guest) {
            this.broadcast({ type: 'error', message: 'The map versions do not match. Please create a new room.' });
            return;
          }
          state.startAt = Date.now() + 3000;
          this.broadcast({ type: 'start', startAt: state.startAt, serverNow: Date.now() });
        }
        await this.ctx.storage.put('room', state);
      } else if (m.type === 'finish' && state.startAt && Date.now() >= state.startAt) {
        state.result = { type: 'result', winner: meta.role, name: state.names[meta.role] };
        await this.ctx.storage.put('room', state);
        this.broadcast(state.result);
      }
    });
  }
  webSocketClose(ws) {
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      this.send(other, { type: 'opponent-left' });
      other.close(1000, 'Opponent left');
    }
  }
  webSocketError(ws) { ws.close(1011, 'Connection error'); }
  alarm() {
    this.broadcast({ type: 'error', message: 'The room expired. Please create a new room.' });
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Room expired');
    return this.ctx.storage.deleteAll();
  }
}
