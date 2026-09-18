# HZR Lens web

**Highlight. Zoom. Reason.** Evidence-led incident intelligence.

Next.js/React with strict TypeScript, MUI, TanStack Query, and Zod. The current page checks the actual API/database foundation; it does not present fictional incidents or working scenario controls.

Requires Node.js 24.

```sh
npm ci
```

Set `NEXT_PUBLIC_API_ORIGIN=http://localhost:8080` in `.env.local`, then:

```sh
npm run dev
```

Open `http://localhost:3000`. The API must allow that exact origin. The API generates and validates readiness state; the browser validates the received JSON with Zod. Advanced AI is unavailable and no provider credential input exists yet.

```sh
npm run api:lint
npm run api:generate
npm run typecheck
npm test
npm run lint
npm run build
```

`contracts/openapi.yaml` is a versioned snapshot from the API repository. Update it while both sibling repos are present with `node scripts/sync-contract.mjs`, then regenerate types. Standalone builds and CI use the checked-in snapshot and do not require access to another private repo. Do not hand-edit generated types. Cross-repo contract updates must be coordinated and reviewed.

All `NEXT_PUBLIC_` variables are public and embedded at build time. Never place PostgreSQL credentials or provider API keys in web env. On deployment, set the API's HTTPS origin before building. The frontend reads capability state from the API, avoiding independent provider/feature flags that can disagree with the backend.

The parent workspace's `docs/` remains the product design authority. Public hosting, incident UI, local inference, and the BYOK proxy are not implemented in this foundation.
