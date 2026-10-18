# WaiNot Nursery

Astro public site plus a secure, mobile-first **stock management app** at `/admin` (Supabase Postgres/Auth/Storage, deployed on Vercel).

## Local development (Docker)

```sh
npx supabase start -x logflare,vector,imgproxy,edge-runtime,supavisor   # needs Docker, ~10GB free disk
npx supabase status -o env      # copy API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env
npm run dev                     # http://localhost:4321/admin
npx supabase stop               # when finished (data is kept)
```

Studio: http://127.0.0.1:54323, test email inbox: http://127.0.0.1:54324. Create the first (owner) user in Studio → Authentication → Add user. `npx supabase db reset` wipes local data and re-applies migrations.

## Stock app setup (hosted)

1. Create a Supabase project. In Auth settings **disable public sign-ups** (staff are invited by an owner).
2. Apply `supabase/migrations/*.sql` (`supabase db push` or paste into the SQL editor).
3. Copy `.env.example` to `.env` and fill in the keys. `SUPABASE_SERVICE_ROLE_KEY` is server-only; set the same variables in Vercel.
4. Create the first user in Supabase Auth: the first user becomes the **owner**. Owners invite staff from Manage → Staff.
5. `npm run dev`, then open `/admin`. Camera scanning needs HTTPS (Vercel) or `localhost`.

The public nursery site reads its plant categories and active plant range from Supabase. The public catalog migration seeds the current categories and plants and exposes only public catalog fields through read-only views.

Security model: Row Level Security on every table (staff read + record movements; owners manage products and users), stock changes only through atomic `security definer` RPCs (no negative stock, immutable audit log, idempotent via `client_op_id`), same-origin checks on mutating API calls, zod validation, CSP and rate limiting. Scans made offline are queued in IndexedDB and synced automatically.

Scanning: EAN/UPC/Code128 barcodes already on pots, or print QR/Code128 labels from Manage → Labels (they encode `WN:<sku>`).

The admin dashboard guides setup in order: create categories, add products and assign a category, create batches and print their barcodes, then record stock. Product categories are required; categories in use cannot be deleted until their products are reassigned.

In `/admin` → Products, edit a product and use **On-hand stock** to set the counted quantity for a selected active batch. Batches can be named by plant age (for example, “Autumn 2026”) and include a potting date. Each batch receives its own barcode; print batch QR/Code128 labels from Setup → Labels and scan a batch label to select that batch automatically during stock movements or stocktakes. Stock is tracked by product and batch only. A zero-stock batch remains active until an owner manually archives it; batches with stock cannot be archived. Archived batches and discontinued products remain in history but are excluded from active stock selection.

Catalog descriptions, images, categories, prices, and the low-availability indicator are stored or calculated in Supabase and rendered from the public catalog view. The “Less than 10 available” badge appears when active on-hand stock is 11 units or fewer. The one-off local inventory setup seeds randomized opening counts (10–100 units) and 2026–27 WaiNot list prices (standard 60 mm Ellebag pricing, including GST; Lancewood is priced at its listed rate); verify current prices and replace generated counts with a stocktake before relying on them as real inventory.

`npm test` runs the unit tests. API surface lives under `src/pages/api`.

---

# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
