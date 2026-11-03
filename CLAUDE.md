# Working in this repository

## Workflow: commit directly to `main`

The owner has asked that all work is done **directly on `main`**. Do not create feature branches
or pull requests unless the owner asks for one in that session.

- Start by syncing: `git checkout main && git pull --ff-only origin main`.
- Make small, focused commits and push them to `main` (`git push origin main`).
- Pushing to `main` triggers the **Deploy to GitHub Pages** workflow, so `main` must always be
  releasable. **Never push unless the whole pipeline passes locally**:

  ```bash
  npx tsc --noEmit && npm run check && npm test && npm run build
  ```

  (This is what `.github/workflows/deploy.yml` runs. A failing step skips the deploy.)
- If a push is rejected because `main` moved, `git pull --rebase origin main`, re-run the pipeline
  if the incoming changes touch the same areas, then push again. Never force-push `main`.
- If a push is refused by branch protection, stop and tell the owner rather than working around it.
- Other sessions may also push to `main`; always pull before starting and before pushing.

## Project docs

- `docs/GDD.md` is the game design document (a first-person creature-breeding tycoon).
- `docs/TASKS.md` is the milestone task list. Tick items off as they land.
- Keep new tuning values in `src/core/constants/game-config.ts` (no magic numbers).

## Conventions that have caused failures before

- Line endings are LF (`.gitattributes`, `biome.json`). `biome check` fails otherwise.
- `tsconfig` has `erasableSyntaxOnly`: no constructor parameter properties, no enums.
- Run `npx biome check --write src` before committing; import order and formatting are enforced.
- New systems follow the existing pattern: a manager/class with its own state, change callbacks,
  `serialize`/`restore` that tolerate bad data, a barrel `index.ts`, and vitest tests next to it.
- Game keys: `J` build, `Z` breeding den, `U` market, `F` feed, `L` bait, `Y` crate, `Q` collect bins, `T` photo, `B` food inventory.
