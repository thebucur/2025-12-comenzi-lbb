import nodemailer from 'nodemailer'
import fs from 'fs/promises'
import path from 'path'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const sendOrderEmail = async (
  orderNumber: number,
  recipientEmail: string,
  pdfPath: string
) => {
  try {
    const pdfBuffer = await fs.readFile(pdfPath)

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: `Comandă #${orderNumber}`,
      text: `Ați primit o nouă comandă #${orderNumber}`,
      attachments: [
        {
          filename: `comanda-${orderNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    console.log(`Email sent for order #${orderNumber}`)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

