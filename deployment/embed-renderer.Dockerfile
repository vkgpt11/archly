FROM node:22-bookworm-slim
WORKDIR /app
COPY ui/package.json ui/package-lock.json ./
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm ci && npx playwright install --with-deps chromium
COPY ui/ ./
ENV VITE_API_URL=/api
RUN npm run build
USER node
ENV PORT=8090
EXPOSE 8090
CMD ["node", "scripts/embed-renderer.mjs"]
