import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function copyAssets() {
  try {
    const srcDir = path.join(process.cwd(), 'public');
    const destDir = path.join(process.cwd(), 'dist');
    
    console.log(`Copying assets from ${srcDir} to ${destDir}`);
    
    // Ensure destination directory exists
    await fs.ensureDir(destDir);
    
    // Copy all files from public to dist
    await fs.copy(srcDir, destDir, { 
      overwrite: true,
      recursive: true,
      preserveTimestamps: true
    });
    
    // Verify the GLB file was copied
    const glbPath = path.join(destDir, 'assets', 'magic8ball.glb');
    const glbExists = await fs.pathExists(glbPath);
    
    if (glbExists) {
      console.log(`✅ GLB file found at: ${glbPath}`);
    } else {
      console.error(`❌ GLB file not found at: ${glbPath}`);
      // Try to find where the file might be
      console.log('Searching for GLB file in project...');
      const find = await import('find');
      const files = await find.file(/magic8ball\.glb$/, process.cwd());
      console.log('Found GLB files:', files);
    }
    
    console.log('✅ Assets copied successfully!');
  } catch (err) {
    console.error('❌ Error copying assets:', err);
    process.exit(1);
  }
}

copyAssets().catch(console.error);
