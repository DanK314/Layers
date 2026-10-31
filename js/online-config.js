// Existing Cloudflare signaling relay. Live Server serves only the frontend.
export const SIGNAL_ORIGIN = "https://online-test.kimdanoo-mnp.workers.dev";
// "relay" uses the existing Online_Test Worker; "room" uses server/online-worker.js.
export const SIGNAL_PROTOCOL = "relay";
export const ICE_SERVERS = [{ urls: "stun:stun.cloudflare.com:3478" }];
