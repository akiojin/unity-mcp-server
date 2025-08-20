FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
    jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://claude.ai/install.sh | bash

RUN npm i -g \
    npm@latest \
    typescript@latest \
    eslint@latest \
    prettier@latest

RUN curl -fsSL https://astral.sh/uv/install.sh | bash
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /unity-editor-mcp
ENTRYPOINT ["/unity-editor-mcp/scripts/entrypoint.sh"]
CMD ["bash"]
