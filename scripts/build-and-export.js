import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const execAsync = promisify(exec);

async function buildAndExport() {
    console.log('Starting build process...');

    try {
        // Run the build command
        console.log('Running npm run build...');
        const { stdout, stderr } = await execAsync('npm run build', { cwd: rootDir });

        console.log(stdout);
        if (stderr) {
            console.warn('Build warnings/messages:', stderr);
        }

        console.log('Build completed successfully.');
        console.log('Output directory: dist');

    } catch (error) {
        console.error('Build failed:', error.message);
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        process.exit(1);
    }
}

buildAndExport();
