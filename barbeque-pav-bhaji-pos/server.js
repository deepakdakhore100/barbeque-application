import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');

// Serve static assets from production dist folder
app.use(express.static(distPath));

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Fallback for React Single Page App routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Production build not found. Please run "npm run build".');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Barbeque Pav Bhaji POS production server is active on port ${PORT}`);
});
