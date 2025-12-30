## Releasing

This repo is a monorepo. The root package is private; only packages under `packages/*` are published.

### One-time GitHub setup

Create an npm access token that can publish `@playwright-kit/auth` and add it to GitHub repo secrets as `NPM_TOKEN`.

If your package requires 2FA for publishing, use a granular token with 2FA bypass enabled (or adjust the package’s publishing access settings accordingly).

### Release `@playwright-kit/auth`

1) Update `packages/auth/CHANGELOG.md` (optional but recommended).
2) Bump the version in `packages/auth/package.json` (and commit it):

```bash
cd packages/auth
npm version patch --no-git-tag-version
cd ../..
git add packages/auth/package.json packages/auth/CHANGELOG.md
git commit -m "release(auth): v$(node -p \"require('./packages/auth/package.json').version\")"
```

3) Create and push a tag in the format `@playwright-kit/auth@<version>`:

```bash
git tag "@playwright-kit/auth@$(node -p \"require('./packages/auth/package.json').version\")"
git push origin main
git push origin --tags
```

That tag triggers the GitHub Action that:
- runs `npm ci`
- verifies the tag matches `packages/auth/package.json#version`
- publishes `@playwright-kit/auth` to npm
- creates a GitHub Release for the tag

