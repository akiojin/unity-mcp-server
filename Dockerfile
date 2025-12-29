FROM node:22-bookworm

# Build-time auth tokens for GitHub CLI (passed via docker compose build args)
ARG GH_TOKEN
ARG GITHUB_TOKEN

RUN apt-get update && apt-get install -y \
    jq \
    ripgrep \
    curl \
    dos2unix \
    ca-certificates \
    gnupg \
    vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt update \
    && apt install gh -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI extensions (requires GH_TOKEN or GITHUB_TOKEN build arg)
RUN set -e; \
    TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"; \
    if [ -z "$TOKEN" ]; then \
        echo "GH_TOKEN or GITHUB_TOKEN build arg is required to install gh extensions." >&2; \
        exit 1; \
    fi; \
    GH_TOKEN="$TOKEN" GITHUB_TOKEN="$TOKEN" gh extension install twelvelabs/gh-repo-config; \
    gh auth logout -h github.com >/dev/null 2>&1 || true

# Install .NET 9 SDK (for C# LSP build) via official install script
ENV DOTNET_ROOT=/usr/share/dotnet
ENV PATH="${DOTNET_ROOT}:${PATH}"
RUN set -eux; \
    curl -fsSL -o /tmp/dotnet-install.sh https://dot.net/v1/dotnet-install.sh; \
    chmod +x /tmp/dotnet-install.sh; \
    /tmp/dotnet-install.sh --channel 9.0 --install-dir "$DOTNET_ROOT"; \
    ln -sf "$DOTNET_ROOT/dotnet" /usr/bin/dotnet; \
    dotnet --info

# Install uv/uvx
RUN curl -fsSL https://astral.sh/uv/install.sh | bash
ENV PATH="/root/.cargo/bin:${PATH}"

# Claude Code EXDEV workaround (Issue #14799)
# Prevents cross-device link error when /root/.claude and /tmp are on different filesystems
ENV TMPDIR=/root/.claude/tmp
RUN mkdir -p /root/.claude/tmp

# Node.js依存（corepack + pnpm）
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --ignore-scripts

WORKDIR /unity-mcp-server

# Use bash to invoke entrypoint to avoid exec-bit and CRLF issues on Windows mounts
ENTRYPOINT ["bash", "/unity-mcp-server/scripts/entrypoint.sh"]
CMD ["bash"]
