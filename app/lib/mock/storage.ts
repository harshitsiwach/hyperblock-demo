const BALANCE_KEY = "hyperblock:mock:balance";
const PLAYS_KEY = "hyperblock:mock:plays";
const CLAIMED_KEY = "hyperblock:mock:claimed";

export const MOCK_START_BALANCE = 0;
export const MOCK_CLAIM_AMOUNT = 10_000;
export const MOCK_CLAIM_COOLDOWN_MS = 60_000; // 1 min between claims for fun

export function getMockBalance(): number {
  if (typeof window === "undefined") return MOCK_START_BALANCE;
  const v = localStorage.getItem(BALANCE_KEY);
  if (v === null) return MOCK_START_BALANCE;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : MOCK_START_BALANCE;
}

export function setMockBalance(v: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BALANCE_KEY, String(Math.max(0, v)));
  window.dispatchEvent(new CustomEvent("mock-balance-change", { detail: v }));
}

export function addMockBalance(delta: number): number {
  const next = getMockBalance() + delta;
  setMockBalance(next);
  return next;
}

export function canClaimMock(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem(CLAIMED_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > MOCK_CLAIM_COOLDOWN_MS;
}

export function claimMockFunds(amount = MOCK_CLAIM_AMOUNT): { balance: number; claimed: boolean; cooldownMs?: number } {
  if (!canClaimMock()) {
    const last = parseInt(localStorage.getItem(CLAIMED_KEY) ?? "0", 10);
    const cd = MOCK_CLAIM_COOLDOWN_MS - (Date.now() - last);
    return { balance: getMockBalance(), claimed: false, cooldownMs: cd };
  }
  const bal = addMockBalance(amount);
  localStorage.setItem(CLAIMED_KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent("mock-claim", { detail: { amount, balance: bal } }));
  return { balance: bal, claimed: true };
}

export function getMockPlays(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setMockPlays(plays: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYS_KEY, JSON.stringify(plays.slice(0, 50)));
}

export function getLastClaimAt(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CLAIMED_KEY);
  return v ? parseInt(v, 10) : null;
}

const STREAK_KEY = "hyperblock:mock:streak";
const BEST_STREAK_KEY = "hyperblock:mock:bestStreak";

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) ?? "0", 10) || 0;
}
export function getBestStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(BEST_STREAK_KEY) ?? "0", 10) || 0;
}
export function updateStreak(won: boolean): { streak: number; best: number; isNewBest: boolean } {
  if (typeof window === "undefined") return { streak: 0, best: 0, isNewBest: false };
  let streak = getStreak();
  let best = getBestStreak();
  if (won) streak += 1;
  else streak = 0;
  localStorage.setItem(STREAK_KEY, String(streak));
  let isNewBest = false;
  if (streak > best) {
    best = streak;
    localStorage.setItem(BEST_STREAK_KEY, String(best));
    isNewBest = true;
  }
  window.dispatchEvent(new CustomEvent("mock-streak", { detail: { streak, best } }));
  return { streak, best, isNewBest };
}
