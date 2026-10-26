# Tasks

Local-only to-do app. Vite + React + TypeScript + Tailwind CSS + React Router. Data lives in your browser's localStorage.

Check it out at [tasks.poran.dev](https://tasks.poran.dev).

## Commands

```bash
pnpm install
pnpm dev        # development server
pnpm build      # typecheck + production build into dist/
pnpm preview    # serve dist/ locally
pnpm test       # unit tests (vitest)
pnpm lint       # apply biome linting and formatting
```

## JSON import

Import accepts an export from this app or a plain array. Every field is optional:

```json
[
  {
    "id": "task-01",
    "group": "Urgent",
    "task": "Do something",
    "note": "",
    "repeatDays": 1
  }
]
```

`group` is a group name or id; unknown names create the group.

## Repeating tasks

"Repeat after N days" brings a completed task back at local midnight, N days after the day it was completed. Completions stay in History, and streaks are computed from them.

## License

Licensed under the [Apache 2.0](./LICENSE) license.
