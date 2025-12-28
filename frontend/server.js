// Production server to handle /admin route rewrite
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const distPath = resolve(__dirname, 'dist')

// Serve static files
app.use(express.static(distPath))

// Rewrite /admin to /admin.html
app.get('/admin', (req, res) => {
  const adminHtmlPath = resolve(distPath, 'admin.html')
  if (existsSync(adminHtmlPath)) {
    res.sendFile(adminHtmlPath)
  } else {
    res.status(404).send('Admin app not found')
  }
})

// Handle SPA routing for main app - serve index.html for all non-file routes
// Also handle /admin/* routes by serving admin.html (for client-side routing)
app.get('*', (req, res, next) => {
  // Handle admin app routes (anything starting with /admin/ but not /admin itself)
  if (req.path.startsWith('/admin/')) {
    const adminHtmlPath = resolve(distPath, 'admin.html')
    if (existsSync(adminHtmlPath)) {
      return res.sendFile(adminHtmlPath)
    }
  }
  
  // Serve index.html for main app routes
  const indexPath = resolve(distPath, 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    next()
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

