#!/bin/bash

# MCP Servers Startup Script
echo "🚀 Starting MCP Servers with environment variables..."

# Load environment variables from .env.local
if [ -f ".env.local" ]; then
    echo "📁 Loading environment variables from .env.local"
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "⚠️  .env.local not found. Please run ./setup-env.sh first"
    exit 1
fi

# Verify tokens are loaded
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not found in environment"
    exit 1
fi

if [ -z "$RAILWAY_API_TOKEN" ]; then
    echo "❌ RAILWAY_API_TOKEN not found in environment"
    exit 1
fi

echo "✅ Environment variables loaded successfully"
echo "   - GitHub Token: ${GITHUB_TOKEN:0:10}..."
echo "   - Railway Token: ${RAILWAY_API_TOKEN:0:10}..."

# Start MCP servers
echo ""
echo "🔧 Starting MCP Servers..."

# Railway MCP Server
echo "🚂 Starting Railway MCP Server..."
npx -y @jasontanswe/railway-mcp &
RAILWAY_PID=$!

# GitHub MCP Server  
echo "🐙 Starting GitHub MCP Server..."
npx -y @modelcontextprotocol/server-github &
GITHUB_PID=$!

# Shadcn MCP Server
echo "🎨 Starting Shadcn MCP Server..."
npx @jpisnice/shadcn-ui-mcp-server &
SHADCN_PID=$!

# Playwright MCP Server
echo "🎭 Starting Playwright MCP Server..."
npx -y @playwright/mcp &
PLAYWRIGHT_PID=$!

echo ""
echo "✅ All MCP Servers started successfully!"
echo "   - Railway MCP: PID $RAILWAY_PID"
echo "   - GitHub MCP: PID $GITHUB_PID"
echo "   - Shadcn MCP: PID $SHADCN_PID"
echo "   - Playwright MCP: PID $PLAYWRIGHT_PID"
echo ""
echo "🛑 To stop all servers, run: pkill -f 'railway-mcp\|server-github\|shadcn-ui-mcp-server\|@playwright/mcp'"