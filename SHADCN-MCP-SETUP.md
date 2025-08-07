# Shadcn MCP Setup Guide

## Overview
Your project now has shadcn MCP (Model Context Protocol) and GitHub MCP properly configured. This allows you to interact with shadcn/ui components and GitHub repositories through MCP servers.

## Configuration Files

### 1. `.mcp.json` (Main Configuration)
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "shadcn": {
      "command": "npx",
      "args": ["@jpisnice/shadcn-ui-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${env:SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### 2. `components.json` (Shadcn Configuration)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## Environment Variables Setup (SECURE)

### 1. Create `.env.local` file (NOT committed to Git)
Create a `.env.local` file in your project root with:
```bash
# GitHub Personal Access Token for shadcn MCP and GitHub MCP
GITHUB_TOKEN=your_actual_github_token_here

# Supabase Access Token (if needed)
SUPABASE_ACCESS_TOKEN=your_actual_supabase_token_here
```

### 2. Create `.env.example` file (committed to Git)
Create a `.env.example` file as a template:
```bash
# GitHub Personal Access Token for shadcn MCP and GitHub MCP
# Get your token from: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# Supabase Access Token (if needed)
# Get your token from: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=your_supabase_token_here
```

### 3. GitHub Token Setup
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Generate a new Personal Access Token (Classic)
3. Give it a descriptive name like "MCP Servers"
4. Select scopes: 
   - `repo` (for private repos) or `public_repo` (for public repos)
   - `read:org` (for organization access)
   - `read:user` (for user information)
5. Copy the token and add it to your `.env.local` file

## Available MCP Functions

### GitHub MCP Functions:
- `mcp__github__list_repositories` - List user/organization repositories
- `mcp__github__get_repository` - Get specific repository details
- `mcp__github__list_issues` - List repository issues
- `mcp__github__get_issue` - Get specific issue details
- `mcp__github__list_pull_requests` - List repository PRs
- `mcp__github__get_pull_request` - Get specific PR details
- `mcp__github__list_commits` - List repository commits
- `mcp__github__get_commit` - Get specific commit details
- `mcp__github__list_branches` - List repository branches
- `mcp__github__get_branch` - Get specific branch details
- `mcp__github__list_files` - List repository files
- `mcp__github__get_file` - Get specific file content
- `mcp__github__search_repositories` - Search repositories
- `mcp__github__search_issues` - Search issues
- `mcp__github__search_pull_requests` - Search PRs
- `mcp__github__search_code` - Search code

### Shadcn MCP Functions:
- `mcp__shadcn__list_components` - List all available shadcn components
- `mcp__shadcn__list_blocks` - List available component blocks
- `mcp__shadcn__get_block` - Get a specific component block
- `mcp__shadcn__get_component_demo` - Get component demo code
- `mcp__shadcn__get_component` - Get component source code

## Current Project Setup

Your project already has a comprehensive shadcn/ui setup with:

### Installed Components (in `src/components/ui/`):
- alert.tsx
- badge.tsx
- button.tsx
- calendar.tsx
- card.tsx
- chart-simple.tsx
- dropdown-menu.tsx
- input.tsx
- pagination.tsx
- popover.tsx
- searchable-select.tsx
- select.tsx
- separator.tsx
- sheet.tsx
- sidebar.tsx
- skeleton.tsx
- table.tsx
- tabs.tsx
- theme-provider.tsx
- theme-toggle.tsx
- tooltip.tsx

### Dependencies:
- shadcn/ui v4
- Tailwind CSS v4
- Radix UI components
- Class Variance Authority (CVA)
- clsx for conditional classes

## Usage Examples

### Adding New Components
```bash
npx shadcn@latest add [component-name]
```

### Using GitHub MCP Functions
The GitHub MCP server allows you to:
1. Browse repositories and their contents
2. Search for code, issues, and pull requests
3. Get file contents and commit information
4. Manage repository data programmatically

### Using Shadcn MCP Functions
The shadcn MCP server allows you to:
1. Browse available components
2. Get component source code
3. View component demos
4. Access component blocks

## Permissions

The following permissions are enabled in your `.claude/settings.local.json`:

### GitHub MCP Permissions:
- `mcp__github__list_repositories`
- `mcp__github__get_repository`
- `mcp__github__list_issues`
- `mcp__github__get_issue`
- `mcp__github__list_pull_requests`
- `mcp__github__get_pull_request`
- `mcp__github__list_commits`
- `mcp__github__get_commit`
- `mcp__github__list_branches`
- `mcp__github__get_branch`
- `mcp__github__list_files`
- `mcp__github__get_file`
- `mcp__github__search_repositories`
- `mcp__github__search_issues`
- `mcp__github__search_pull_requests`
- `mcp__github__search_code`

### Shadcn MCP Permissions:
- `mcp__shadcn__list_components`
- `mcp__shadcn__list_blocks`
- `mcp__shadcn__get_block`
- `mcp__shadcn__get_component_demo`
- `mcp__shadcn__get_component`
- `Bash(npx shadcn-ui@latest add:*)`
- `Bash(npx shadcn@latest add:*)`

## Security Best Practices

✅ **DO:**
- Use environment variables for sensitive tokens
- Keep `.env.local` in `.gitignore`
- Provide `.env.example` as a template
- Use minimal token permissions
- Rotate tokens regularly

❌ **DON'T:**
- Commit actual tokens to Git
- Share tokens in public repositories
- Use tokens with excessive permissions
- Hardcode tokens in configuration files

## Next Steps

1. **Set up environment variables**: Create `.env.local` with your actual tokens
2. **Test the MCP servers**: Try using both GitHub and shadcn MCP functions
3. **Add Components**: Use `npx shadcn@latest add [component]` to add new components
4. **Explore GitHub**: Use GitHub MCP to browse repositories and code
5. **Customize**: Modify the `components.json` to adjust styling and configuration
6. **Update**: Keep the MCP servers and shadcn CLI updated

## Troubleshooting

If you encounter issues:
1. Check that the GitHub token is valid and has proper permissions
2. Ensure the `.env.local` file exists and contains the correct token
3. Verify the MCP servers are running
4. Check that all dependencies are installed

## Resources

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Shadcn MCP Server](https://github.com/Jpisnice/shadcn-ui-mcp-server)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/server-github)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens) 