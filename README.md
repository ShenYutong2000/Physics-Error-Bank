# Physics Error Bank

Next.js app for student mistake capture, paper practice, and teacher analytics.

## Runtime Requirements

- Node.js: `>=20 <23` (see `package.json` engines)
- PostgreSQL database (Prisma)

## Local Development

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill required values in `.env`.
3. Install and run:

```bash
npm install
npm run dev
```

4. Open `http://localhost:3000`.

## Vercel Deployment Checklist

Set these environment variables in Vercel Project Settings:

- Required:
  - `DATABASE_URL`
  - `AUTH_SECRET` (long random string)
  - `IMAGE_STORAGE`
- If `IMAGE_STORAGE=oss` (recommended for production):
  - `ALIYUN_OSS_REGION`
  - `ALIYUN_OSS_ACCESS_KEY_ID`
  - `ALIYUN_OSS_ACCESS_KEY_SECRET`
  - `ALIYUN_OSS_BUCKET`
  - Optional: `ALIYUN_OSS_ENDPOINT`, `ALIYUN_OSS_PREFIX`
- Optional auth bootstrap/admin:
  - `AUTH_EMAIL`
  - `AUTH_PASSWORD`
- Optional teacher allowlist extension:
  - `TEACHER_EMAILS` (comma-separated)

## Production Safety Notes

- In production, `IMAGE_STORAGE=local` is intentionally blocked for uploads.
  - Serverless local disk is ephemeral and not suitable for persistent user files.
  - Use `IMAGE_STORAGE=oss` in Vercel.
- Keep secrets only in environment variables. Never commit `.env`.

## Pre-Deploy Self Check

Run before pushing:

```bash
npm run lint
npm run build
```

If build fails, fix TypeScript/runtime issues first, then redeploy.
