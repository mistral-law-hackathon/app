# Clause — contract intelligence

Companies sign up, describe themselves (goals, activities, revenues, structure, red lines) and upload existing contracts. A new contract is reviewed by an LLM (OpenAI) against that context; each finding is anchored to the exact clause and can be accepted, rejected or discussed with the AI. Once every finding is resolved, the review is emailed from the app.

## Stack
Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind 4 · Prisma + SQLite · OpenAI API (`gpt-4.1` for PDF/scan extraction, review and chat; key read from `MISTRAL_API_KEY`, model from `MISTRAL_MODEL`) · Nodemailer.

## Setup
```bash
npm install
cp .env.example .env   # fill MISTRAL_API_KEY and AUTH_SECRET (openssl rand -hex 32)
npx prisma migrate dev
npm run dev
```
If `SMTP_HOST` is empty, emails go to an Ethereal test inbox and the app shows a preview link.
