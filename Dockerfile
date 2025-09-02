FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
    jq \
    ripgrep \
    wget \
    ca-certificates \
    gnupg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install .NET 8 SDK (for roslyn-cli build)
RUN set -eux; \
    wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb; \
    dpkg -i /tmp/packages-microsoft-prod.deb; \
    rm /tmp/packages-microsoft-prod.deb; \
    apt-get update; \
    apt-get install -y dotnet-sdk-8.0; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

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
ENTRYPOINT ["/unity-editor-mcp/scripts/entrypoint.sh"]
CMD ["bash"]
