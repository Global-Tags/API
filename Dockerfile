FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY config.json .
COPY tsconfig.json .
RUN ls
# COPY public public

# ENV NODE_ENV production // https://github.com/elysiajs/elysia/issues/585
CMD ["bun", "src/index.ts"]