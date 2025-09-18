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
      // Look for the GLB file in common locations
      const possibleLocations = [
        path.join(process.cwd(), 'public', 'assets', 'magic8ball.glb'),
        path.join(process.cwd(), 'assets', 'magic8ball.glb'),
        path.join(process.cwd(), 'magic8ball.glb')
      ];
      
      for (const location of possibleLocations) {
        if (await fs.pathExists(location)) {
          console.log(`Found GLB file at: ${location}`);
          await fs.ensureDir(path.dirname(glbPath));
          await fs.copyFile(location, glbPath);
          console.log(`✅ Copied GLB file to: ${glbPath}`);
          break;
        }
      }
    }
    
    console.log('✅ Assets copied successfully!');
  } catch (err) {
    console.error('❌ Error copying assets:', err);
    process.exit(1);
  }
}

copyAssets().catch(console.error);
