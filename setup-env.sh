#!/bin/bash

# Shadcn MCP Environment Setup Script
echo "🔧 Setting up environment variables for Shadcn MCP and GitHub MCP..."

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Create .env.local with placeholders
cat > .env.local << 'EOF'
# GitHub Personal Access Token for shadcn MCP and GitHub MCP
# Get your token from: https://github.com/settings/tokens
# Required scopes: repo (or public_repo), read:org, read:user
GITHUB_TOKEN=your_github_token_here

# Supabase Access Token (if needed)
# Get your token from: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=your_supabase_token_here
EOF

echo "✅ Created .env.local file"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local and replace 'your_github_token_here' with your actual GitHub token"
echo "2. Edit .env.local and replace 'your_supabase_token_here' with your actual Supabase token"
echo "3. Get your GitHub token from: https://github.com/settings/tokens"
echo "   - Required scopes: repo (or public_repo), read:org, read:user"
echo "4. Get your Supabase token from: https://supabase.com/dashboard/account/tokens"
echo ""
echo "🔒 Security note: .env.local is already in .gitignore and won't be committed to Git"
echo ""
echo "🚀 Available MCP Servers:"
echo "   - GitHub MCP: Browse repositories, issues, PRs, and code"
echo "   - Shadcn MCP: Access UI components and demos"
echo "   - Supabase MCP: Database operations and queries" 