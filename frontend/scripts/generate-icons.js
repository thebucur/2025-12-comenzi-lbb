// Simple script to generate PWA icons from logo
// Run with: node scripts/generate-icons.js [logo-path]
// If no path provided, looks for logo.png, logo.jpg, logo.svg in public directory

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Find logo file
const logoExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
let logoPath = null;

// Check command line argument first
const args = process.argv.slice(2);
if (args.length > 0) {
  const providedPath = path.resolve(args[0]);
  if (fs.existsSync(providedPath)) {
    logoPath = providedPath;
  }
}

// If no argument, look for logo files in public directory
if (!logoPath) {
  for (const ext of logoExtensions) {
    const testPath = path.join(publicDir, `logo${ext}`);
    if (fs.existsSync(testPath)) {
      logoPath = testPath;
      break;
    }
  }
}

if (!logoPath) {
  console.error('❌ Logo file not found!');
  console.log('\nPlease provide a logo file:');
  console.log('  1. Place logo.png, logo.jpg, or logo.svg in frontend/public/');
  console.log('  2. Or run: node scripts/generate-icons.js path/to/logo.png');
  process.exit(1);
}

console.log(`✓ Using logo: ${logoPath}`);

// Generate PNG icons using sharp
async function generateIcons() {
  try {
    // Load and process the logo
    let image = sharp(logoPath);
    const metadata = await image.metadata();
    
    // Ensure square aspect ratio and add padding if needed
    const size = Math.max(metadata.width || 512, metadata.height || 512);
    
    // Resize to square with padding (white background)
    image = image
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });
    
    // Generate 192x192 icon
    await image
      .clone()
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    console.log('✓ Created pwa-192x192.png');
    
    // Generate 512x512 icon
    await image
      .clone()
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));
    console.log('✓ Created pwa-512x512.png');
    
    // Generate favicon
    await image
      .clone()
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Created favicon.ico');
    
    // Generate apple-touch-icon
    await image
      .clone()
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✓ Created apple-touch-icon.png');
    
    // Copy original as icon.svg if it's an SVG, otherwise create a reference
    if (logoPath.endsWith('.svg')) {
      fs.copyFileSync(logoPath, path.join(publicDir, 'icon.svg'));
      console.log('✓ Copied icon.svg');
    }
    
    console.log('\n✅ All PWA icons generated successfully from logo!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

