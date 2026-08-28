"use client";

import Link from "next/link";

const MERMAID_CODE = `flowchart TD
    A[User: Connect Phantom\\nWallet Adapter] --> B{Wallet connected?}
    B -- No --> A
    B -- Yes --> C[Get test funds?\\nFaucet: devnet USDC\\n/api/devnet-faucet]
    C --> D[Create Gasless Session\\n1h allowance $1-1000\\ncreateSessionV2 base tx\\n+ delegate UserPositions\\n+ eSPL vault deposit+delegate\\n+ ApproveChecked on ER]
    D --> E{Session ready?\\nsessionStore validUntil\\ntoken.delegate==sessionSigner}
    E -- No --> D
    E -- Yes --> F[Pick Asset\\nBTC/ETH/SOL/HYPE\\nAAPL/NVDA/TSLA/COIN\\nGOLD/SILVER/BRENTOIL\\nEUR/JPY\\nHyperliquid allMids\\nmain + xyz dex]
    F --> G[Live Price Display\\nWS wss://api.hyperliquid-testnet.xyz/ws\\nallMids + allMids dex:xyz\\nstrip xyz: prefix\\nstale >5s = connecting]
    F --> H[Pick Direction + Stake\\nUP / DOWN\\n$1-1000  presets 5/10/25\\nsessionAllowance >= stake\\npool solvency check]
    H --> I{Checks: staleness 5s?\\nPriceAccount.price !=0?\\nWrongPriceFeed?\\nSolvency pool>=open*5+10%?\\nmax_open_exposure?\\nnonce==next_nonce?\\nactive<8?}
    I -- Fail --> J[Blocked: Price feed stale\\n/ InsufficientLiquidity\\n/ RiskLimitExceeded]
    J --> H
    I -- Pass --> K[open_position\\nsessionSigner signs ER tx\\nfeePayer = sessionSigner\\nprice = PriceAccount price*100 (1e6->1e8)\\nslippage rawPrice±0.05%\\ntransfer collateral\\nuserToken -> poolToken\\npush CompactPosition\\nmarket.active+1\\nemit PositionCreated]
    K --> L[Schedule Settlement\\nMagicBlock Scheduler\\nScheduleTask\\ntask_id=hash(market,user,nonce,salt)\\ninterval 1000ms x25\\ncrank_signer PDA\\nmarket PDA signs]
    L --> M[10s Countdown\\nPriceArena entry line\\nYourPlays live-countdown\\nEstimated PnL = collateral*1000*Δ/entry\\nisAhead / chasing]
    M --> N{ now < expires?}
    N -- Yes --> O[settle_position NO-OP\\ncrank retries every 1s]
    O --> M
    N -- No --> P{ now >= refund_at?\\nrefund = expires+10}
    P -- Yes --> Q[Refunded\\npayout = collateral\\noutcome Refunded]
    P -- No --> R[Try settle price\\npriceAccount.timestamp in [expires, refund)\\n& age<=5s?]
    R -- None / stale / outside --> O
    R -- Some settle_price --> S[calculate_settlement\\nraw=coll*1000*Δ/entry\\nif raw>=0: gross=min(raw,5*coll)\\n fee=10% gross\\n user=coll+gross-fee\\nelse loss=min(|raw|,coll)\\n user=coll-loss]
    S --> T{Outcome?}
    T -- gross>0 --> U[Won\\npayout = coll+gross-fee\\nplus 1.9x max]
    T -- loss>0 --> V[Lost\\npayout = coll-loss\\nfloor 0]
    T -- tie --> W[Breakeven\\npayout = coll]
    U --> X[Market Transfer\\npool -> userToken\\nor fallback escrow\\nif userToken closed]
    V --> X
    W --> X
    Q --> X
    X --> Y[Cleanup\\nswap_remove(position)\\nmarket.open_collateral -=coll\\nactive -=1\\nemit PositionClosed]
    Y --> Z[YourPlays shows Won/Lost\\nPriceArena burst\\nFallback claim if escrow\\nBuying power updated]
    Z --> H`;

export default function FlowPage() {
  return (
    <div className="app-shell" style={{ overflow: "auto" }}>
      <header className="topbar">
        <div className="brand-area">
          <Link href="/" className="brand-mark" aria-label="Lever home">
            <svg className="brand-icon" viewBox="0 0 32 32" role="img" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9"></rect><path d="M7.5 20.5 24.5 11"></path><path d="m12.5 25 3.5-6 3.5 6Z"></path></svg>
            <span className="brand-wordmark">lever</span>
          </Link>
          <nav className="route-nav" aria-label="Primary">
            <Link href="/">Trade</Link>
            <Link href="/assets">Markets</Link>
            <Link href="/flow" aria-current="page">Flow</Link>
          </nav>
        </div>
      </header>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 48px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <span className="eyebrow">Hyperliquid → MagicBlock ER → Payout</span>
          <h1 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>Betting Flow</h1>
          <p style={{ margin: 0, color: "var(--mut)", fontSize: 14, maxWidth: 720 }}>
            Click any asset on <Link href="/assets" style={{ color: "var(--ink)", fontWeight: 700 }}>Markets</Link> → <code>/assets/GOLD</code> live chart per second, then follow this flow to place a 10s 1000× bet. Copy the Mermaid code below and paste at{" "}
            <a href="https://mermaid.live/edit" target="_blank" rel="noreferrer" style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "underline" }}>mermaid.live</a> to run it.
          </p>
        </div>

        <div style={{ border: "1px solid var(--hair)", borderRadius: 16, background: "var(--card)", padding: 16 }}>
          <pre style={{ margin: 0, background: "#1a1b1f", color: "#f0efec", padding: 14, borderRadius: 10, overflow: "auto", fontSize: 12, whiteSpace: "pre-wrap" }}>{MERMAID_CODE}</pre>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="quiet-button"
              onClick={() => navigator.clipboard.writeText(MERMAID_CODE)}
              type="button"
            >
              Copy Mermaid
            </button>
            <a href="https://mermaid.live/edit" target="_blank" rel="noreferrer" className="quiet-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Open mermaid.live →
            </a>
            <Link href="/assets/GOLD" className="quiet-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Try GOLD live chart →
            </Link>
          </div>
        </div>

        <div style={{ border: "1px solid var(--hair)", borderRadius: 16, background: "var(--card)", padding: 16 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800 }}>Live preview (mermaid CDN)</h3>
          <div className="mermaid" style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid var(--hair)", overflow: "auto" }}>
            {MERMAID_CODE}
          </div>
          <script type="module" dangerouslySetInnerHTML={{ __html: `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'; mermaid.initialize({startOnLoad:true, theme:'base'});` }} />
        </div>

        <div style={{ fontSize: 12, color: "var(--mut)", borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
          Files: <code>docs/betting-flow.mmd</code> + <code>docs/betting-flow.html</code> (standalone). Run: <code>open docs/betting-flow.html</code> or <code>pnpm exec mermaid --input docs/betting-flow.mmd</code>
        </div>
      </div>
    </div>
  );
}
