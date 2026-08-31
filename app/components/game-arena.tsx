"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandDeck } from "@/app/components/command-deck";
import { BrandMark } from "@/app/components/brand-mark";
import { FaucetToast } from "@/app/components/faucet-toast";
import { PriceArena } from "@/app/components/price-arena";
import { LiveHyperliquidChart } from "@/app/components/live-hyperliquid-chart";
import { YourPlays } from "@/app/components/your-plays";
import { SessionGate } from "@/app/components/session-gate";
import { SessionIndicator } from "@/app/components/session-indicator";
import { RouteNav } from "@/app/components/route-nav";
import { AssetSelector, SUPPORTED_ASSETS } from "@/app/components/asset-selector";
import { useHyperliquidPrices } from "@/app/hooks/use-hyperliquid-prices";
import { useGameSnapshot } from "@/app/hooks/use-game-snapshot";
import { useGameWallet } from "@/app/hooks/use-game-wallet";
import { useGameSession } from "@/app/hooks/use-game-session";
import { usePlayTransaction } from "@/app/hooks/use-play-transaction";
import { useDevnetFaucet } from "@/app/hooks/use-devnet-faucet";
import { usePersistentPositions } from "@/app/hooks/use-persistent-positions";
import { WalletButton } from "@/app/components/wallet-button";
import type { Direction } from "@/app/lib/domain";

function compactAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

export function GameArena() {
  const router = useRouter();
  const wallet = useGameWallet();
  const [selectedMarketId, setSelectedMarketId] = useState<number>(() => {
    const validIds = SUPPORTED_ASSETS.map((m) => m.marketId);
    if (typeof window !== "undefined") {
      const v = Number.parseInt(new URLSearchParams(window.location.search).get("market") ?? "1", 10);
      if (validIds.includes(v)) return v;
      const saved = Number.parseInt(localStorage.getItem("lever:selectedMarketId") ?? "1", 10);
      if (validIds.includes(saved)) return saved;
    }
    return 1;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lever:selectedMarketId", String(selectedMarketId));
      const url = new URL(window.location.href);
      url.searchParams.set("market", String(selectedMarketId));
      window.history.replaceState(null, "", url.toString());
    }
  }, [selectedMarketId]);

  // Hyperliquid per-second live price for selected asset (display only, every second)
  const hlPrices = useHyperliquidPrices(SUPPORTED_ASSETS.map((a) => a.symbol));
  const selectedAsset = SUPPORTED_ASSETS.find((a) => a.marketId === selectedMarketId);
  const hlCurrent = selectedAsset ? hlPrices.get(selectedAsset.symbol) : null;
  const [hlHistory, setHlHistory] = useState<{ t: number; p: number }[]>([]);
  useEffect(() => {
    if (!hlCurrent) return;
    setHlHistory((h) => {
      const next = [...h, { t: Date.now(), p: hlCurrent.price }];
      if (next.length > 120) next.shift();
      return next;
    });
  }, [hlCurrent?.price, hlCurrent?.updatedAt]);

  const handleAssetSelect = (marketId: number) => {
    const asset = SUPPORTED_ASSETS.find((a) => a.marketId === marketId);
    setSelectedMarketId(marketId);
    if (asset) {
      // Open live per-second graph in detail page
      router.push(`/assets/${asset.symbol}`);
    }
  };
  const {
    snapshot,
    error,
    oracleError,
    marketError,
    positionError,
    refreshing,
    refresh,
    setWalletBalanceUsd,
  } = useGameSnapshot(wallet.address, selectedMarketId);
  const session = useGameSession();
  const transaction = usePlayTransaction(snapshot, refresh, session.session, session.refresh);
  const faucet = useDevnetFaucet(wallet.address, refresh, setWalletBalanceUsd);
  const walletAddress = wallet.address;
  const connectWallet = wallet.connect;
  const [clock, setClock] = useState<number | null>(null);
  const [sessionPrompted, setSessionPrompted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const tick = () => setClock(Date.now());
    const timeout = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 100);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("session") !== "setup") return;
    window.history.replaceState(null, "", window.location.pathname);
    const timeout = window.setTimeout(() => {
      setSessionPrompted(true);
      if (!walletAddress) void connectWallet();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [connectWallet, walletAddress]);

  const now = clock ?? snapshot?.capturedAt ?? 0;

  const persistent = usePersistentPositions(
    wallet.address,
    snapshot?.marketId ?? null,
    snapshot?.plays ?? [],
    snapshot?.currentPrice ?? 0,
    now,
  );
  const plays = useMemo(
    () => {
      if (
        !transaction.pendingPlay ||
        persistent.plays.some((play) => play.id === transaction.pendingPlay?.id)
      ) {
        return persistent.plays;
      }
      return [transaction.pendingPlay, ...persistent.plays];
    },
    [persistent.plays, transaction.pendingPlay],
  );
  const occupiedPositions =
    (snapshot?.plays.length ?? 0) +
    (transaction.pendingPlay &&
    !snapshot?.plays.some((play) => play.id === transaction.pendingPlay?.id)
      ? 1
      : 0);

  const requestSession = () => {
    if (session.ready || session.busy) return;
    setSessionPrompted(true);
    if (!wallet.address) {
      void wallet.connect();
    }
  };

  const placePlay = (direction: Direction, amount: number) => {
    if (!session.ready) {
      requestSession();
      return;
    }
    setSessionPrompted(false);
    void transaction.submit(direction, amount);
  };

  const requestTestFunds = () => {
    if (!wallet.address) {
      void wallet.connect();
      return;
    }
    void faucet.fund();
  };

  if (!snapshot) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">lever</div>
        <strong>{error ? "Live market unavailable" : "Loading market"}</strong>
        <p>{error ?? "Connecting to the live price feed…"}</p>
        {error ? <button onClick={() => void refresh()} type="button">Try again</button> : null}
      </main>
    );
  }

  const walletLabel = wallet.address
    ? compactAddress(wallet.address)
    : wallet.available
      ? wallet.connecting ? "Connecting…" : "Connect wallet"
      : "Wallet not found";

  return (
    <main className="app-shell" data-mode={snapshot.mode}>
      <header className="topbar">
        <div className="brand-area">
          <BrandMark />
          <RouteNav active="trade" />
        </div>
        <div className="topbar-actions">
          <button className="quiet-button help-toggle" onClick={() => setShowHelp(true)} type="button">
            How to play
          </button>
          {faucet.available ? (
            <button
              className="quiet-button"
              disabled={faucet.busy}
              onClick={requestTestFunds}
              type="button"
              title={faucet.targetSol !== null && faucet.targetUsdc !== null ? `Top up to ${faucet.targetSol} devnet SOL and $${faucet.targetUsdc} test USDC` : "Get devnet test funds"}
            >
              {faucet.busy ? "Funding…" : "Get test funds"}
            </button>
          ) : null}
          <SessionIndicator
            active={session.ready}
            checking={session.busy && !session.ready}
            onRequestSetup={requestSession}
          />
          {wallet.address && session.ready ? (
            <div className="stat-block" title="One-hour session spending allowance remaining">
              <span>Session limit</span>
              <strong className="num">${session.remainingAllowanceUsd?.toFixed(2)}</strong>
            </div>
          ) : null}
          <div
            className="stat-block"
            title={snapshot.walletBalanceUsd === null
              ? "Available after you deposit test USDC into the arena"
              : "Test USDC available on the MagicBlock arena"}
          >
            <span>Buying power</span>
            <strong className="num">{snapshot.walletBalanceUsd === null ? "—" : `$${snapshot.walletBalanceUsd.toFixed(2)}`}</strong>
          </div>
          <WalletButton showStats snapshot={snapshot} />
        </div>
      </header>

      {error ? <div className="system-banner error" role="alert"><strong>Live updates paused</strong><span>{error}</span><button onClick={() => void refresh()} type="button">Retry</button></div> : null}
      {oracleError ? <div className="system-banner warning" role="status"><strong>Price stream degraded</strong><span>{oracleError} · snapshot fallback remains active</span></div> : null}
      {marketError ? <div className="system-banner warning" role="status"><strong>Arena updates degraded</strong><span>{marketError} · snapshot fallback remains active</span></div> : null}
      {positionError ? <div className="system-banner warning" role="status"><strong>Position updates degraded</strong><span>{positionError} · snapshot fallback remains active</span></div> : null}
      {snapshot.marketMode === "close-only" ? <div className="system-banner warning" role="status"><strong>Trading paused</strong><span>This market is settling existing positions.</span></div> : null}
      <FaucetToast
        message={faucet.message}
        tone={faucet.tone}
        actionUrl={faucet.actionUrl}
      />

      <div className="asset-bar-wrap">
        <AssetSelector selectedMarketId={selectedMarketId} onSelect={handleAssetSelect} />
      </div>

      <div className="col">
        <div className="stage">
          <section className="quote">
            <div className="quote-top">
              <span className="eyebrow">{snapshot.marketLabel} · Hyperliquid</span>
              <span className={`feed-pill ${snapshot.feedHealth}`} title={`price feed: Hyperliquid · last update ${snapshot.feedAgeSeconds.toFixed(1)}s ago`}>
                <i aria-hidden="true" />
                {snapshot.feedHealth === "live"
                  ? `Hyperliquid · Live · ${snapshot.feedAgeSeconds.toFixed(1)}s`
                  : snapshot.feedHealth === "delayed"
                    ? `Hyperliquid · Delayed · ${snapshot.feedAgeSeconds.toFixed(0)}s ago`
                    : "Hyperliquid · Offline"}
              </span>
            </div>
            <h1 className="num">
              {hlCurrent ? `$${hlCurrent.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${snapshot.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              <span style={{ fontSize: 11, color: "var(--up)", marginLeft: 8, fontWeight: 700 }}>
                {hlCurrent ? `Hyperliquid · live · ${((Date.now() - hlCurrent.updatedAt) / 1000).toFixed(1)}s` : "snapshot"}
              </span>
            </h1>
            <span className="chg" style={{ color: "var(--mut)", fontWeight: 600 }}>10-second plays · 1000× · Hyperliquid per-second</span>
          </section>
          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>
            Click any asset above → live 1s chart at <code>/assets/{selectedAsset?.symbol ?? "GOLD"}</code> · {selectedAsset?.label ?? ""} · {hlCurrent ? `${hlHistory.length} ticks` : "connecting…"}
          </div>
          {/* Primary: @bklit/live-line-chart — hyperliquid live, WS-driven, smooth */}
          <LiveHyperliquidChart
            data={hlHistory.length ? hlHistory.map((h) => ({ time: h.t / 1000, value: h.p })) : snapshot.priceHistory.map((p) => ({ time: p.timestamp / 1000, value: p.price }))}
            value={hlCurrent?.price ?? snapshot.currentPrice}
            plays={plays}
            height={520}
            window={45}
          />
          {/* Fallback Pixi hero for entry lines & settlement — hidden */}
          <div style={{ display: "none" }}>
            <PriceArena snapshot={snapshot} plays={plays} now={now} celebratingIds={persistent.celebratingIds} />
          </div>
        </div>

        <aside className="rail">
          <CommandDeck
            snapshot={snapshot}
            occupiedPositions={occupiedPositions}
            busy={transaction.busy}
            sessionReady={session.ready}
            submissionReady={transaction.submissionReady}
            sessionAllowanceUsd={session.remainingAllowanceUsd}
            statusMessage={transaction.statusMessage}
            needsRecovery={transaction.needsRecovery}
            onRecover={() => void transaction.recover()}
            onPlay={placePlay}
          />
          <YourPlays
            plays={plays}
            now={now}
            celebratingIds={persistent.celebratingIds}
            fallbackClaimableUsd={snapshot.fallbackClaimableUsd}
            claimBusy={transaction.claimBusy}
            onClaimFallback={() => void transaction.claimFallback()}
          />
        </aside>
      </div>

      <div className="mode-badge"><span className={refreshing ? "pulse" : ""} />{snapshot.notice}</div>

      <SessionGate
        key={session.session?.sessionToken ?? "new-session"}
        visible={sessionPrompted && Boolean(wallet.address) && !session.ready}
        busy={session.busy}
        defaultAllowanceUsd={session.defaultAllowanceUsd}
        walletBalanceUsd={snapshot.walletBalanceUsd}
        progress={session.progress}
        hasStoredSession={session.hasStoredSession}
        error={session.error}
        faucetAvailable={faucet.available}
        faucetBusy={faucet.busy}
        onStart={(amount) => {
          void session.start(amount).then(async (ready) => {
            if (ready) {
              await refresh();
              setSessionPrompted(false);
            }
          });
        }}
        onFund={requestTestFunds}
        onDismiss={() => setSessionPrompted(false)}
      />

      {showHelp ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="dialog-close" onClick={() => setShowHelp(false)} type="button" aria-label="Close help">×</button>
            <span className="eyebrow">Three simple steps</span>
            <h2 id="help-title">How to play</h2>
            <ol>
              <li><strong>Pick an amount.</strong><span>You can lose at most that amount.</span></li>
              <li><strong>Play up or down.</strong><span>Choose where the price will finish after 10 seconds.</span></li>
              <li><strong>Watch your positions.</strong><span>At 0.0s the result may still be settling for up to 10 seconds.</span></li>
            </ol>
            <p>Profit follows the favorable price move ×1000, capped at 5× your stake before the 10% profit fee. A refund is not a win.</p>
            <button className="dialog-action" onClick={() => setShowHelp(false)} type="button">Got it</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
