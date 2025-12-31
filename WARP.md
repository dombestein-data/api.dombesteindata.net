# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers API for dombesteindata.net, built as a serverless API endpoint primarily for handling contact form submissions. The API validates requests, verifies Cloudflare Turnstile tokens (bot protection), and sends emails via the Resend API.

## Commands

### Development
```bash
npm run dev
```
Starts local development server using Wrangler dev mode.

### Deployment
```bash
npm run deploy
```
Deploys the worker to Cloudflare Workers.

### Logs
```bash
npm run tail
```
Streams live logs from the deployed worker.

## Architecture

### Request Flow
1. **Entry Point**: `src/index.js` - Main worker fetch handler
   - Validates incoming request paths (only `/v1/*` endpoints allowed)
   - Checks origin against CORS allowlist
   - Routes requests to appropriate handlers
   - Handles OPTIONS preflight requests

2. **Route Handler**: `src/routes/v1/contact/send.js`
   - Parses and validates contact form payload
   - Verifies Cloudflare Turnstile token (skipped in dev mode)
   - Sends email via Resend API
   - Returns appropriate success/error responses

3. **Helper Libraries** (`src/lib/`)
   - `cors.js`: CORS header management with origin allowlist (`ALLOWED_ORIGINS`)
   - `validators.js`: Input validation (email format, field length requirements)
   - `turnstile.js`: Cloudflare Turnstile verification client
   - `json.js`: JSON response helper with proper headers

### Environment Variables
Required in `.dev.vars` for local development (excluded from git):
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key
- `RESEND_API_KEY`: Resend email service API key
- `CONTACT_TO_EMAIL`: Destination email for contact form submissions
- `RESEND_FROM_EMAIL`: (Optional) Sender email address
- `ENVIRONMENT`: Set to `dev` to bypass Turnstile verification

### CORS Configuration
Allowed origins are hardcoded in `src/lib/cors.js` (`ALLOWED_ORIGINS` Set):
- `https://dombesteindata.net`
- `https://dikult105.k.uib.no`

In dev mode, localhost origins are also permitted.

### API Endpoints

**POST /v1/contact/send**
- Validates origin (browser requests only)
- Requires JSON payload: `{ name, email, message, turnstileToken }`
- Validates all fields (name ≥2 chars, valid email format, message ≥10 chars)
- Verifies Turnstile token (production only)
- Sends email via Resend API
- Returns: `{ ok: true/false, message?, error?, resendId? }`

## Code Conventions

- ES modules (`type: "module"` in package.json)
- Relative imports with `.js` extensions required
- Environment variables accessed via `env` parameter passed to handlers
- All responses use the `json()` helper from `lib/json.js`
- Validation functions return `{ ok: boolean, error?: string, value?: object }` structure
- CORS headers attached to all responses for allowed origins
