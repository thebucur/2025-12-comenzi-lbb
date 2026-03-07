import { google } from 'googleapis'
import fs from 'fs/promises'
import path from 'path'

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

function buildRawEmail(
  from: string,
  to: string,
  subject: string,
  textBody: string,
  attachmentFilename: string,
  attachmentBuffer: Buffer
): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const mimeMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
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
  pdfPath: string
): Promise<void> => {
  const from = process.env.GMAIL_SENDER
  if (!from) {
    throw new Error('Setează GMAIL_SENDER în .env (adresa Gmail de pe care trimiți)')
  }

  const pdfBuffer = await fs.readFile(pdfPath)
  const filename = `comanda-${orderNumber}.pdf`
  const subject = `Comandă #${orderNumber}`
  const body = `Ați primit o nouă comandă #${orderNumber}. PDF în atașament.`

  const raw = buildRawEmail(from, recipientEmail, subject, body, filename, pdfBuffer)

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
  pdfPath: string
): Promise<void> => {
  const from = process.env.GMAIL_SENDER
  if (!from) {
    throw new Error('Setează GMAIL_SENDER în .env (adresa Gmail de pe care trimiți)')
  }

  const pdfBuffer = await fs.readFile(pdfPath)
  const filename = `inventory-${username}-${dateStr}.pdf`
  const subject = `Inventar ${username} - ${dateStr}`
  const body = `Inventarul pentru ${username} din data ${dateStr}. PDF în atașament.`

  const raw = buildRawEmail(from, recipientEmail, subject, body, filename, pdfBuffer)

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
