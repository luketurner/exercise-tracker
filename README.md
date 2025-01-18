# exercise-tracker

Exercise-tracker is a Web application that users can use to track their exercises over time.

Features:

- Sign-in with Github
- Users can define their own exercises with various "parameters": weight, distance, duration, etc.
- Users can log sets of exercises on a daily basis.
- Mobile-friendly UI with dark mode support.

I'm building this app live on stream at https://twitch.tv/LukeTurnerSWE.

## Local development

Dependencies:

- Git
- Bun
- Podman/Docker

To get started contributing to exercise-tracker, you need to clone it and run initial setup commands:

```bash
git clone https://github.com/luketurner/exercise-tracker.git
bun install
bun run db:create
bun run migration:run
```

Then, to run the app in development mode, you need the Postgres server, the client code bundler, and the Express server running:

```bash
bun run db:start
bun run client:dev
bun run dev
```

Then you can visit the app at http://localhost:3000.
