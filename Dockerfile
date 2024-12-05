FROM oven/bun

WORKDIR /app
VOLUME /app/icons

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY locales locales
COPY tsconfig.json .

USER 1000
EXPOSE 5000
# ENV NODE_ENV production // https://github.com/elysiajs/elysia/issues/585
CMD ["bun", "src/index.ts"]