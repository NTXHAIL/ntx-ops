# Put Hail Ops on the internet

Do these steps once, in the Vercel project. You do not install anything on your computer, and you do not copy database passwords or photo keys.

The first deploy creates the tables and a demo shop. Later deploys keep what is already there.

## 1. Open the project

1. Go to [https://vercel.com](https://vercel.com) and sign in.
2. Open the Hail Ops project.

## 2. Delete old Supabase variables

Do this before you connect the new database. If these are still filled in, they block the new database.

1. Open **Settings** → **Environment Variables**.
2. Delete these if they are listed:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Leave every other variable.

If you already connected Neon and the site still cannot reach the database, remove the Neon connection, delete those four names, then connect Neon again in the next step.

## 3. Create the database

1. Open the **Storage** tab.
2. Create a **Neon Postgres** database.
3. Connect it to this project for Production, Preview, and Development.

Neon fills in the database addresses for you. You do not copy them.

## 4. Create photo storage

1. Still in **Storage**, create a **Blob** store.
2. Connect it to this project.

Blob fills in the photo key for you. You do not copy it. Photos are only available to people who are signed in.

## 5. Add the login secret

1. Open **Settings** → **Environment Variables**.
2. Add a variable named `AUTH_SECRET`.
3. Open [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32), copy the string, and paste it as the value. It must be at least 32 characters. Do not use the example text `replace-with-a-long-random-string`.
4. Save it for Production, Preview, and Development.
5. Optional: add `STAFF_NOTIFY_EMAIL` with the inbox that should hear about new storm leads. The site still runs if you skip this.

## 6. Redeploy

1. Open **Settings** → **Build and Deployment**. If **Override** is turned on for the build command, turn it off. The project creates the tables while it builds. A custom command skips that.
2. Open **Deployments**.
3. On the latest deployment, click **Redeploy**.

When it finishes, open the `.vercel.app` link and sign in:

| Who | Email | Password |
| --- | --- | --- |
| Admin | `admin@ntxhail.local` | `HailOps!admin` |
| Estimator | `estimator@ntxhail.local` | `HailOps!est` |

Change these passwords before the shop uses the site for real work. The next deploy will not reset them and will not wipe the shop.
