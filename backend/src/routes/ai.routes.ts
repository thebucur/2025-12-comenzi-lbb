import { Router, Request, Response } from 'express'
import { processDictatedText } from '../services/ai.service'

const router = Router()

router.post('/process-dictation', async (req: Request, res: Response) => {
  try {
    const { text, fieldType } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    if (!fieldType || !['decorDetails', 'observations'].includes(fieldType)) {
      return res.status(400).json({ error: 'fieldType must be "decorDetails" or "observations"' })
    }

    const processedText = await processDictatedText(text, fieldType)

    res.json({ processedText })
  } catch (error) {
    console.error('Error processing dictation:', error)
    res.status(500).json({
      error: 'Failed to process dictation',
      processedText: req.body.text,
    })
  }
})

export default router
