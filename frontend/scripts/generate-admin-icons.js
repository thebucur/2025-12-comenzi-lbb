// Script to generate admin PWA icons
// Run with: node scripts/generate-admin-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const adminIconSvg = path.join(publicDir, 'admin-icon.svg');

if (!fs.existsSync(adminIconSvg)) {
  console.error('❌ admin-icon.svg not found in public directory!');
  process.exit(1);
}

console.log(`✓ Using admin icon: ${adminIconSvg}`);

async function generateAdminIcons() {
  try {
    // Load and process the admin icon SVG
    let image = sharp(adminIconSvg);
    
    // Generate 192x192 icon
    await image
      .clone()
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'admin-pwa-192x192.png'));
    console.log('✓ Created admin-pwa-192x192.png');
    
    // Generate 512x512 icon
    await image
      .clone()
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'admin-pwa-512x512.png'));
    console.log('✓ Created admin-pwa-512x512.png');
    
    // Generate admin favicon
    await image
      .clone()
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'admin-favicon.ico'));
    console.log('✓ Created admin-favicon.ico');
    
    // Generate admin apple-touch-icon
    await image
      .clone()
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'admin-apple-touch-icon.png'));
    console.log('✓ Created admin-apple-touch-icon.png');
    
    console.log('\n✅ All admin PWA icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating admin icons:', error.message);
    process.exit(1);
  }
}

generateAdminIcons();


