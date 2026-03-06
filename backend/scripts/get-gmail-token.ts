/**
 * One-time helper to obtain a Gmail OAuth2 refresh token.
 *
 * Prerequisites:
 *   1. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env
 *   2. Enable the Gmail API for the project in Google Cloud Console
 *
 * Usage (two steps, both from backend/):
 *
 *   Step 1 — get the authorization URL:
 *     npx tsx scripts/get-gmail-token.ts
 *
 *   Step 2 — after authorizing, paste the full redirect URL or just the code:
 *     npx tsx scripts/get-gmail-token.ts "PASTE_CODE_OR_URL_HERE"
 */

import { OAuth2Client } from 'google-auth-library'
import dotenv from 'dotenv'
import path from 'path'
import { exec } from 'child_process'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const REDIRECT_URI = 'http://localhost'
const SCOPES = ['https://mail.google.com/']

const clientId = process.env.GMAIL_CLIENT_ID
const clientSecret = process.env.GMAIL_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error('ERROR: Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env before running this script.')
  process.exit(1)
}

const oauth2 = new OAuth2Client(clientId, clientSecret, REDIRECT_URI)

function extractCode(input: string): string {
  const match = input.match(/code=([^&]+)/)
  if (match) return decodeURIComponent(match[1])
  return input.trim()
}

function openBrowser(url: string) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`
  exec(cmd)
}

async function main() {
  const arg = process.argv[2]

  if (!arg) {
    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    })

    console.log('\n=== STEP 1: Authorize ===\n')
    console.log('Opening browser... If it does not open, visit this URL:\n')
    console.log(authUrl)
    console.log('\nAfter you authorize, Google redirects to a page that WON\'T LOAD — that\'s fine.')
    console.log('Copy the FULL URL from the browser address bar, then run:\n')
    console.log('  npx tsx scripts/get-gmail-token.ts "PASTE_THE_FULL_URL_HERE"\n')

    openBrowser(authUrl)
    return
  }

  const code = extractCode(arg)
  if (!code) {
    console.error('Could not extract authorization code from the input.')
    process.exit(1)
  }

  console.log('\n=== STEP 2: Exchanging code for tokens... ===\n')

  try {
    const { tokens } = await oauth2.getToken(code)

    console.log('========================================')
    console.log('  GMAIL_REFRESH_TOKEN obtained!')
    console.log('========================================')
    console.log(`\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`)
    console.log('Paste the line above into your backend/.env file.')
    console.log('========================================\n')
  } catch (err) {
    console.error('Token exchange failed:', err)
    process.exit(1)
  }
}

main()
