/**
 * REAL world isolated storage — never touches hyperblock:mock:* (demo stays untouched forever).
 * Real uses mainnet Hyperliquid prices, WS-driven graph, same calm design.
 */
const BALANCE_KEY = "hyperblock:real:balance";
const PLAYS_KEY = "hyperblock:real:plays";
const CLAIMED_KEY = "hyperblock:real:claimed";
const STREAK_KEY = "hyperblock:real:streak";
const BEST_STREAK_KEY = "hyperblock:real:bestStreak";

export const REAL_START_BALANCE = 0;
export const REAL_CLAIM_AMOUNT = 10_000;
export const REAL_CLAIM_COOLDOWN_MS = 60_000;

export function getRealBalance(): number {
  if (typeof window === "undefined") return REAL_START_BALANCE;
  const v = localStorage.getItem(BALANCE_KEY);
  if (v === null) return REAL_START_BALANCE;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : REAL_START_BALANCE;
}
export function setRealBalance(v: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BALANCE_KEY, String(Math.max(0, v)));
  window.dispatchEvent(new CustomEvent("real-balance-change", { detail: v }));
}
export function addRealBalance(delta: number): number {
  const next = getRealBalance() + delta;
  setRealBalance(next);
  return next;
}
export function canClaimReal(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem(CLAIMED_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > REAL_CLAIM_COOLDOWN_MS;
}
export function claimRealFunds(amount = REAL_CLAIM_AMOUNT): { balance: number; claimed: boolean; cooldownMs?: number } {
  if (!canClaimReal()) {
    const last = parseInt(localStorage.getItem(CLAIMED_KEY) ?? "0", 10);
    const cd = REAL_CLAIM_COOLDOWN_MS - (Date.now() - last);
    return { balance: getRealBalance(), claimed: false, cooldownMs: cd };
  }
  const bal = addRealBalance(amount);
  localStorage.setItem(CLAIMED_KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent("real-claim", { detail: { amount, balance: bal } }));
  return { balance: bal, claimed: true };
}
export function getRealPlays(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function setRealPlays(plays: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYS_KEY, JSON.stringify(plays.slice(0, 50)));
}
export function getLastRealClaimAt(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CLAIMED_KEY);
  return v ? parseInt(v, 10) : null;
}
export function getRealStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10) || 0;
}
export function getRealBestStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(BEST_STREAK_KEY) ?? "0", 10) || 0;
}
export function updateRealStreak(won: boolean): { streak: number; best: number; isNewBest: boolean } {
  if (typeof window === "undefined") return { streak: 0, best: 0, isNewBest: false };
  let streak = getRealStreak();
  let best = getRealBestStreak();
  if (won) streak += 1;
  else streak = 0;
  localStorage.setItem(STREAK_KEY, String(streak));
  let isNewBest = false;
  if (streak > best) {
    best = streak;
    localStorage.setItem(BEST_STREAK_KEY, String(best));
    isNewBest = true;
  }
  window.dispatchEvent(new CustomEvent("real-streak", { detail: { streak, best } }));
  return { streak, best, isNewBest };
}
