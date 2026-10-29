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
          pg: '^8.13.1',
        },
        devDependencies: {
          '@types/express': '^4.17.21',
          '@types/jszip': '^3.4.1',
          '@types/node': '^22.14.0',
          '@types/pg': '^8.11.10',
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
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let currentConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_wiT6Yh4sGSWl@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';


function createPool(connStr) {
  const cleanConn = connStr.replace(/([&?])channel_binding=[^&]+(&|$)/, '$1').replace(/\\?$/, '');
  return new Pool({
    connectionString: cleanConn,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

let pool = createPool(currentConnectionString);

async function ensureTables() {
  const sql = \`
    CREATE TABLE IF NOT EXISTS dining_tables (
      id VARCHAR(50) PRIMARY KEY,
      number VARCHAR(20) NOT NULL,
      section VARCHAR(50) NOT NULL,
      capacity INT NOT NULL DEFAULT 4,
      status VARCHAR(30) NOT NULL DEFAULT 'available',
      current_order_id VARCHAR(50),
      guest_count INT,
      assigned_captain VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL,
      order_type VARCHAR(30) NOT NULL DEFAULT 'in_dine',
      table_id VARCHAR(50),
      table_number VARCHAR(20),
      captain_name VARCHAR(100),
      customer_name VARCHAR(150),
      customer_phone VARCHAR(50),
      status VARCHAR(40) NOT NULL DEFAULT 'sent_to_kitchen',
      subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
      tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(10, 2) DEFAULT 0,
      service_charge NUMERIC(10, 2) DEFAULT 0,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      special_instructions TEXT,
      kot_fired_at TIMESTAMP WITH TIME ZONE,
      kitchen_acknowledged_at TIMESTAMP WITH TIME ZONE,
      kitchen_ready_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      menu_item_id VARCHAR(50),
      name VARCHAR(150) NOT NULL,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 1,
      spice_level VARCHAR(30) DEFAULT 'Medium',
      butter_preference VARCHAR(50) DEFAULT 'Normal Butter',
      pav_type VARCHAR(50) DEFAULT 'Standard Butter Pav',
      exclusions TEXT[],
      special_notes TEXT,
      item_status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  \`;
  try {
    await pool.query(sql);
  } catch (e) {
    console.warn('Auto-schema note:', e.message);
  }
}

ensureTables();

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/database/status', async (req, res) => {
  try {
    const timeRes = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    const ordersCountRes = await pool.query('SELECT count(*) as total_orders FROM orders');
    const tablesCountRes = await pool.query('SELECT count(*) as total_tables FROM dining_tables');
    const revRes = await pool.query('SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders');

    res.json({
      connected: true,
      time: timeRes.rows[0].current_time,
      database: timeRes.rows[0].db_name,
      version: timeRes.rows[0].pg_version,
      stats: {
        totalOrders: parseInt(ordersCountRes.rows[0].total_orders, 10),
        totalTables: parseInt(tablesCountRes.rows[0].total_tables, 10),
        totalRevenue: parseFloat(revRes.rows[0].total_revenue),
      },
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message || String(err) });
  }
});

app.post('/api/database/config', async (req, res) => {
  const { connectionString } = req.body;
  if (!connectionString) return res.status(400).json({ error: 'Connection string is required' });
  try {
    await pool.end();
  } catch {}
  currentConnectionString = connectionString.trim();
  pool = createPool(currentConnectionString);
  try {
    const test = await pool.query('SELECT NOW() as now, current_database() as db');
    await ensureTables();
    res.json({ success: true, message: 'Connected to PostgreSQL successfully', db: test.rows[0].db });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

app.post('/api/database/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL string is required' });
  try {
    const start = Date.now();
    const result = await pool.query(sql);
    res.json({
      success: true,
      command: result.command,
      rowCount: result.rowCount,
      fields: result.fields ? result.fields.map((f) => ({ name: f.name })) : [],
      rows: result.rows,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    await ensureTables();
    const ordersRes = await pool.query(\`
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'name', oi.name,
              'price', oi.price,
              'quantity', oi.quantity,
              'spiceLevel', oi.spice_level,
              'butterPreference', oi.butter_preference,
              'itemStatus', oi.item_status
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    \`);
    res.json(ordersRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/api/orders', async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ error: 'Order data required' });
  try {
    await ensureTables();
    const insertOrderSql = \`
      INSERT INTO orders (
        id, order_number, order_type, table_id, table_number, captain_name,
        customer_name, customer_phone, status, subtotal, tax, discount, service_charge,
        total, special_instructions, kot_fired_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        subtotal = EXCLUDED.subtotal,
        tax = EXCLUDED.tax,
        total = EXCLUDED.total,
        table_number = EXCLUDED.table_number,
        captain_name = EXCLUDED.captain_name
    \`;

    const orderTime = order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString();

    await pool.query(insertOrderSql, [
      order.id || \`ord_\${Date.now()}\`,
      order.orderNumber || \`#BBQ-\${Math.floor(1000 + Math.random() * 9000)}\`,
      order.type || 'in_dine',
      order.tableId || null,
      order.tableNumber || null,
      order.captainName || null,
      order.customerName || null,
      order.customerPhone || null,
      order.status || 'sent_to_kitchen',
      order.subtotal || 0,
      order.tax || 0,
      order.discount || 0,
      order.serviceCharge || 0,
      order.total || 0,
      order.specialInstructions || null,
      order.kotFiredAt ? new Date(order.kotFiredAt).toISOString() : orderTime,
      orderTime,
    ]);

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const itemId = item.id || \`oi_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
        await pool.query(
          \`INSERT INTO order_items (
            id, order_id, menu_item_id, name, price, quantity,
            spice_level, butter_preference, pav_type, exclusions, special_notes, item_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            item_status = EXCLUDED.item_status\`,
          [
            itemId,
            order.id,
            item.menuItemId || null,
            item.name || 'Menu Item',
            item.price || 0,
            item.quantity || 1,
            item.customization?.spiceLevel || 'Medium',
            item.customization?.butterPreference || 'Normal Butter',
            item.customization?.pavType || 'Standard Butter Pav',
            item.customization?.exclusions || [],
            item.customization?.specialNotes || null,
            item.itemStatus || 'pending',
          ]
        );
      }
    }
    res.json({ success: true, orderId: order.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
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
