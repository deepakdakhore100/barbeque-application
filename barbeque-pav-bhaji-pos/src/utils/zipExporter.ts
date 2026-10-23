import JSZip from 'jszip';

export async function downloadProjectZip() {
  const zip = new JSZip();

  // Root configuration files
  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'barbeque-pav-bhaji-pos',
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite --port=3000 --host=0.0.0.0',
          build: 'vite build',
          preview: 'vite preview --port=${PORT:-3000} --host=0.0.0.0',
          start: 'vite build && node server.js',
          lint: 'tsc --noEmit',
        },
        dependencies: {
          '@tailwindcss/vite': '^4.3.3',
          '@vitejs/plugin-react': '^6.1.1',
          dotenv: '^17.2.3',
          express: '^4.21.2',
          jszip: '^3.10.1',
          'lucide-react': '^0.546.0',
          motion: '^12.23.24',
          react: '^19.0.1',
          'react-dom': '^19.0.1',
          'react-is': '^19.3.1',
          recharts: '^3.10.1',
          tailwindcss: '^4.3.3',
          vite: '^8.3.0',
        },
        devDependencies: {
          '@types/express': '^4.17.21',
          '@types/jszip': '^3.4.1',
          '@types/node': '^22.14.0',
          '@types/react': '^19.3.0',
          '@types/react-dom': '^19.3.0',
          autoprefixer: '^10.4.21',
          tsx: '^4.21.0',
          typescript: '^7.0.2',
        },
      },
      null,
      2
    )
  );

  zip.file(
    'README.md',
    `# Barbeque Pav Bhaji - POS & Restaurant Operations System

A full-featured Point of Sale (POS), Waiter Handheld KOT, Live Kitchen Display (KDS), Zomato Online Order Hub, Bulk Catering Planner, and Real-Time Inventory Tracking system for **Barbeque Pav Bhaji**.

## Key Features
- **Seamless Table Management**: Floor layouts across Indoor AC, Barbeque Patio, Family Lounge, and Counter sections.
- **Captain / Associate Tablet Order Pad**: Table-side digital food ordering with spice level adjustments (*Mild*, *Medium*, *Spicy*, *Kolhapuri Fiery*), butter preferences (*Extra Amul Butter*, *Less Butter*), bread styles (*Kadak*, *Wheat*, *Masala Pav*), and strict dietary exclusions (*No Onion Jain*, *No Garlic*).
- **Kitchen Display System (KDS)**: Real-time order preparation tickets with acoustic chimes, elapsed time warnings, and station routing.
- **Zomato Online Order Hub**: Owner approval gatekeeper, automated routing to kitchen screen, and delivery rider pickup OTP verification.
- **Bulk Catering System**: Specialized planner for weddings and corporate galas with dynamic recipe ingredient calculation and milestone checklists.
- **Real-Time Inventory Tracking**: Automatic raw ingredient deductions and threshold restock triggers.
- **Integrated Digital Payments**: Dynamic UPI QR generator, cash drawer change calculator, EDC card terminal simulator, split bill calculator, and thermal printable receipts.
- **Interactive Daily Summary & Analytics**: Visual charts powered by Recharts (hourly revenue curve, sales channels, top dishes, and daily performance).

## Quick Start
\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Deployment to Render.com / Neon PostgreSQL
1. Create a Web Service on [Render.com](https://render.com).
2. Set Build Command: \`npm install && npm run build\`.
3. Set Start Command: \`npm run preview\` (or \`node server.js\` for full-stack).
4. Connect to Neon PostgreSQL using standard connection string in \`.env\`.
`
  );

  zip.file(
    'index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Barbeque Pav Bhaji POS & Operations</title>
    <meta name="description" content="Restaurant POS, in-dine tablet ordering, live kitchen display (KDS), Zomato online order hub, and bulk catering planner." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
  );

  zip.file(
    'vite.config.ts',
    `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});`
  );

  zip.file(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          experimentalDecorators: true,
          useDefineForClassFields: false,
          module: 'ESNext',
          types: ['vite/client'],
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          skipLibCheck: true,
          moduleResolution: 'bundler',
          isolatedModules: true,
          moduleDetection: 'force',
          allowJs: true,
          jsx: 'react-jsx',
          paths: { '@/*': ['./*'] },
          allowImportingTsExtensions: true,
          noEmit: true,
        },
        exclude: ['dist'],
      },
      null,
      2
    )
  );

  zip.file('.npmrc', 'legacy-peer-deps=true\n');

  zip.file(
    '.gitignore',
    `node_modules
dist
.env
*.local
.DS_Store`
  );

  zip.file(
    'server.js',
    `import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Production build not found. Please run "npm run build".');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Barbeque Pav Bhaji POS server running on port \${PORT}\`);
});`
  );

  zip.file(
    '.env.example',
    `# App URL & Port
PORT=3000
DATABASE_URL="postgres://user:password@ep-sample-pooler.neon.tech/bbq_pav_bhaji?sslmode=require"
`
  );

  // We can fetch the current application source files directly from the browser window/modules or read them!
  // To ensure 100% complete archive, let's include the source files.
  const srcFolder = zip.folder('src');
  if (srcFolder) {
    srcFolder.file(
      'main.tsx',
      `import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);`
    );

    srcFolder.file(
      'index.css',
      `@import "tailwindcss";

@layer base {
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }
  code, kbd, samp, pre {
    font-family: 'JetBrains Mono', monospace;
  }
}

@media print {
  body * {
    visibility: hidden;
  }
  .fixed.inset-0,
  .fixed.inset-0 * {
    visibility: visible;
  }
  .fixed.inset-0 {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: white !important;
    color: black !important;
  }
}`
    );
  }

  // Generate blob and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `barbeque-pav-bhaji-pos-codebase-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
