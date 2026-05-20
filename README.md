# kura-property-website-example

An example consumer site built with [Astro](https://astro.build) that reads a property-listings content set from a [kura](https://kuracms.com) project. Live at `property.kuracms.com`.

It exists to show, end-to-end:

- The dev defines the schema once in kura (or via an AI assistant through the kura MCP server).
- A non-technical editor adds and edits listings in kura's admin.
- This site fetches the published content from kura's REST API and renders it.

Each listing on the live demo is fictional. The site code is the kind of thing you'd write to consume kura from any Astro / Next / SvelteKit project.

## How it works

One file does all the kura plumbing: [`src/lib/kura.ts`](src/lib/kura.ts). It calls:

- `GET /api/v1/property/listing?...` to list properties for the index page.
- `GET /api/v1/property/listing?slug=...` to load a single property for the detail page.

`Authorization: Bearer <token>` on every request - the token is project-scoped and read-only on this surface. Both pages use server-side rendering on Cloudflare so edits in the kura admin show up without a redeploy.

## Run it locally

Create `.env` (gitignored):

```env
KURA_BASE_URL=https://kuracms.com
KURA_PROJECT=property
KURA_TOKEN=kr_live_...  # from your kura project's API tokens panel
```

Then:

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy   # wraps `astro build && wrangler pages deploy`
```

Set the same env vars (`KURA_BASE_URL`, `KURA_PROJECT`, `KURA_TOKEN`) as project variables in Cloudflare Pages.

## Licence

MIT.
