---
description: Generate and execute a Conventional Commit for staged changes
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

After generating the commit message:

1. Execute:
   ```sh
   git commit -m "<generated_commit_message>"
   ```
2. If the commit succeeds, return only the output from `git commit`.
3. If there are no staged changes, return:
   ```
   No staged changes to commit.
   ```
4. If the commit fails, return only the error output from Git.
5. Do not ask for confirmation before executing the commit.
6. Do not print the commit message by itself unless the commit fails before execution.
