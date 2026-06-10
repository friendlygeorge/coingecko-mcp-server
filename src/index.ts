#!/usr/bin/env node
/**
 * CoinGecko MCP Server
 * 
 * Connect AI assistants to CoinGecko's free crypto market data API.
 * Query prices, market caps, trending coins, search, and historical data
 * through the Model Context Protocol.
 * 
 * Works with Claude Desktop, Cursor, Windsurf, Cline, and any MCP client.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Rate limiter: CoinGecko free tier = 10-30 calls/min
let lastCall = 0;
const MIN_INTERVAL = 2200; // ~27 calls/min, safe for free tier

async function rateLimitedFetch(url: string): Promise<any> {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastCall);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastCall = Date.now();

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 429) {
    // Rate limited — wait and retry once
    await new Promise((r) => setTimeout(r, 5000));
    const retry = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!retry.ok) {
      throw new Error(`CoinGecko API error: ${retry.status} ${retry.statusText}`);
    }
    return retry.json();
  }

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function formatMarketData(coins: any[]): string {
  if (!coins || coins.length === 0) return "No results found.";
  
  const lines = coins.map((c: any) => {
    const price = c.current_price != null ? `$${c.current_price.toLocaleString()}` : "N/A";
    const mcap = c.market_cap ? `$${(c.market_cap / 1e9).toFixed(1)}B` : "N/A";
    const change24h = c.price_change_percentage_24h != null 
      ? `${c.price_change_percentage_24h >= 0 ? "+" : ""}${c.price_change_percentage_24h.toFixed(1)}%` 
      : "N/A";
    const vol = c.total_volume ? `$${(c.total_volume / 1e6).toFixed(0)}M` : "N/A";
    const rank = c.market_cap_rank || "?";
    return `**#${rank} ${c.name} (${c.symbol.toUpperCase()})** — ${price} | MCap: ${mcap} | 24h: ${change24h} | Vol: ${vol}`;
  });
  
  return lines.join("\n");
}

// Create server
const server = new McpServer({
  name: "coingecko",
  version: "1.0.0",
});

// ── Tool: search_coins ──
server.tool(
  "search_coins",
  "Search cryptocurrencies by name or symbol. Returns matching coins ranked by market cap, each with name, symbol, rank, and CoinGecko ID. Use the returned ID in get_prices, get_coin_details, or get_price_history for full data on a specific coin.",
  {
    query: z.string().describe("Search term (e.g. 'bitcoin', 'ETH', 'solana')"),
    limit: z.number().optional().default(10).describe("Max results (default 10)"),
  },
  async ({ query, limit }) => {
    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`
      );
      const coins = (data.coins || []).slice(0, limit);
      if (coins.length === 0) {
        return { content: [{ type: "text" as const, text: `No coins found for "${query}".` }] };
      }
      const lines = coins.map((c: any) => 
        `- **${c.name}** (${c.symbol.toUpperCase()}) — Rank #${c.market_cap_rank || "?"} — ID: \`${c.id}\``
      );
      return { content: [{ type: "text" as const, text: `**Search results for "${query}":**\n\n${lines.join("\n")}` }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_prices ──
server.tool(
  "get_prices",
  "Get real-time prices, market caps, 24h volume, and 24h price change for one or more coins. Accepts comma-separated CoinGecko IDs (use search_coins to find IDs). Returns formatted price, market cap, volume, and 24h change percentage for each coin. Useful for quick price checks across multiple tokens.",
  {
    coin_ids: z.string().describe("Comma-separated CoinGecko IDs (e.g. 'bitcoin,ethereum,solana')"),
    vs_currency: z.string().optional().default("usd").describe("Target currency (default: usd)"),
  },
  async ({ coin_ids, vs_currency }) => {
    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(coin_ids)}&vs_currencies=${vs_currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );
      const ids = coin_ids.split(",").map((s) => s.trim());
      const lines = ids.map((id) => {
        const d = data[id];
        if (!d) return `- **${id}**: not found`;
        const price = d[vs_currency] != null ? `$${d[vs_currency].toLocaleString()}` : "N/A";
        const mcap = d[`${vs_currency}_market_cap`] ? `$${(d[`${vs_currency}_market_cap`] / 1e9).toFixed(2)}B` : "N/A";
        const change = d[`${vs_currency}_24h_change`] != null ? `${d[`${vs_currency}_24h_change`].toFixed(1)}%` : "N/A";
        const vol = d[`${vs_currency}_24h_vol`] ? `$${(d[`${vs_currency}_24h_vol`] / 1e6).toFixed(0)}M` : "N/A";
        return `- **${id}**: ${price} | MCap: ${mcap} | 24h: ${change} | Vol: ${vol}`;
      });
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_market_overview ──
server.tool(
  "get_market_overview",
  "Get top cryptocurrencies ranked by market cap with price, market cap, 24h change, and 24h volume. Returns up to N coins (default 20) sorted by market cap descending. Useful for a quick snapshot of the overall market or identifying top performers.",
  {
    limit: z.number().optional().default(20).describe("Number of top coins (default 20)"),
    vs_currency: z.string().optional().default("usd").describe("Target currency (default: usd)"),
  },
  async ({ limit, vs_currency }) => {
    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=${vs_currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
      );
      return { content: [{ type: "text" as const, text: formatMarketData(data) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_trending ──
server.tool(
  "get_trending",
  "Get the top trending coins on CoinGecko over the last 24 hours based on search volume. Returns each trending coin's name, symbol, rank, market cap, and 24h price change. Useful for spotting momentum and emerging narratives in the crypto market.",
  {},
  async () => {
    try {
      const data = await rateLimitedFetch(`${COINGECKO_BASE}/search/trending`);
      const coins = data.coins || [];
      if (coins.length === 0) {
        return { content: [{ type: "text" as const, text: "No trending coins right now." }] };
      }
      const lines = coins.map((c: any, i: number) => {
        const coin = c.item;
        const mcap = coin.data?.market_cap ? `$${(coin.data.market_cap / 1e9).toFixed(1)}B` : "N/A";
        const change24h = coin.data?.price_change_percentage_24h?.usd != null
          ? `${coin.data.price_change_percentage_24h.usd >= 0 ? "+" : ""}${coin.data.price_change_percentage_24h.usd.toFixed(1)}%`
          : "N/A";
        return `**${i + 1}. ${coin.name}** (${coin.symbol.toUpperCase()}) — Rank #${coin.market_cap_rank || "?"} | MCap: ${mcap} | 24h: ${change24h}`;
      });
      return { content: [{ type: "text" as const, text: `**🔥 Trending Coins (last 24h):**\n\n${lines.join("\n")}` }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_coin_details ──
server.tool(
  "get_coin_details",
  "Get comprehensive details for a single coin by ID: current price, market cap, 24h/7d/30d changes, ATH/ATL, supply data, categories, genesis date, description, and links (homepage, Twitter, GitHub). Returns formatted markdown with all available market data. Use search_coins to find the coin ID first.",
  {
    coin_id: z.string().describe("CoinGecko coin ID (e.g. 'bitcoin', 'ethereum')"),
  },
  async ({ coin_id }) => {
    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/coins/${coin_id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
      );
      const md = data.market_data || {};
      const lines = [
        `**${data.name}** (${(data.symbol || "").toUpperCase()})`,
        "",
        `**Rank:** #${data.market_cap_rank || "?"}`,
        `**Categories:** ${(data.categories || []).filter(Boolean).join(", ") || "N/A"}`,
        `**Genesis Date:** ${data.genesis_date || "N/A"}`,
        `**Hashing Algorithm:** ${data.hashing_algorithm || "N/A"}`,
        "",
        "### Market Data",
        `- **Price:** $${md.current_price?.usd?.toLocaleString() || "N/A"}`,
        `- **Market Cap:** $${md.market_cap?.usd ? (md.market_cap.usd / 1e9).toFixed(2) + "B" : "N/A"}`,
        `- **24h Volume:** $${md.total_volume?.usd ? (md.total_volume.usd / 1e6).toFixed(0) + "M" : "N/A"}`,
        `- **24h Change:** ${md.price_change_percentage_24h != null ? md.price_change_percentage_24h.toFixed(1) + "%" : "N/A"}`,
        `- **7d Change:** ${md.price_change_percentage_7d != null ? md.price_change_percentage_7d.toFixed(1) + "%" : "N/A"}`,
        `- **30d Change:** ${md.price_change_percentage_30d != null ? md.price_change_percentage_30d.toFixed(1) + "%" : "N/A"}`,
        `- **ATH:** $${md.ath?.usd?.toLocaleString() || "N/A"} (${md.ath_date?.usd?.split("T")[0] || "?"})`,
        `- **ATL:** $${md.atl?.usd?.toLocaleString() || "N/A"} (${md.atl_date?.usd?.split("T")[0] || "?"})`,
        `- **Total Supply:** ${md.total_supply ? md.total_supply.toLocaleString() : "N/A"}`,
        `- **Max Supply:** ${md.max_supply ? md.max_supply.toLocaleString() : "N/A"}`,
        `- **Circulating Supply:** ${md.circulating_supply ? md.circulating_supply.toLocaleString() : "N/A"}`,
      ];

      if (data.description?.en) {
        const desc = data.description.en.replace(/<[^>]*>/g, "").slice(0, 500);
        lines.push("", "### Description", desc + (data.description.en.length > 500 ? "..." : ""));
      }

      const links: string[] = [];
      if (data.links?.homepage?.[0]) links.push(`Homepage: ${data.links.homepage[0]}`);
      if (data.links?.twitter_screen_name) links.push(`Twitter: https://x.com/${data.links.twitter_screen_name}`);
      if (data.links?.repos_url?.github?.[0]) links.push(`GitHub: ${data.links.repos_url.github[0]}`);
      if (links.length) {
        lines.push("", "### Links", links.map((l) => `- ${l}`).join("\n"));
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_price_history ──
server.tool(
  "get_price_history",
  "Get historical price data for a coin over N days (1, 7, 30, 90, 365, or max). Returns sampled daily prices with date stamps and overall period change percentage. Useful for charting trends and identifying price patterns over time.",
  {
    coin_id: z.string().describe("CoinGecko coin ID (e.g. 'bitcoin')"),
    vs_currency: z.string().optional().default("usd").describe("Target currency (default: usd)"),
    days: z.number().optional().default(7).describe("Number of days of history (1, 7, 30, 90, 365, or 'max')"),
  },
  async ({ coin_id, vs_currency, days }) => {
    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/coins/${coin_id}/market_chart?vs_currency=${vs_currency}&days=${days}`
      );
      const prices = data.prices || [];
      if (prices.length === 0) {
        return { content: [{ type: "text" as const, text: `No price history found for ${coin_id}.` }] };
      }
      
      // Sample points for display (max 30)
      const step = Math.max(1, Math.floor(prices.length / 30));
      const sampled = prices.filter((_: any, i: number) => i % step === 0);
      
      const lines = sampled.map(([ts, price]: [number, number]) => {
        const date = new Date(ts).toISOString().split("T")[0];
        return `${date}: $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      });

      const first = prices[0][1];
      const last = prices[prices.length - 1][1];
      const change = ((last - first) / first * 100).toFixed(1);
      
      return { 
        content: [{ 
          type: "text" as const, 
          text: `**${coin_id.toUpperCase()} price history (${days}d):** ${first > last ? "📉" : "📈"} ${change}% (${first > last ? "" : "+"}${change}%)\n\n${lines.join("\n")}` 
        }] 
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_global_stats ──
server.tool(
  "get_global_stats",
  "Get aggregate crypto market statistics: total market cap, 24h volume, BTC/ETH dominance percentages, number of active cryptocurrencies and exchanges, and 24h market cap change. Returns formatted summary of the entire crypto market in one call.",
  {},
  async () => {
    try {
      const data = await rateLimitedFetch(`${COINGECKO_BASE}/global`);
      const g = data.data || {};
      const lines = [
        "**🌍 Global Crypto Market Stats**",
        "",
        `- **Total Market Cap:** $${g.total_market_cap?.usd ? (g.total_market_cap.usd / 1e12).toFixed(2) + "T" : "N/A"}`,
        `- **24h Volume:** $${g.total_volume?.usd ? (g.total_volume.usd / 1e12).toFixed(2) + "T" : "N/A"}`,
        `- **BTC Dominance:** ${g.market_cap_percentage?.btc?.toFixed(1) || "N/A"}%`,
        `- **ETH Dominance:** ${g.market_cap_percentage?.eth?.toFixed(1) || "N/A"}%`,
        `- **Active Cryptos:** ${g.active_cryptocurrencies?.toLocaleString() || "N/A"}`,
        `- **Active Exchanges:** ${g.markets?.toLocaleString() || "N/A"}`,
        `- **Market Cap Change 24h:** ${g.market_cap_change_percentage_24h_usd?.toFixed(1) || "N/A"}%`,
      ];
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ── Tool: get_token_price_comparison ──
server.tool(
  "get_token_price_comparison",
  "Compare multiple tokens side-by-side in a formatted table. Shows price, market cap, 24h change, 7d change, and 24h volume for each coin. Accepts comma-separated CoinGecko IDs. Use search_coins to find IDs, then compare with this tool for a quick multi-token comparison.",
  {
    coin_ids: z.string().describe("Comma-separated coin IDs (e.g. 'bitcoin,ethereum,solana,avalanche-2')"),
    vs_currency: z.string().optional().default("usd").describe("Target currency"),
  },
  async ({ coin_ids, vs_currency }) => {
    try {
      const ids = coin_ids.split(",").map((s) => s.trim());
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=${vs_currency}&ids=${encodeURIComponent(coin_ids)}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`
      );
      
      if (!data || data.length === 0) {
        return { content: [{ type: "text" as const, text: "No coins found." }] };
      }

      // Build comparison table
      const header = `| Coin | Price | MCap | 24h | 7d | Vol |`;
      const sep = `|------|-------|------|-----|-----|-----|`;
      const rows = data.map((c: any) => {
        const price = c.current_price != null ? `$${c.current_price.toLocaleString()}` : "N/A";
        const mcap = c.market_cap ? `$${(c.market_cap / 1e9).toFixed(1)}B` : "N/A";
        const h24 = c.price_change_percentage_24h_in_currency != null 
          ? `${c.price_change_percentage_24h_in_currency >= 0 ? "+" : ""}${c.price_change_percentage_24h_in_currency.toFixed(1)}%`
          : "N/A";
        const h7d = c.price_change_percentage_7d_in_currency != null 
          ? `${c.price_change_percentage_7d_in_currency >= 0 ? "+" : ""}${c.price_change_percentage_7d_in_currency.toFixed(1)}%`
          : "N/A";
        const vol = c.total_volume ? `$${(c.total_volume / 1e6).toFixed(0)}M` : "N/A";
        return `| ${c.name} (${c.symbol.toUpperCase()}) | ${price} | ${mcap} | ${h24} | ${h7d} | ${vol} |`;
      });

      return { content: [{ type: "text" as const, text: `**Token Comparison (${vs_currency.toUpperCase()}):**\n\n${header}\n${sep}\n${rows.join("\n")}` }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
