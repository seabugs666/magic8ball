import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyAssets() {
  try {
    const srcDir = path.join(__dirname, 'public');
    const destDir = path.join(__dirname, 'dist');
    
    // Ensure destination directory exists
    await fs.ensureDir(destDir);
    
    // Copy all files from public to dist
    await fs.copy(srcDir, destDir, { overwrite: true });
    
    console.log('✅ Assets copied successfully!');
  } catch (err) {
    console.error('❌ Error copying assets:', err);
    process.exit(1);
  }
}

copyAssets();
