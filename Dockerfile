FROM node:22-bookworm

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

RUN npm i -g \
    npm@latest \
    bun@latest \
    typescript@latest \
    eslint@latest \
    prettier@latest \
    @anthropic-ai/claude-code@latest \
    @openai/codex@latest \
    @google/gemini-cli@latest

WORKDIR /unity-mcp-server
# Use bash to invoke entrypoint to avoid exec-bit and CRLF issues on Windows mounts
ENTRYPOINT ["bash", "/unity-mcp-server/scripts/entrypoint.sh"]
CMD ["bash"]
