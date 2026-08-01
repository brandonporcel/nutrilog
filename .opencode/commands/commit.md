# Commit

Generate a git commit message following the Conventional Commits specification.

Rules:

- Use concise and descriptive messages.
- Do not mention implementation details unless they provide meaningful context.
- Prefer English.
- Use the imperative mood.

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

When generating the commit:

1. Analyze all staged changes.
2. Determine the most appropriate Conventional Commit type.
3. Generate only the commit message.
4. Do not include explanations unless explicitly requested.

Examples:

feat(products): add product creation

fix(sync): prevent duplicated daily logs

docs(database): update product model

refactor(ui): simplify dashboard layout
