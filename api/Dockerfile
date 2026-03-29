FROM node:22-slim AS builder
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/tsconfig.json ./
COPY api/src/ src/
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ dist/
COPY api/config.default.yaml ./

# Copy prompt directories
COPY academic/ /prompts/academic/
COPY design/ /prompts/design/
COPY engineering/ /prompts/engineering/
COPY game-development/ /prompts/game-development/
COPY marketing/ /prompts/marketing/
COPY paid-media/ /prompts/paid-media/
COPY product/ /prompts/product/
COPY project-management/ /prompts/project-management/
COPY sales/ /prompts/sales/
COPY specialized/ /prompts/specialized/
COPY support/ /prompts/support/
COPY spatial-computing/ /prompts/spatial-computing/

ENV PROMPTS_DIR=/prompts
ENV PORT=3100
EXPOSE 3100

CMD ["node", "dist/index.js", "rest"]
