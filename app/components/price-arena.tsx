"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MarketSnapshot, Play } from "@/app/lib/domain";
import {
  CHART_PAST_MS,
  CHART_WINDOW_MS,
  createChartGeometry,
  nicePriceStep,
  type ChartViewport,
} from "@/app/lib/chart-geometry";
import { winProfitUsd } from "@/app/lib/position-presentation";
import { estimateProfit } from "@/app/lib/domain";

interface PriceArenaProps {
  snapshot: MarketSnapshot;
  plays: Play[];
  now: number;
  celebratingIds?: ReadonlySet<string>;
}

interface AxisLabel {
  key: string;
  value: string;
  position: number;
}

interface ChartTheme {
  ink: number;
  mut: number;
  hair: number;
  up: number;
  down: number;
  wait: number;
}

const TIME_TICK_OFFSETS = Array.from(
  { length: 4 },
  (_, index) => -CHART_PAST_MS + index * (CHART_WINDOW_MS / 3),
);

function cssColor(styles: CSSStyleDeclaration, name: string): number {
  const value = styles.getPropertyValue(name).trim();
  return value.startsWith("#") ? Number.parseInt(value.slice(1), 16) : 0x000000;
}

function readTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: cssColor(styles, "--ink"),
    mut: cssColor(styles, "--mut"),
    hair: cssColor(styles, "--hair"),
    up: cssColor(styles, "--up"),
    down: cssColor(styles, "--down"),
    wait: cssColor(styles, "--wait"),
  };
}

function formatTimeOffset(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1_000);
  if (seconds === 0) return "now";
  return `${seconds > 0 ? "+" : "−"}${Math.abs(seconds)}s`;
}

export function PriceArena({
  snapshot,
  plays,
  now,
  celebratingIds,
}: PriceArenaProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef({ snapshot, plays, now, celebratingIds });
  const [following, setFollowing] = useState(true);
  const [priceLabels, setPriceLabels] = useState<AxisLabel[]>([]);
  const [timeLabels, setTimeLabels] = useState(() =>
    TIME_TICK_OFFSETS.map(formatTimeOffset)
  );
  const followingRef = useRef(true);
  const viewportRef = useRef<ChartViewport>({ x: 0, y: 0 });

  useEffect(() => {
    dataRef.current = { snapshot, plays, now, celebratingIds };
  }, [snapshot, plays, now, celebratingIds]);

  useEffect(() => {
    followingRef.current = following;
  }, [following]);

  useEffect(() => {
    const host = hostRef.current;
    const container = canvasRef.current;
    if (!host || !container) return;

    let mounted = true;
    let cleanup = () => undefined;

    void import("pixi.js").then(async ({ Application, Graphics, Container, Text }) => {
      if (!mounted) return;
      const app = new Application();
      await app.init({
        resizeTo: host,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        backgroundAlpha: 0,
      });
      if (!mounted) {
        app.destroy(true);
        return;
      }
      container.replaceChildren(app.canvas);
      const graphics = new Graphics();
      const pillLayer = new Container();
      app.stage.addChild(graphics);
      app.stage.addChild(pillLayer);

      let dragging = false;
      let dragStart = { x: 0, y: 0 };
      let dragStartView: ChartViewport = { x: 0, y: 0 };
      let displayPrice = dataRef.current.snapshot.currentPrice;
      let lastFrameAt = performance.now();
      let lastAxisAt = 0;
      let lastThemeAt = 0;
      let theme = readTheme();

      const onPointerDown = (event: PointerEvent) => {
        dragging = true;
        dragStart = { x: event.clientX, y: event.clientY };
        dragStartView = { ...viewportRef.current };
        app.canvas.setPointerCapture(event.pointerId);
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        viewportRef.current = {
          x: dragStartView.x - (event.clientX - dragStart.x),
          y: dragStartView.y - (event.clientY - dragStart.y),
        };
        followingRef.current = false;
        setFollowing(false);
      };
      const onPointerUp = () => {
        dragging = false;
      };
      app.canvas.addEventListener("pointerdown", onPointerDown);
      app.canvas.addEventListener("pointermove", onPointerMove);
      app.canvas.addEventListener("pointerup", onPointerUp);
      app.canvas.addEventListener("pointercancel", onPointerUp);

      const draw = () => {
        const {
          snapshot: current,
          plays: currentPlays,
          celebratingIds: currentCelebrations,
        } = dataRef.current;
        const frameAt = performance.now();
        const wallNow = Date.now();
        const deltaMs = Math.min(frameAt - lastFrameAt, 100);
        lastFrameAt = frameAt;
        const width = app.screen.width;
        const height = app.screen.height;
        if (width < 20 || height < 20) return;
        if (frameAt - lastThemeAt >= 500) {
          theme = readTheme();
          lastThemeAt = frameAt;
        }
        const smoothing = 1 - Math.exp(-deltaMs / 150);
        displayPrice += (current.currentPrice - displayPrice) * smoothing;
        if (followingRef.current && !dragging) {
          viewportRef.current.x += (0 - viewportRef.current.x) * smoothing;
          viewportRef.current.y += (0 - viewportRef.current.y) * smoothing;
        }
        const view = viewportRef.current;
        const geometry = createChartGeometry(
          width,
          height,
          current.priceHistory,
          currentPlays,
          displayPrice,
          wallNow,
        );

        graphics.clear();
        pillLayer.removeChildren();

        // time gridlines
        const timeTickXs = TIME_TICK_OFFSETS.map((offset) =>
          geometry.plotLeft + ((offset + CHART_PAST_MS) / CHART_WINDOW_MS) * geometry.plotWidth
        );
        for (const tickX of timeTickXs) {
          graphics.moveTo(tickX, geometry.plotTop)
            .lineTo(tickX, geometry.plotBottom)
            .stroke({ color: theme.hair, alpha: 0.7, width: 1 });
        }

        // price gridlines + axis labels
        const priceStep = nicePriceStep(geometry.dollarsPerPixel);
        const topPrice = geometry.priceAt(geometry.plotTop, view);
        const bottomPrice = geometry.priceAt(geometry.plotBottom, view);
        const firstPrice = Math.ceil(Math.min(topPrice, bottomPrice) / priceStep) * priceStep;
        const nextPriceLabels: AxisLabel[] = [];
        for (
          let price = firstPrice;
          price <= Math.max(topPrice, bottomPrice) + priceStep / 2;
          price += priceStep
        ) {
          const gridY = geometry.y(price, view);
          if (gridY < geometry.plotTop - 1 || gridY > geometry.plotBottom + 1) continue;
          graphics.moveTo(geometry.plotLeft, gridY)
            .lineTo(geometry.plotRight, gridY)
            .stroke({ color: theme.hair, alpha: 0.7, width: 1 });
          nextPriceLabels.push({
            key: price.toFixed(8),
            value: `$${price.toLocaleString(undefined, {
              minimumFractionDigits: priceStep < 1 ? 2 : 0,
              maximumFractionDigits: priceStep < 1 ? 2 : 0,
            })}`,
            position: gridY,
          });
        }

        // price path (monochrome ink; color is reserved for positions)
        const path: { x: number; y: number }[] = [];
        for (const point of current.priceHistory) {
          const pointX = geometry.x(point.timestamp, view);
          if (pointX < geometry.plotLeft - 10 || pointX > geometry.plotRight + 10) continue;
          path.push({ x: pointX, y: geometry.y(point.price, view) });
        }
        const currentX = geometry.x(wallNow, view);
        const currentY = geometry.y(displayPrice, view);
        if (currentX >= geometry.plotLeft - 10 && currentX <= geometry.plotRight + 10) {
          path.push({ x: currentX, y: currentY });
        }
        if (path.length > 1) {
          // smooth bezier for BIG accurate hero — every second tick flows with price
          const drawSmooth = (stroke = false) => {
            graphics.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
              const p0 = path[i - 1];
              const p1 = path[i];
              const cx = (p0.x + p1.x) / 2;
              graphics.bezierCurveTo(cx, p0.y, cx, p1.y, p1.x, p1.y);
            }
            if (stroke) graphics.stroke({ color: theme.ink, alpha: 1, width: 3, join: "round", cap: "round" });
          };
          // soft fill under the smooth line
          drawSmooth(false);
          graphics.lineTo(path[path.length - 1].x, geometry.plotBottom)
            .lineTo(path[0].x, geometry.plotBottom)
            .closePath()
            .fill({ color: theme.ink, alpha: 0.07 });
          // stroke smooth line
          drawSmooth(true);
          // per-second tick dots — bigger, accurate, moving with price
          for (let i = 0; i < path.length; i++) {
            const pt = path[i];
            if (pt.x < geometry.plotLeft || pt.x > geometry.plotRight) continue;
            const isLast = i === path.length - 1;
            graphics.circle(pt.x, pt.y, isLast ? 3.2 : 2.1).fill({ color: theme.ink, alpha: isLast ? 1 : 0.28 });
            if (isLast) graphics.circle(pt.x, pt.y, 9).fill({ color: theme.ink, alpha: 0.09 });
          }
        }

        // Entry lines persist through settlement while they remain in the visible time window.
        for (const play of currentPlays) {
          const settlingState = ["settling", "refunding"].includes(play.status);
          const isActive = play.status === "active" || settlingState;
          const celebrating = currentCelebrations?.has(play.id) ?? false;
          const color =
            play.status === "lost"
              ? theme.down
              : play.status === "won"
                ? theme.up
                : play.status === "breakeven" || play.status === "refunded" || settlingState
                  ? theme.wait
                  : play.direction === "up"
                    ? theme.up
                    : theme.down;
          const playY = geometry.y(play.entryPrice, view);
          const startX = geometry.x(play.openedAt, view);
          const endX = geometry.x(play.expiresAt, view);
          const nowX = geometry.x(wallNow, view);
          // Track background (hair) for active plays — subtle reference
          if (isActive) {
            graphics.moveTo(startX, playY).lineTo(endX, playY).stroke({ color: theme.hair, alpha: 0.9, width: 6 });
          }
          // Draining fill follows now: openedAt → now (ahead tint), now → expires (muted)
          if (isActive && wallNow >= play.openedAt && wallNow < play.expiresAt) {
            const clampNowX = Math.max(startX, Math.min(endX, nowX));
            // filled progress portion — gentle, not loud
            const liveProfit = play.liveProfitUsd ?? estimateProfit(play.collateralUsd, play.entryPrice, displayPrice, play.direction);
            const ahead = liveProfit > 0;
            graphics.moveTo(startX, playY).lineTo(clampNowX, playY).stroke({ color: ahead ? theme.up : liveProfit < -play.collateralUsd * 0.5 ? theme.down : theme.ink, alpha: ahead ? 0.28 : 0.18, width: 6 });
            // main entry line on top
            graphics.moveTo(startX, playY).lineTo(endX, playY).stroke({ color, alpha: settlingState ? 0.5 : 0.85, width: play.status === "lost" || celebrating ? 3 : 2 });
            // live pill — calm ink pill with estimate, heartbeat last 3s
            const isFinal = wallNow >= play.expiresAt - 3000;
            const pillW = 72;
            const pillH = 20;
            const pillX = clampNowX;
            const pillY = playY - 18;
            // clamp pill inside plot
            const clampedPillX = Math.max(geometry.plotLeft + pillW / 2, Math.min(geometry.plotRight - pillW / 2, pillX));
            const pulse = isFinal ? 1 + Math.sin(frameAt * 0.012) * 0.04 : 1;
            const pw = pillW * pulse;
            const ph = pillH * pulse;
            // pill background
            graphics.roundRect(clampedPillX - pw / 2, pillY - ph / 2, pw, ph, 10).fill({ color: 0xffffff, alpha: 0.96 });
            graphics.roundRect(clampedPillX - pw / 2, pillY - ph / 2, pw, ph, 10).stroke({ color: theme.hair, alpha: 0.9, width: 1 });
            // pill text — calm ink, colored profit sign only
            const profitText = `${liveProfit >= 0 ? "+" : ""}$${liveProfit.toFixed(2)}`;
            const txt = new Text({
              text: profitText,
              style: {
                fontFamily: "Figtree, system-ui, sans-serif",
                fontSize: 11,
                fontWeight: "700",
                fill: liveProfit > 0 ? theme.up : liveProfit < 0 ? theme.down : theme.ink,
                align: "center",
              },
            });
            txt.anchor.set(0.5);
            txt.x = clampedPillX;
            txt.y = pillY + 0.5;
            txt.scale.set(pulse);
            pillLayer.addChild(txt);
          } else {
            graphics.moveTo(startX, playY).lineTo(endX, playY).stroke({ color, alpha: settlingState ? 0.5 : 0.85, width: play.status === "lost" || celebrating ? 3 : 2 });
          }
          const resultX = geometry.x(play.expiresAt, view);
          graphics.circle(resultX, playY, 7).stroke({ color, alpha: 0.9, width: 2 });
          graphics.circle(resultX, playY, 2.5).fill({ color, alpha: 1 });

          if (celebrating) {
            const cycle = (frameAt % 900) / 900;
            const eased = 1 - Math.pow(1 - cycle, 3);
            for (let ring = 0; ring < 3; ring += 1) {
              const ringPhase = (cycle + ring / 3) % 1;
              graphics
                .circle(resultX, playY, 12 + ringPhase * 54)
                .stroke({
                  color: theme.up,
                  alpha: (1 - ringPhase) * 0.5,
                  width: 2,
                });
            }
            for (let particle = 0; particle < 14; particle += 1) {
              const angle = (particle / 14) * Math.PI * 2 + particle * 0.37;
              const distance = 16 + eased * (34 + (particle % 4) * 8);
              const particleX = resultX + Math.cos(angle) * distance;
              const particleY = playY + Math.sin(angle) * distance * 0.7;
              graphics
                .circle(particleX, particleY, 1.5 + (particle % 3) * 0.6)
                .fill({
                  color: particle % 4 === 0 ? theme.wait : theme.up,
                  alpha: 1 - cycle,
                });
            }
          }
        }

        // live price marker
        graphics.moveTo(geometry.plotLeft, currentY)
          .lineTo(geometry.plotRight, currentY)
          .stroke({ color: theme.mut, alpha: 0.35, width: 1 });
        graphics.circle(currentX, currentY, 11).fill({ color: theme.ink, alpha: 0.08 });
        graphics.circle(currentX, currentY, 3.5).fill({ color: theme.ink, alpha: 1 });

        if (frameAt - lastAxisAt >= 250) {
          setPriceLabels(nextPriceLabels);
          setTimeLabels(timeTickXs.map((tickX) =>
            formatTimeOffset(geometry.timeOffsetAt(tickX, view))
          ));
          lastAxisAt = frameAt;
        }
      };

      app.ticker.add(draw);
      cleanup = () => {
        app.canvas.removeEventListener("pointerdown", onPointerDown);
        app.canvas.removeEventListener("pointermove", onPointerMove);
        app.canvas.removeEventListener("pointerup", onPointerUp);
        app.canvas.removeEventListener("pointercancel", onPointerUp);
        app.destroy(true, { children: true });
      };
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const resetFollow = () => {
    followingRef.current = true;
    setFollowing(true);
  };
  const celebratingPlay = plays.find(
    (play) => celebratingIds?.has(play.id) && play.status === "won",
  );
  const winProfit = celebratingPlay
    ? winProfitUsd(celebratingPlay)
    : null;

  return (
    <section className="price-arena" ref={hostRef} aria-label="Live price chart">
      <div className="arena-canvas" ref={canvasRef} aria-hidden="true" />
      <div className="price-axis" aria-hidden="true">
        {priceLabels.map((label) => (
          <span key={label.key} style={{ top: label.position }}>{label.value}</span>
        ))}
      </div>
      <div className="arena-labels" aria-hidden="true">
        {timeLabels.map((label, index) => <span key={`${index}-${label}`}>{label}</span>)}
      </div>
      <button className={`follow-button ${following ? "is-following" : ""}`} onClick={resetFollow} type="button">
        ↪ Return to live
      </button>
      {celebratingPlay ? (
        <div
          className="chart-win"
          key={celebratingPlay.id}
          role="status"
          aria-live="polite"
        >
          <div className="chart-win-burst" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <i key={index} style={{ "--burst-index": index } as CSSProperties} />
            ))}
          </div>
          <span>Round won</span>
          <strong className="num">
            {winProfit === null ? "Nice call" : `+$${winProfit.toFixed(2)}`}
          </strong>
          <small>
            {celebratingPlay.direction === "up" ? "▲ Up" : "▼ Down"} landed
          </small>
        </div>
      ) : null}
      <p className="sr-only">
        Current price {snapshot.currentPrice.toFixed(2)} dollars. The chart can be dragged to inspect history and never places a play.
      </p>
    </section>
  );
}
