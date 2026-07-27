# Student Registration

Simple admin-only system: login → register a student → view/search students by class →
SMS goes to parent and admin automatically.

Stack: React 18 + TypeScript + Vite, Supabase (Postgres, Auth, Edge Functions), Tailwind, deployed to Vercel.

## 1. Set up Supabase

1. Create a new Supabase project.
2. Run the migration:
   ```
   supabase link --project-ref your-project-ref
   supabase db push
   ```
   (or paste `supabase/migrations/0001_init.sql` into the SQL editor and run it.)
3. Create your first admin user in **Authentication → Users → Add user** (email + password).
4. Insert a matching row in `profiles` so the app recognizes them as admin:
   ```sql
   insert into profiles (id, full_name, role)
   values ('<the-user-id-from-auth>', 'Your Name', 'admin');
   ```
5. Adjust the seeded class names in the `classes` table to match the real class list.

## 2. Configure the SMS gateway (Edge Function)

The `notify-registration` function sends the SMS. It's written generically to POST
`{ to, message }` to whatever local gateway you use (e.g. an Africa's Talking-style
HTTP endpoint, or a telco/aggregator gateway). Set the secrets before deploying:

```
supabase secrets set SMS_GATEWAY_URL=https://your-gateway/send
supabase secrets set SMS_GATEWAY_API_KEY=your-key
supabase secrets set ADMIN_NOTIFY_PHONE=+265xxxxxxxxx
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to edge functions
automatically — no need to set those manually.

Deploy it:
```
supabase functions deploy notify-registration
```

If your gateway's request/response shape is different, the only thing to change is
the `sendSms` function inside `supabase/functions/notify-registration/index.ts`.

## 3. Run the app locally

```
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

## 4. Deploy to Vercel

Push to GitHub, import into Vercel, and set the same two env vars
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.

## How registration + notification works

1. Admin fills the form in the dashboard. The client inserts the student row directly
   (allowed by the `students_insert_admin` RLS policy).
2. On success, the client calls the `notify-registration` edge function with the new
   student's details.
3. The function sends two SMS messages (parent + admin) and logs both attempts to the
   `notifications` table using the service role key, regardless of whether the SMS
   succeeded — so you always have an audit trail, and a temporary gateway outage never
   blocks a registration from being saved.

## What's deliberately left out (v1, "one feature" scope)

- Editing/deleting students, teacher/parent login, payments, attendance — all out of
  scope for this pass. The `profiles.role` check constraint only allows `'admin'` for
  now; widen it later if you add more roles.
