# CoinGecko MCP Server

> An MCP server for [CoinGecko](https://www.coingecko.com) — connect any MCP-compatible client to free crypto market data.

[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blueviolet)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

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

### 1. Install

```bash
npm install -g coingecko-mcp-server
```

Or run directly with npx:

```bash
npx -y coingecko-mcp-server
```

### 2. Configure your MCP client

Add to your MCP client config (e.g. `claude_desktop_config.json`):

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

Or with global install:

```json
{
  "mcpServers": {
    "coingecko": {
      "command": "coingecko-mcp-server"
    }
  }
}
```

### 3. Use it

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
