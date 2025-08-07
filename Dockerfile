# Node.js 22 (LTS) ベースイメージ
FROM node:22-bookworm

# 追加パッケージのインストール
# node:22-bookwormには既にcurl、wget、git、python3が含まれている
RUN apt-get update && apt-get install -y \
    unzip \
    jq \
    gh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


# Claude Codeのインストール
RUN npm install -g \
    @anthropic-ai/claude-code@latest \
    typescript@latest \
    eslint@latest \
    prettier@latest

# uvのインストール（uvxを含む）
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

# GitHub CLIのインストール
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# エントリーポイントスクリプトをコピー
COPY .docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /unity-editor-mcp
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
