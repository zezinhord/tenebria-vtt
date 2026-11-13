FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev --no-audit --no-fund
ENV PORT=4173
EXPOSE 4173
CMD ["node","server/index.mjs"]
