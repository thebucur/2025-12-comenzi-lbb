import { Router, Request, Response } from 'express'
import { processDictatedText, processInventoryVoice } from '../services/ai.service'
import { uploadAudio } from '../middleware/upload.middleware'

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

router.post('/process-inventory-voice', uploadAudio, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' })
    }

    const result = await processInventoryVoice(req.file.buffer, req.file.mimetype)

    res.json(result)
  } catch (error) {
    console.error('Error processing inventory voice:', error)
    res.status(500).json({
      error: 'Failed to process voice recording',
      transcript: '',
      entries: [],
    })
  }
})

export default router
