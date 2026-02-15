# Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage 1: Build stage
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
CMD ["npm", "run", "start:dev"]

# Stage 3: Production stage
FROM base AS production
ENV NODE_ENV=production
RUN npm install --only=production
COPY --from=build /app/dist ./dist
CMD ["node", "dist/main"]
