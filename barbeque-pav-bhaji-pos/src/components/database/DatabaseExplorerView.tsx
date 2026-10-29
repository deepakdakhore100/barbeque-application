import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Database,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Table as TableIcon,
  Server,
  Terminal,
  ExternalLink,
  UploadCloud,
  Layers,
} from 'lucide-react';

interface QueryResult {
  success: boolean;
  command?: string;
  rowCount?: number;
  fields?: { name: string }[];
  rows?: Record<string, unknown>[];
  durationMs?: number;
  error?: string;
}

interface DBStatus {
  connected: boolean;
  time?: string;
  database?: string;
  version?: string;
  connectionHost?: string;
  error?: string;
  stats?: {
    totalOrders: number;
    totalTables: number;
    totalMenuItems: number;
    totalRevenue: number;
  };
}

export const DatabaseExplorerView: React.FC = () => {
  const { orders } = usePOS();
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [copiedPsql, setCopiedPsql] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // SQL Query state
  const [sqlQuery, setSqlQuery] = useState<string>(
    `SELECT id, order_number, order_type, table_number, captain_name, status, total, created_at \nFROM orders \nORDER BY created_at DESC \nLIMIT 10;`
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const neonConnectionString =
    'postgresql://neondb_owner:<dummy-password>@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      setDbStatus({ connected: false, error: err.message || 'Cannot reach API backend' });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Execute default query on load
    handleRunQuery(sqlQuery);
  }, []);

  const handleRunQuery = async (queryToRun?: string) => {
    const sql = queryToRun || sqlQuery;
    setIsExecuting(true);
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      setQueryResult(data);
    } catch (err: any) {
      setQueryResult({
        success: false,
        error: err.message || 'Network request failed',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSyncOrdersToPostgres = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    let successCount = 0;
    try {
      for (const order of orders) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order }),
        });
        if (res.ok) successCount++;
      }
      setSyncMessage(`Successfully synced ${successCount} orders to Neon PostgreSQL!`);
      fetchStatus();
      handleRunQuery();
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const presetQueries = [
    {
      title: 'Recent Orders',
      sql: `SELECT id, order_number, order_type, table_number, captain_name, status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 10;`,
    },
    {
      title: 'Order Items & Spice Levels',
      sql: `SELECT oi.order_id, o.order_number, oi.name, oi.quantity, oi.spice_level, oi.butter_preference, oi.price FROM order_items oi JOIN orders o ON oi.order_id = o.id ORDER BY o.created_at DESC LIMIT 15;`,
    },
    {
      title: 'Revenue Summary by Order Type',
      sql: `SELECT order_type, count(*) as total_orders, sum(total) as gross_revenue, round(avg(total), 2) as average_order_value FROM orders GROUP BY order_type ORDER BY gross_revenue DESC;`,
    },
    {
      title: 'Dining Tables & Sections',
      sql: `SELECT id, number, section, capacity, status, guest_count, assigned_captain FROM dining_tables ORDER BY number;`,
    },
    {
      title: 'Active Menu Items Matrix',
      sql: `SELECT id, name, category, price, station, prep_time_minutes, is_jain_available FROM menu_items ORDER BY category, price;`,
    },
  ];

  const handleCopyPsql = () => {
    navigator.clipboard.writeText(`psql "${neonConnectionString}"`);
    setCopiedPsql(true);
    setTimeout(() => setCopiedPsql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Neon PostgreSQL Database Explorer
              </h2>
              {dbStatus?.connected ? (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-2.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected (Neon AWS)</span>
                </span>
              ) : (
                <span className="text-xs bg-rose-500/10 text-rose-400 font-semibold px-2.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Checking Connection</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Direct connection to your PostgreSQL cloud instance. Query live orders, verify transactions, and run SQL statements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={isLoadingStatus}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>

          <button
            onClick={handleSyncOrdersToPostgres}
            disabled={isSyncing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isSyncing ? 'Syncing...' : 'Sync Active Orders to Postgres'}</span>
          </button>
        </div>
      </div>

      {/* Connection Diagnostic Alert if disconnected */}
      {dbStatus && !dbStatus.connected && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-200 text-sm block">
                PostgreSQL Connection Notice
              </span>
              <p className="text-rose-300/90 mt-1">
                {dbStatus.error || 'Cannot authenticate with Neon PostgreSQL.'}
              </p>
              {dbStatus.error?.includes('password authentication failed') && (
                <p className="text-neutral-300 mt-2 bg-black/40 p-2.5 rounded-xl border border-rose-900/50">
                  💡 <strong>How to resolve:</strong> Neon accounts automatically rotate or generate new passwords when a branch is reset. Go to <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">console.neon.tech</a>, click <strong>&quot;Connection Details&quot;</strong>, copy your connection string, and paste it below.
                </p>
              )}
            </div>
          </div>

          {/* Direct Connection String Updater */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('conn') as HTMLInputElement;
              if (!input.value.trim()) return;
              try {
                const res = await fetch('/api/database/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ connectionString: input.value.trim() }),
                });
                const data = await res.json();
                if (data.connected || data.success) {
                  alert('Connected to PostgreSQL successfully!');
                  fetchStatus();
                  handleRunQuery();
                } else {
                  alert(`Connection failed: ${data.error || 'Check credentials'}`);
                }
              } catch (err: any) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-rose-900/40"
          >
            <input
              name="conn"
              type="text"
              placeholder="Paste updated postgresql://neondb_owner:PASSWORD@.../neondb?sslmode=require"
              defaultValue={neonConnectionString}
              className="flex-1 bg-black border border-neutral-700 text-white font-mono text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shrink-0 transition-colors"
            >
              Update &amp; Reconnect
            </button>
          </form>
        </div>
      )}

      {syncMessage && (
        <div className="p-3 bg-amber-950/30 border border-amber-900/40 text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Connection & Live Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Database Name</span>
          <div className="text-base font-bold text-white mt-1 font-mono">
            {dbStatus?.database || 'neondb'}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
            ap-southeast-1 (AWS)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Orders in PostgreSQL</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            {dbStatus?.stats?.totalOrders ?? '—'}
          </div>
          <div className="text-[11px] text-neutral-400">Stored in table &lsquo;orders&rsquo;</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Floor Tables Configured</span>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono tabular-nums">
            {dbStatus?.stats?.totalTables ?? '—'}
          </div>
          <div className="text-[11px] text-neutral-400">Stored in &lsquo;dining_tables&rsquo;</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Total Settled Value</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            ₹{dbStatus?.stats?.totalRevenue ? dbStatus.stats.totalRevenue.toLocaleString('en-IN') : '—'}
          </div>
          <div className="text-[11px] text-neutral-400">Sum of orders total</div>
        </div>
      </div>

      {/* Preset Queries Strip */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
        <span className="text-xs font-semibold text-neutral-300 block">
          Quick Order & Analytics Queries (Click to load & run):
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {presetQueries.map((pq) => (
            <button
              key={pq.title}
              onClick={() => {
                setSqlQuery(pq.sql);
                handleRunQuery(pq.sql);
              }}
              className="px-3 py-1.5 rounded-lg border border-neutral-750 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{pq.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive SQL Editor */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-md">
        <div className="p-4 bg-neutral-850 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              SQL Query Console (Neon PostgreSQL)
            </span>
          </div>

          <button
            onClick={() => handleRunQuery()}
            disabled={isExecuting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
          >
            <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
            <span>{isExecuting ? 'Running...' : 'Run SQL'}</span>
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={4}
            className="w-full bg-neutral-950 border border-neutral-800 text-emerald-400 font-mono text-xs rounded-xl p-3.5 focus:outline-none focus:border-amber-500 selection:bg-neutral-800"
            placeholder="Type any SQL query, e.g. SELECT * FROM orders;"
          />
        </div>

        {/* Query Output View */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-neutral-300">
              Query Result:
            </span>
            {queryResult && (
              <span className="text-neutral-400 font-mono text-[11px]">
                {queryResult.success
                  ? `${queryResult.rowCount ?? queryResult.rows?.length ?? 0} rows returned in ${queryResult.durationMs ?? 0}ms`
                  : 'Execution error'}
              </span>
            )}
          </div>

          {queryResult?.error ? (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-mono">{queryResult.error}</span>
            </div>
          ) : queryResult?.rows && queryResult.rows.length > 0 ? (
            <div className="overflow-x-auto max-h-96 rounded-xl border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 uppercase text-[11px] font-semibold border-b border-neutral-800 sticky top-0">
                  <tr>
                    {Object.keys(queryResult.rows[0]).map((key) => (
                      <th key={key} className="py-2.5 px-3 font-mono whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300 bg-neutral-950">
                  {queryResult.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/60 transition-colors">
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 whitespace-nowrap tabular-nums">
                          {val === null || val === undefined ? (
                            <span className="text-neutral-600 italic">null</span>
                          ) : typeof val === 'object' ? (
                            JSON.stringify(val)
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : queryResult?.success ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Query executed successfully. 0 rows returned.
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-500">
              Click &lsquo;Run SQL&rsquo; to execute query.
            </div>
          )}
        </div>
      </div>

      {/* Terminal & External Client Guide */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>How to Query PostgreSQL Directly via Terminal / External Tools</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-neutral-300 font-semibold block mb-1">
              Option 1: Using psql CLI (Terminal)
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black text-emerald-400 p-2.5 rounded-xl border border-neutral-800 font-mono text-[11px] overflow-x-auto select-all">
                psql &quot;{neonConnectionString}&quot;
              </code>
              <button
                onClick={handleCopyPsql}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedPsql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPsql ? 'Copied!' : 'Copy psql'}</span>
              </button>
            </div>
            <p className="text-neutral-500 text-[11px] mt-1">
              Once connected in your terminal, run <code className="text-neutral-300">\dt</code> to list tables or <code className="text-neutral-300">SELECT * FROM orders;</code> to view orders.
            </p>
          </div>

          <div>
            <span className="text-neutral-300 font-semibold block mb-1">
              Option 2: Using Neon Web Console (Online SQL Editor)
            </span>
            <p className="text-neutral-400 text-[11px]">
              Log in to your Neon dashboard at <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-amber-400 underline">console.neon.tech</a>, select project &lsquo;ep-lively-truth&rsquo;, and open the <strong>SQL Editor</strong> tab to query tables with full graphical auto-complete.
            </p>
          </div>

          <div>
            <span className="text-neutral-300 font-semibold block mb-1">
              Option 3: Using GUI Clients (DBeaver, TablePlus, pgAdmin)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-neutral-400 pt-1 font-mono">
              <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                <span className="text-neutral-500 block text-[9px]">HOST</span>
                <span className="text-neutral-250 truncate block">ep-lively-truth...neon.tech</span>
              </div>
              <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                <span className="text-neutral-500 block text-[9px]">DATABASE</span>
                <span className="text-neutral-250">neondb</span>
              </div>
              <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                <span className="text-neutral-500 block text-[9px]">USER</span>
                <span className="text-neutral-250">neondb_owner</span>
              </div>
              <div className="p-2 rounded bg-neutral-800 border border-neutral-700">
                <span className="text-neutral-500 block text-[9px]">SSL MODE</span>
                <span className="text-emerald-400 font-bold">Require</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
