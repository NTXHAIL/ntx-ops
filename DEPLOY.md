# Put Hail Ops on the internet

This guide is for someone who is not a programmer. It puts the NTX Hail Ops website on Vercel and stores the shop data in Supabase.

You will create a free Supabase project (the database and photo storage), run one setup command on your computer, then connect the GitHub repo in Vercel.

Do the steps in order. You only do steps 1–8 once.

## 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Pick a name, a database password, and a region close to the shop. Write the database password down. You need it in the next step.
4. Wait until the project says it is ready.

## 2. Copy the database addresses

1. In Supabase, open **Project Settings** (the gear) → **Database**.
2. Find **Connection string** and choose **URI**.
3. You need two addresses:
   - **Transaction pooler** (port **6543**). This is `DATABASE_URL`.
   - **Direct connection** or **Session pooler** (port **5432**). This is `DIRECT_URL`.
4. Replace `[YOUR-PASSWORD]` in both addresses with the database password from step 1.
5. On the pooler address only (port 6543), add this to the end:

   `?pgbouncer=true&connection_limit=1`

   If the address already has a `?`, use `&pgbouncer=true&connection_limit=1` instead of a second `?`.

Example shapes (yours will have a real project id, region, and password):

```text
DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

## 3. Copy the storage keys

1. Still in Supabase, open **Project Settings** → **API** (or **API Keys**).
2. Copy the **Project URL**. That is `SUPABASE_URL`. It looks like `https://something.supabase.co`.
3. Copy the **service_role** secret key. That is `SUPABASE_SERVICE_ROLE_KEY`.
4. Keep the service_role key private. It is not the anon key. Do not put it in the website code or in a chat.

## 4. Create the photo bucket

Photos stay private. Customers cannot open them by guessing a link.

1. In Supabase, open **Storage**.
2. Click **New bucket**.
3. Name it exactly `estimate-photos`.
4. Leave **Public bucket** turned off.
5. Click **Create**.

If you skip this, the app creates that same private bucket the first time someone uploads a photo.

## 5. Put the keys in a file on your computer

1. On your computer, download this project (or open the folder you already have).
2. Copy the file `.env.example` and name the copy `.env`.
3. Open `.env` in a text editor.
4. Replace `DATABASE_URL` and `DIRECT_URL` with the two addresses from step 2. Keep the quotes.
5. Paste `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from step 3.
6. Replace `AUTH_SECRET` with a long random string (at least 32 letters and numbers). You can use [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) or any password generator. This is the key that signs login cookies.
7. Save the file. Do not email it or commit it to GitHub.

## 6. Create the tables and demo shop

You need Node.js installed (the version from [https://nodejs.org](https://nodejs.org) is fine).

In the project folder, run these two commands:

```bash
npm install
npm run db:setup
```

`npm run db:setup` is the one-time command. It creates the tables and loads demo shop data.

When it finishes, you can sign in with:

| Who | Email | Password |
| --- | --- | --- |
| Admin | `admin@ntxhail.local` | `HailOps!admin` |
| Estimator | `estimator@ntxhail.local` | `HailOps!est` |

Change these passwords before the shop uses the site for real work. They are demo accounts.

## 7. Import the repo in Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**.
3. Import this GitHub repository.
4. Leave the framework as **Next.js**. Do not add a custom build command. The project already runs Prisma generate, then `next build`.
5. Before you click Deploy, open **Environment Variables** and add every variable from your `.env` file:

   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STAFF_NOTIFY_EMAIL` (you can leave the demo value, or use a real inbox)

   Paste the values only. Do not include the quotes from the `.env` file.

6. Click **Deploy**.

The first deploy does not create the database. Step 6 already did that. Later deploys only publish the website.

## 8. Open the site and sign in

1. Vercel shows a link that ends in `.vercel.app`. Open it.
2. Sign in with `admin@ntxhail.local` and `HailOps!admin`.
3. Open an estimate, change a note, and wait until it says the draft is saved.
4. Add a photo. It should stay on the estimate after you refresh.

The login cookie is marked Secure, so it is only sent over the Vercel site (https). Photos are loaded through the app after you are signed in. They are not a public folder.

## When you change the database later

If a future update adds tables, run this once from your computer (with the same `.env` file) before you expect the new site to work:

```bash
npm run db:setup
```

It is safe to run again. It will not wipe the demo customers.

## Local tryout without Supabase photos

To run the app on your own computer against a Postgres database you installed yourself, put that database in `DATABASE_URL` and `DIRECT_URL` (they can be the same address) and leave the two `SUPABASE_` lines empty. Photos are then saved in a folder named `.data` on that computer. Do not deploy to Vercel with those two lines empty. Vercel cannot keep photos on its own disk.
