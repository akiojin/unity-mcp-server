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

# エントリーポイントスクリプトをコピー
COPY .docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /unity-editor-mcp
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
