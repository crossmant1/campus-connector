# Git workflow

CampusConnect uses GitHub Flow so a team of four can integrate changes to the Phase 2 Find Matches slice without long-lived branches.

## Why GitHub Flow

- Short branches off `main`, one pull request, one teammate review, then delete the branch after merge.
- Four people shipping one slice: UC-04 Find Matches and the requirements it carries (FR-01, FR-02, NFR-02, NFR-03, NFR-04).
- A pull request names those identifiers so a change stays traceable to the Phase 2 catalog.

This document is the merge rule for those requirements. It does not implement student profiles, match scoring, or ranked results.

## Branching

1. Branch from current `main` with a short name (`feat/...`, `docs/...`).
2. Keep the branch to one requirement or one supporting change.
3. Open a pull request against `main`. State the use case and requirement IDs in the title or body.
4. Wait for one teammate review. The author does not merge their own pull request.
5. After merge, delete the branch.

`main` is the only long-lived branch. Direct pushes to `main` are not part of this workflow.

## Review

A reviewer checks that the pull request names a Phase 2 identifier, that secrets stay out of the repository, and that `npm test` still applies to the change.
