import { google } from 'googleapis'
import fs from 'fs/promises'
import path from 'path'
import prisma from '../lib/prisma'

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail OAuth2 neconfigurat: setează GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET și GMAIL_REFRESH_TOKEN în .env.'
    )
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

export async function getDevCcEmail(): Promise<string | null> {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { category_key: { category: 'devSettings', key: 'devCc' } },
    })
    if (config && config.value && typeof config.value === 'object') {
      const val = config.value as Record<string, unknown>
      if (val.enabled === true && typeof val.email === 'string' && val.email) {
        return val.email
      }
    }
  } catch (err) {
    console.error('[Email] Eroare la citirea devCc setting:', err)
  }
  return null
}

function buildRawEmail(
  from: string,
  to: string,
  subject: string,
  textBody: string,
  attachmentFilename: string,
  attachmentBuffer: Buffer,
  cc?: string
): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
  ]
  if (cc) {
    headers.push(`Cc: ${cc}`)
  }
  headers.push(
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  )

  const mimeMessage = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${attachmentFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentFilename}"`,
    '',
    attachmentBuffer.toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n')

  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export const sendOrderEmail = async (
  orderNumber: number,
  recipientEmail: string,
  pdfPath: string,
  ccEmail?: string
): Promise<void> => {
  const from = process.env.GMAIL_SENDER
  if (!from) {
    throw new Error('Setează GMAIL_SENDER în .env (adresa Gmail de pe care trimiți)')
  }

  const pdfBuffer = await fs.readFile(pdfPath)
  const filename = `comanda-${orderNumber}.pdf`
  const subject = `Comandă #${orderNumber}`
  const body = `Ați primit o nouă comandă #${orderNumber}. PDF în atașament.`

  const raw = buildRawEmail(from, recipientEmail, subject, body, filename, pdfBuffer, ccEmail)

  const oauth2Client = getOAuth2Client()
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const maxAttempts = 2
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Email] [Gmail API] Trimit comanda #${orderNumber} către ${recipientEmail}${attempt > 1 ? ` (încercare ${attempt})` : ''}...`)
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      })
      console.log(`[Email] [Gmail API] Trimis cu succes către ${recipientEmail} pentru comanda #${orderNumber}`)
      return
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      const isInvalidGrant =
        /invalid_grant|Token has been expired or revoked/i.test(msg) ||
        (err && typeof err === 'object' && 'response' in err &&
          typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string' &&
          (err as { response: { data: { error: string } } }).response.data.error === 'invalid_grant')
      if (isInvalidGrant) {
        console.error(
          '[Email] Gmail OAuth2 refresh token expirat sau revocat. Obține un token nou: cd backend && npx tsx scripts/get-gmail-token.ts, apoi actualizează GMAIL_REFRESH_TOKEN în Railway.'
        )
      }
      if (attempt < maxAttempts && /ECONNRESET|ETIMEDOUT|socket/i.test(msg)) {
        console.warn(`[Email] [Gmail API] Eroare conexiune (încercare ${attempt}), reîncerc...`, msg)
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      throw err
    }
  }

  throw lastError
}

export const sendInventoryEmail = async (
  username: string,
  dateStr: string,
  recipientEmail: string,
  pdfPath: string,
  ccEmail?: string
): Promise<void> => {
  const from = process.env.GMAIL_SENDER
  if (!from) {
    throw new Error('Setează GMAIL_SENDER în .env (adresa Gmail de pe care trimiți)')
  }

  const pdfBuffer = await fs.readFile(pdfPath)
  const filename = `inventory-${username}-${dateStr}.pdf`
  const subject = `Inventar ${username} - ${dateStr}`
  const body = `Inventarul pentru ${username} din data ${dateStr}. PDF în atașament.`

  const raw = buildRawEmail(from, recipientEmail, subject, body, filename, pdfBuffer, ccEmail)

  const oauth2Client = getOAuth2Client()
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const maxAttempts = 2
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Email] [Gmail API] Trimit inventar ${username}-${dateStr} către ${recipientEmail}${attempt > 1 ? ` (încercare ${attempt})` : ''}...`)
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      })
      console.log(`[Email] [Gmail API] Trimis cu succes către ${recipientEmail} pentru inventar ${username}-${dateStr}`)
      return
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      const isInvalidGrant =
        /invalid_grant|Token has been expired or revoked/i.test(msg) ||
        (err && typeof err === 'object' && 'response' in err &&
          typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string' &&
          (err as { response: { data: { error: string } } }).response.data.error === 'invalid_grant')
      if (isInvalidGrant) {
        console.error(
          '[Email] Gmail OAuth2 refresh token expirat sau revocat. Obține un token nou: cd backend && npx tsx scripts/get-gmail-token.ts, apoi actualizează GMAIL_REFRESH_TOKEN în Railway.'
        )
      }
      if (attempt < maxAttempts && /ECONNRESET|ETIMEDOUT|socket/i.test(msg)) {
        console.warn(`[Email] [Gmail API] Eroare conexiune (încercare ${attempt}), reîncerc...`, msg)
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      throw err
    }
  }

  throw lastError
}
