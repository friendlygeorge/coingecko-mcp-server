# CoinGecko MCP Server

> An MCP server for [CoinGecko](https://www.coingecko.com) — connect any MCP-compatible client to free crypto market data.

[![npm version](https://img.shields.io/npm/v/@supernova123/coingecko-mcp-server)](https://www.npmjs.com/package/@supernova123/coingecko-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@supernova123/coingecko-mcp-server)](https://www.npmjs.com/package/@supernova123/coingecko-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blueviolet)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-ready-orange)](https://claude.ai/download)
[![Cursor](https://img.shields.io/badge/Cursor-compatible-blue)](https://cursor.sh)

## What is this?

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants and agents access to CoinGecko's free crypto market data API — prices, market caps, trending coins, historical data, and global stats — through natural language.

Use it with **Claude Desktop**, **Cursor**, **Windsurf**, **Cline**, **Continue**, or any MCP-compatible client to ask questions about crypto markets, compare tokens, and track prices.

## Why use this?

- **No API key required** — CoinGecko's free tier works out of the box (rate-limited to ~27 calls/min)
- **8 built-in tools** — covers the most common crypto data queries
- **Clean markdown output** — results read naturally in chat
- **Rate-limited automatically** — respects free tier limits, retries on 429

## Tools

| Tool | Description |
|------|-------------|
| `search_coins` | Search for cryptocurrencies by name or symbol |
| `get_prices` | Get current prices, market caps, and 24h changes for one or more coins |
| `get_market_overview` | Get top N coins by market cap with full stats |
| `get_trending` | Get currently trending coins (last 24h search volume) |
| `get_coin_details` | Get detailed info about a specific coin (description, links, market data, categories) |
| `get_price_history` | Get historical price data (daily, weekly, monthly, yearly) |
| `get_global_stats` | Get global crypto market stats (total MCap, BTC dominance, active cryptos) |
| `get_token_price_comparison` | Compare prices and stats of multiple tokens side-by-side |

## Quick Start

### 1. Add to your MCP client

Add this to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "coingecko": {
      "command": "npx",
      "args": ["-y", "coingecko-mcp-server"]
    }
  }
}
```

That's it. No API key, no install step. npx downloads and runs it automatically.

### 2. Use it

Ask your AI assistant things like:

- "What's the current price of Bitcoin and Ethereum?"
- "Show me the top 10 coins by market cap"
- "What's trending on CoinGecko right now?"
- "Compare Solana, Avalanche, and Polkadot"
- "How has Bitcoin performed over the last 30 days?"
- "What's the total crypto market cap and BTC dominance?"
- "Search for AI-related crypto tokens"
- "Tell me about Chainlink — categories, links, market data"

## Example Output

### `get_trending`

```
🔥 Trending Coins (last 24h):

1. Bitcoin (BTC) — Rank #1 | MCap: $1,340.2B | 24h: +2.1%
2. Ethereum (ETH) — Rank #2 | MCap: $412.8B | 24h: +1.8%
3. Solana (SOL) — Rank #5 | MCap: $78.4B | 24h: +4.3%
...
```

### `get_token_price_comparison`

```
Token Comparison (USD):

| Coin | Price | MCap | 24h | 7d | Vol |
|------|-------|------|-----|-----|-----|
| Bitcoin (BTC) | $67,234 | $1,340.2B | +2.1% | +5.3% | $28,400M |
| Ethereum (ETH) | $3,456 | $412.8B | +1.8% | +3.1% | $14,200M |
| Solana (SOL) | $178.5 | $78.4B | +4.3% | +12.1% | $3,800M |
```

## Use Cases

### Portfolio Research
Ask "What's my portfolio worth?" after listing your holdings. The server compares prices across multiple tokens and gives you a snapshot with market caps, 24h changes, and volume.

### Yield Farming Research
"Show me trending coins with high volume" — find new opportunities by checking what's getting attention. Combine with `get_coin_details` to deep-dive into categories and links before committing.

### Market Intelligence
"What's the total crypto market cap and BTC dominance?" gives you macro context in seconds. Use `get_global_stats` before making any allocation decision.

### Token Comparison
"Compare Solana, Avalanche, and Polkadot" — side-by-side price, market cap, and performance data. Faster than opening three tabs on CoinGecko.

### Historical Analysis
"How has Bitcoin performed over the last 30 days?" — daily price history for trend analysis. Works with any timeframe (daily, weekly, monthly, yearly).

## Security

- **No API key by default** — uses CoinGecko's free tier. Optional API key for higher rate limits.
- **Read-only** — only fetches public market data from CoinGecko's API. No writes, no mutations.
- **No local file access** — does not read or write any files on your machine.
- **No shell access** — does not execute commands or spawn processes.
- **Rate-limited** — automatically caps requests to stay within free tier limits.
- **Open source** — MIT licensed. Inspect the code at [GitHub](https://github.com/friendlygeorge/coingecko-mcp-server).

## Troubleshooting

### Rate limit errors (429)
The server auto-retries on 429, but if you're making rapid queries, add a short delay between requests. Free tier allows ~27 calls/minute. If you hit this frequently, set a `COINGECKO_API_KEY` for higher limits.

### "Coin not found" errors
Use `search_coins` first to find the correct CoinGecko ID. Coin IDs are lowercase slugs (e.g. `bitcoin`, `ethereum`, `solana`), not ticker symbols.

### Server won't start
Make sure Node.js 18+ is installed: `node --version`. If using npx, ensure npm is up to date: `npm install -g npm@latest`.

### MCP client can't connect
Verify the config path is correct. Claude Desktop uses `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS and `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Restart the client after config changes.

### Slow responses
CoinGecko's free tier has ~300ms latency per call. Multi-coin queries (`get_prices`, `get_token_price_comparison`) make one API call regardless of how many coins you pass, so batch your queries.

## Requirements

- Node.js 18+
- No API key needed (CoinGecko free tier)

## Rate Limits

The server automatically rate-limits requests to ~27 calls/minute to stay within CoinGecko's free tier. If you have a CoinGecko Pro API key, you can set the `COINGECKO_API_KEY` environment variable for higher limits:

```json
{
  "mcpServers": {
    "coingecko": {
      "command": "coingecko-mcp-server",
      "env": {
        "COINGECKO_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Development

```bash
git clone https://github.com/nova/coingecko-mcp-server.git
cd coingecko-mcp-server
npm install
npm run build
npm start
```

## License

MIT
