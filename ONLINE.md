# Online Dual

The main menu opens `online.html`. Create a room with a nickname, a 6–12 digit
room number and an existing uploaded user map number. A second player joins
with their nickname and the same room number; the host's map is used.
No accounts, passwords or account database are used.

Both players load and validate the user map through the existing map API.
The map must have exactly one start and one goal. SHA-256 map fingerprints
must match before a three-second countdown starts. A/D moves,
W jumps and Enter cycles R/G/B. Touch controls are also included.

Each client's own active layer controls world opacity and collision. Its
player remains white. The opponent is drawn white at 50% opacity and never participates in local collision detection.
Player positions travel over a WebRTC DataChannel at up to 20 updates/second.

## Default connection: existing Cloudflare relay

`js/online-config.js` points to
`https://online-test.kimdanoo-mnp.workers.dev` with `SIGNAL_PROTOCOL = "relay"`.
Open the frontend with Live Server at `http://127.0.0.1:5500/online.html`
or `http://localhost:5500/online.html` (5050 is also allowed by the existing
relay configuration). The frontend connects to Cloudflare using WSS;
no local WebSocket server or Cloudflare redeployment is needed.

Room numbers are padded to 12 digits for compatibility with the relay.
For example, room 123456 uses `/signal/000000123456` on Cloudflare.
The relay admits one host and one guest. Map numbers and nicknames are
exchanged in signaling metadata; matching map hashes, countdown and finish
messages are exchanged through the reliable WebRTC DataChannel.
The host decides the winner, using the first local finish or received
opponent finish. Both screens receive that decision before disconnecting.
This casual mode trusts the host and is affected by network latency.

Both players must open LAYER:S, not the Online_Test demo. The client checks
the game protocol marker and rejects incompatible rooms. Custom frontend
origins require adding their exact origin to the deployed relay's
`ALLOWED_DEV_ORIGINS`; changing only local configuration cannot change an
already deployed server's origin policy.

## Optional dedicated LAYER:S Worker

The included `server/online-worker.js` remains available for a separate
LAYER:S deployment. To use it instead of the existing relay, set
`SIGNAL_PROTOCOL = "room"` and set `SIGNAL_ORIGIN` to that Worker's HTTPS
origin (or `window.location.origin` when it serves the frontend itself).
Set `ALLOWED_ORIGINS` in `wrangler.jsonc` when the frontend has a separate
origin. The existing map API must also allow the frontend origin.

From the project directory, `npm install` followed by `npm run dev` starts
the dedicated local Worker. With the dedicated configuration above, open
`http://localhost:8787/online.html`. `npm run deploy` deploys it to your
Cloudflare account. No deployment was performed by this change.
The `.assetsignore` excludes server source, Git metadata and local secrets.

STUN is `stun:stun.cloudflare.com:3478`, as documented at
https://developers.cloudflare.com/realtime/turn/ . No TURN credentials or
relay are configured. STUN alone cannot connect every NAT/firewall pair;
the UI reports connection failure after 35 seconds.

## Dedicated Worker results and connection handling

In optional dedicated Worker mode, the Durable Object admits one host and one guest per room and serializes
finish claims. The first valid finish notification received after the start
time wins; both players receive the same result and the race freezes.
This is a casual race: finish claims originate on clients, are not verified
by server physics, and arrival order is affected by network latency.
Countdowns are relative to receipt of the server start message, so the
start also has normal network latency skew.

Disconnects cancel unfinished races rather than award an automatic win.
Leaving closes the peer connection and room socket. Rooms expire after
30 minutes, and an empty room number can be reused for a new race.
There is no automatic rematch: return to the lobby and create/join again.

Run `npm test` for room admission, signaling, start, map mismatch, results,
disconnect and map validation checks.

## Countdown and mobile controls

The actual map is rendered behind a large centered 3-2-1 countdown.
Movement, jump, layer changes, physics and the race timer are paused until
it completes. Both characters are white; the opponent stays 50% transparent.
World opacity and collision still use each player's own current layer.

Touch controls fit narrow portrait and landscape screens, account for safe
areas, and support movement with jump/layer buttons at the same time.
Pointer capture, cancellation, lost capture and focus changes release held
movement. Rotate the device to resize the game automatically. Mobile play
requires an HTTPS frontend origin allowed by the Cloudflare relay; a phone
opening a LAN HTTP address does not meet the browser's secure-context check.
Automated tests cover countdown locking and multi-touch event handling;
physical Android/iOS and mobile browser rendering have not been verified.

## Waiting screen

Creating or joining a room opens a separate waiting screen with the room
number, map, players, connection status and Cancel button. Both players
must connect and load the same map before it switches to the map countdown.
The map screen has no status message box. Results open a dedicated Victory/Defeat screen. Fatal connection
errors appear as plain text in the top bar. Pre-match connection failures
stay on the waiting screen with a Back to Lobby button.

## Match result screen

After a confirmed finish, the map switches to a dedicated VICTORY or DEFEAT
screen for each player. It shows the winner, player names, map and room.
Back to Lobby returns to room entry with the existing nickname preserved;
Home returns to the main menu. Disconnects without a confirmed winner stay
connection errors and do not display a victory or defeat result.
