FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
    jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN npm i -g npm@latest

RUN curl -fsSL https://claude.ai/install.sh | bash

RUN npm i -g \
    typescript@latest \
    eslint@latest \
    prettier@latest

RUN curl -fsSL https://astral.sh/uv/install.sh | bash
ENV PATH="/root/.cargo/bin:${PATH}"

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /unity-editor-mcp
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
