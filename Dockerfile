# syntax=docker/dockerfile:1

FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development

EXPOSE 3000
CMD ["npm", "run", "dev"]
