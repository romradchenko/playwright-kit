# Agents Guide (playwright-kit)

You are contributing to an open-source TypeScript project called `playwright-kit`.

## Project intent
- This is **not** a testing framework.
- This repo is a collection of small, focused, production-ready utilities built on top of Playwright.
- The goal is to solve real-world E2E testing pain points **without changing existing workflows**.

## Engineering rules
- Do not introduce new frameworks or novel concepts.
- Prefer small composable functions over classes.
- Avoid over-engineering and premature extensibility.
- Assume the code will be read and used by senior engineers.
- Favor clarity over cleverness.
- Follow Playwright and Node.js best practices.
- TypeScript `strict` mode (no implicit `any`; prefer `unknown` over `any`).
- Avoid dynamic import queries (e.g. `typeof import("@playwright/test")["test"]`); prefer explicit `import type { ... }` and build types from them.
- Avoid `import("...")` / `require("...")` for fixed module specifiers; prefer top-level `import` / `import type` (exception: loading user-provided config files by path/URL).
- Keep public APIs small and well-documented; avoid breaking changes unless explicitly requested.

## When uncertain
- If something is unclear, ask first or leave `TODO:` comments instead of guessing.
