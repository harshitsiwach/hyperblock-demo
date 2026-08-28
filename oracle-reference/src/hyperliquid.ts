import WebSocket from "ws";

export type Mids = Record<string, string>;

export async function fetchAllMids(restUrl: string): Promise<Mids> {
  const res = await fetch(restUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "allMids" }),
  });
  if (!res.ok) throw new Error(`REST allMids failed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as Mids;
  // REST returns object directly keyed by symbol, not wrapped
  return data;
}

export async function fetchAllMidsForDex(
  restUrl: string,
  dex: string,
): Promise<Mids> {
  if (!dex) return fetchAllMids(restUrl);
  const res = await fetch(restUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "allMids", dex }),
  });
  if (!res.ok) throw new Error(`REST allMids dex=${dex} failed ${res.status}`);
  const data = (await res.json()) as unknown;
  // dex response shape may differ; normalize
  if (data && typeof data === "object" && "mids" in (data as Record<string, unknown>)) {
    return (data as { mids: Mids }).mids;
  }
  return data as Mids;
}

export interface HyperliquidWsOptions {
  wsUrl: string;
  dexes: string[];
  onMids: (mids: Mids, dex: string) => void;
  onError?: (err: Error) => void;
}

export function createHyperliquidWs(options: HyperliquidWsOptions): {
  close: () => void;
} {
  let ws: WebSocket | null = null;
  let closed = false;
  let backoff = 1_000;
  const maxBackoff = 30_000;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(options.wsUrl);

    ws.on("open", () => {
      backoff = 1_000;
      // subscribe main dex
      ws!.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
      for (const dex of options.dexes.filter(Boolean)) {
        ws!.send(
          JSON.stringify({ method: "subscribe", subscription: { type: "allMids", dex } }),
        );
      }
      console.log(`[hyperliquid] WS open ${options.wsUrl} dexes=${["", ...options.dexes].join(",")}`);
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          channel?: string;
          data?: { mids?: Mids } | Mids;
        };
        if (msg.channel !== "allMids") return;
        // data can be { mids: {...}} or directly mids object? Handle both
        let mids: Mids | undefined;
        let dex = "";
        if (msg.data && typeof msg.data === "object" && "mids" in msg.data) {
          mids = (msg.data as { mids: Mids }).mids;
          // dex is not in channel msg; we assume main dex for now.
          // For dex-specific, Hyperliquid may send dex in msg? We treat all mids as main; dex mids will be filtered by caller.
        } else if (msg.data && typeof msg.data === "object") {
          // fallback: data itself is mids
          mids = msg.data as Mids;
        }
        if (mids) {
          // filter internal indices @
          const filtered: Mids = {};
          for (const [k, v] of Object.entries(mids)) {
            if (k.startsWith("@")) continue;
            filtered[k] = v;
            if (k.includes(":")) {
              const [, sym] = k.split(":");
              if (sym) filtered[sym] = v;
            }
          }
          options.onMids(filtered, dex);
        }
      } catch (e) {
        options.onError?.(e as Error);
      }
    });

    ws.on("error", (err) => {
      options.onError?.(err as Error);
    });

    ws.on("close", () => {
      if (closed) return;
      console.warn(`[hyperliquid] WS closed, reconnect in ${backoff}ms`);
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, maxBackoff);
    });
  };

  connect();

  return {
    close: () => {
      closed = true;
      ws?.close();
    },
  };
}
