import Link from "next/link";

type PrimaryRoute = "trade" | "liquidity" | "leaderboard" | "assets" | "demo";

export function RouteNav({ active }: { active: PrimaryRoute }) {
  return (
    <nav className="route-nav" aria-label="Primary">
      <Link href="/" aria-current={active === "demo" ? "page" : undefined}>
        Demo
      </Link>
      <Link href="/trade" aria-current={active === "trade" ? "page" : undefined}>
        Trade
      </Link>
      <Link href="/assets" aria-current={active === "assets" ? "page" : undefined}>
        Markets
      </Link>
      <Link
        href="/liquidity"
        aria-current={active === "liquidity" ? "page" : undefined}
      >
        <span className="route-label-full">Liquidity</span>
        <span className="route-label-short" aria-hidden="true">Pool</span>
      </Link>
      <Link
        href="/leaderboard"
        aria-current={active === "leaderboard" ? "page" : undefined}
      >
        <span className="route-label-full">Leaderboard</span>
        <span className="route-label-short" aria-hidden="true">Leaders</span>
      </Link>
    </nav>
  );
}
