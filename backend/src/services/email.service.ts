import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { OAuth2Client } from 'google-auth-library'
import fs from 'fs/promises'

function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail OAuth2 neconfigurat: setează GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET și GMAIL_REFRESH_TOKEN în .env. ' +
        'Rulează  npx tsx scripts/get-gmail-token.ts  pentru a obține refresh token.'
    )
  }
  const client = new OAuth2Client(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

async function getTransporter(): Promise<Transporter> {
  const sender = process.env.GMAIL_SENDER
  if (!sender) {
    throw new Error('Setează GMAIL_SENDER în .env (adresa Gmail de pe care trimiți)')
  }

  const oauth2Client = getOAuth2Client()
  let accessToken: string | null = null
  try {
    const result = await oauth2Client.getAccessToken()
    accessToken = result.token ?? null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/invalid_client/i.test(msg)) {
      throw new Error(
        'Gmail OAuth2: invalid_client — Client ID sau Client Secret sunt greșite. ' +
          'Verifică GMAIL_CLIENT_ID și GMAIL_CLIENT_SECRET în .env (trebuie să corespundă cu cele din Google Cloud Console > APIs & Services > Credentials).'
      )
    }
    if (/invalid_grant|invalid credentials|wrong credentials/i.test(msg)) {
      throw new Error(
        'Gmail OAuth2: credențiale respinse (refresh token expirat sau revocat). ' +
          'Re-generează refresh token cu  npx tsx scripts/get-gmail-token.ts'
      )
    }
    throw err
  }
  if (!accessToken) {
    throw new Error('Nu s-a putut obține access token din refresh token. Re-generează GMAIL_REFRESH_TOKEN.')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    auth: {
      type: 'OAuth2',
      user: sender,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  })
}

function isSocketCloseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /socket close|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(msg)
}

function isCredentialError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /invalid_client|invalid_grant|invalid credentials|wrong credentials|username and password not accepted|authentication failed/i.test(msg)
}

export const sendOrderEmail = async (
  orderNumber: number,
  recipientEmail: string,
  pdfPath: string
): Promise<void> => {
  const from = process.env.GMAIL_SENDER!
  const pdfBuffer = await fs.readFile(pdfPath)
  const mailOptions = {
    from,
    to: recipientEmail,
    subject: `Comandă #${orderNumber}`,
    text: `Ați primit o nouă comandă #${orderNumber}. PDF în atașament.`,
    attachments: [
      {
        filename: `comanda-${orderNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  }

  const maxAttempts = 2
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transporter = await getTransporter()
    try {
      console.log(`[Email] [Gmail] Trimit PDF comanda #${orderNumber} către ${recipientEmail}${attempt > 1 ? ` (încercare ${attempt})` : ''}...`)
      await transporter.sendMail(mailOptions)
      transporter.close()
      console.log(`[Email] [Gmail] Trimis cu succes către ${recipientEmail} pentru comanda #${orderNumber}`)
      return
    } catch (err) {
      lastError = err
      Promise.resolve(transporter.close()).catch(() => {})
      if (attempt < maxAttempts && isSocketCloseError(err)) {
        console.warn(`[Email] [Gmail] Eroare conexiune (încercare ${attempt}), reîncerc...`, err instanceof Error ? err.message : err)
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      if (isCredentialError(err)) {
        const original = err instanceof Error ? err.message : String(err)
        throw new Error(
          `Gmail OAuth2: credențiale respinse (${original}). Re-generează refresh token cu  npx tsx scripts/get-gmail-token.ts`
        )
      }
      throw err
    }
  }

  throw lastError
}
