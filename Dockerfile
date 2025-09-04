FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
    jq \
    ripgrep \
    wget \
    curl \
    dos2unix \
    ca-certificates \
    gnupg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install .NET 9 SDK (for roslyn-cli build) via official install script
ENV DOTNET_ROOT=/usr/share/dotnet
ENV PATH="${DOTNET_ROOT}:${PATH}"
RUN set -eux; \
    wget -O /tmp/dotnet-install.sh https://dot.net/v1/dotnet-install.sh; \
    chmod +x /tmp/dotnet-install.sh; \
    /tmp/dotnet-install.sh --channel 9.0 --install-dir "$DOTNET_ROOT"; \
    ln -sf "$DOTNET_ROOT/dotnet" /usr/bin/dotnet; \
    dotnet --info

RUN curl -fsSL https://claude.ai/install.sh | bash

RUN npm i -g \
    npm@latest \
    typescript@latest \
    eslint@latest \
    prettier@latest \
    @openai/codex@latest \
    @google/gemini-cli@latest

RUN curl -fsSL https://astral.sh/uv/install.sh | bash
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /unity-editor-mcp
# Use bash to invoke entrypoint to avoid exec-bit and CRLF issues on Windows mounts
ENTRYPOINT ["bash", "/unity-editor-mcp/scripts/entrypoint.sh"]
CMD ["bash"]
