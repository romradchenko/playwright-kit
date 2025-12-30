## Releasing

This repo is a monorepo. The root package is private; only packages under `packages/*` are published.

### One-time GitHub setup

Set up npm Trusted Publishing (OIDC) for `@playwright-kit/auth` with `release-auth.yml` as the allowed workflow.

This allows publishing from GitHub Actions without storing an npm token in GitHub secrets.

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

