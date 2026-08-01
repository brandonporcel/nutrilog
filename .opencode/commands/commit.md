---
description: Generate a Conventional Commit message for staged changes
---

Analyze the staged git changes (`git diff --cached`).

Generate a single Conventional Commit message.

Rules:

- Use Conventional Commits.
- Prefer concise messages.
- Use English.
- Use the imperative mood.
- Do not include a body unless explicitly requested.
- Do not explain the result.

Available types:

- feat
- fix
- refactor
- docs
- style
- test
- chore
- build
- ci
- perf

Preferred scopes:

- auth
- products
- categories
- brands
- units
- templates
- daily-log
- dashboard
- sync
- database
- ui
- pwa
- docs

Return only the commit message.
