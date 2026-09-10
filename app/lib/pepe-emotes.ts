export interface PepeEmote {
  id: string;
  name: string;
  src: string;
  emoji: string;
  label: string;
}

export const WAITING_PEPES: PepeEmote[] = [
  {
    id: "pepe-pray",
    name: "Pepe Praying",
    src: "/emotes/pepe-pray.webp",
    emoji: "🙏🐸",
    label: "Hoping for green...",
  },
  {
    id: "pepe-monkas",
    name: "Pepe MonkaS",
    src: "/emotes/pepe-monkas.webp",
    emoji: "😰🐸",
    label: "Sweating...",
  },
  {
    id: "pepe-shake",
    name: "Pepe Shaking",
    src: "/emotes/pepe-shake.webp",
    emoji: "🥶🐸",
    label: "Biting nails...",
  },
  {
    id: "pepe-think",
    name: "Pepe Watching",
    src: "/emotes/pepe-think.webp",
    emoji: "🧐🐸",
    label: "Analyzing chart...",
  },
];

export const CELEBRATING_PEPES: PepeEmote[] = [
  {
    id: "pepe-dance",
    name: "Pepe Dance",
    src: "/emotes/pepe-dance.webp",
    emoji: "💃🐸",
    label: "Dancing!",
  },
  {
    id: "pepe-jam",
    name: "Pepe Jam",
    src: "/emotes/pepe-jam.webp",
    emoji: "🎧🐸",
    label: "Vibing!",
  },
  {
    id: "pepe-pls",
    name: "Pepe Pls",
    src: "/emotes/pepe-pls.webp",
    emoji: "🕺🐸",
    label: "Celebrating!",
  },
  {
    id: "pepe-party",
    name: "Pepe Party",
    src: "/emotes/pepe-party.webp",
    emoji: "🎉🐸",
    label: "Party mode!",
  },
  {
    id: "pepe-saved",
    name: "Pepe Saved",
    src: "/emotes/pepe-saved.webp",
    emoji: "😌🐸",
    label: "Phew, in the money!",
  },
];

/**
 * Deterministic selection based on an ID string so SSR / re-renders remain stable
 */
export function getWaitingPepe(seed?: string): PepeEmote {
  if (!seed) return WAITING_PEPES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WAITING_PEPES.length;
  return WAITING_PEPES[index];
}

export function getRandomCelebratingPepe(seed?: string): PepeEmote {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % CELEBRATING_PEPES.length;
    return CELEBRATING_PEPES[index];
  }
  return CELEBRATING_PEPES[Math.floor(Math.random() * CELEBRATING_PEPES.length)];
}
