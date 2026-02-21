FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

# Install deps at startup so volume-mounted node_modules stays in sync with package.json (e.g. after adding recharts)
CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT:-5173}"]