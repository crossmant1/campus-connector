# CampusConnect Deployment Guide

## Local Development

See [SETUP.md](./SETUP.md) for the full local workflow. The short version is:

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run migrate
npm run seed
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## CI/CD Pipeline

The pipeline is implemented with GitHub Actions in `.github/workflows/ci.yml`
and `.github/workflows/publish-image.yml`.

### CI

The `CI` workflow runs on pushes and pull requests. It starts PostgreSQL 15 and
Redis 7 services, installs the locked Node.js dependencies, lints the UC-04
files, builds the Next.js application, runs database migrations, runs the three
UC-04 rejection tests, and builds the API Docker image without pushing it.
Jest fails when line coverage drops below 65% for `src/middleware/auth.js`,
40% for `src/routes/matching.js`, or 40% for `src/routes/connections.js`. The
image build is a merge check so a broken Dockerfile fails the pull request.

### Publish to GHCR

When CI completes successfully for a push to `main`, the `Publish Docker image`
workflow builds the API container and publishes it to GitHub Container
Registry (GHCR) with two tags: `latest` and the commit SHA. The commit-SHA tag
identifies the image built from that revision.

The workflow authenticates with the repository's `GITHUB_TOKEN` and requires
`packages: write` permission. No Docker Hub credentials or external registry
secrets are used. The image path is:

```text
ghcr.io/OWNER/REPOSITORY:latest
ghcr.io/OWNER/REPOSITORY:<commit-sha>
```

Replace `OWNER/REPOSITORY` with the GitHub owner and repository name. For
example, to download a published image:

```bash
docker pull ghcr.io/OWNER/REPOSITORY:<commit-sha>
```

The API image listens on port 5000. Postgres, Redis, and the other
application settings still come from environment variables:

```bash
docker run --rm -p 5000:5000 -e DATABASE_URL=... -e REDIS_URL=... ghcr.io/OWNER/REPOSITORY:<commit-sha>
```

This workflow publishes the image; it does not deploy it to a running service.
The Dockerfile runs the Express API (`npm start`). The Next.js frontend is not
included in that API image.
