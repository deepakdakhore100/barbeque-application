import React, { useState, useEffect } from 'react';
import {
  Database,
  Terminal,
  RotateCw,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Key,
  ExternalLink,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';

interface DatabaseStatus {
  connected: boolean;
  time?: string;
  database?: string;
  targetDatabase?: string;
  fallbackActive?: boolean;
  version?: string;
  stats?: {
    totalOrders: number;
    totalTables: number;
    totalRevenue: number;
  };
  error?: string;
  hint?: string;
  connectionUrl?: string;
}

interface QueryResult {
  success: boolean;
  command?: string;
  rowCount?: number;
  fields?: { name: string }[];
  rows?: Record<string, unknown>[];
  durationMs?: number;
  error?: string;
}

export const DatabaseExplorerView: React.FC = () => {
  const { orders, onlineOrders, bulkOrders, syncAllOrdersToPostgres, clearOldOrders } = usePOS();

  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reconnection input state
  const [inputConnString, setInputConnString] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [showRenderGuide, setShowRenderGuide] = useState<boolean>(false);
  const [copiedPsql, setCopiedPsql] = useState<boolean>(false);

  // Interactive SQL Editor State
  const [sqlQuery, setSqlQuery] = useState<string>(
    `SELECT id, order_number, order_type, table_number, captain_name, status, total, created_at \nFROM orders \nORDER BY created_at DESC \nLIMIT 10;`
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const defaultNeonConnection =
    'postgresql://neondb_owner:YOUR_PASSWORD@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      setDbStatus({
        connected: false,
        error: err.message || 'Cannot reach API backend',
        database: 'neondb',
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
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

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncAllOrdersToPostgres();
      if (result.success) {
        setSyncMessage({
          type: 'success',
          text: `Successfully synced ${result.count} orders to database '${dbStatus?.database || 'PostgreSQL'}'!`,
        });
        fetchStatus();
        handleRunQuery();
      } else {
        setSyncMessage({
          type: 'error',
          text: `Sync failed: ${result.error || 'Check database credentials'}`,
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: `Sync failed: ${err.message || String(err)}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReconnectWith = async (targetConn: string) => {
    setIsReconnecting(true);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: targetConn }),
      });
      const data = await res.json();

      if (data.connected || data.success) {
        setSyncMessage({
          type: 'success',
          text: `Connected to database '${data.database}'! Now backfilling orders...`,
        });

        // Automatically backfill all existing orders
        const syncRes = await syncAllOrdersToPostgres();
        setSyncMessage({
          type: 'success',
          text: `Connected to database '${data.database}'! Successfully synced ${syncRes.count} orders into table 'orders'.`,
        });

        fetchStatus();
        handleRunQuery();
        setInputConnString('');
      } else {
        setSyncMessage({
          type: 'error',
          text: `Connection failed: ${data.error || 'Check Neon password & database name'}`,
        });
      }
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: `Reconnect error: ${err.message || String(err)}`,
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleReconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputConnString.trim()) return;

    let finalConn = inputConnString.trim();

    // If user only pasted a raw password (e.g., npg_xxx), format it into the full URL
    if (!finalConn.startsWith('postgres://') && !finalConn.startsWith('postgresql://')) {
      const targetDb = dbStatus?.database || 'neondb';
      finalConn = `postgresql://neondb_owner:${encodeURIComponent(
        finalConn
      )}@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/${targetDb}?sslmode=require`;
    }

    await handleReconnectWith(finalConn);
  };

  const presetQueries = [
    {
      title: 'Check Databases on Neon',
      sql: `SELECT datname FROM pg_database WHERE datistemplate = false;`,
    },
    {
      title: 'Recent Orders (orders)',
      sql: `SELECT id, order_number, order_type, table_number, captain_name, status, total, created_at \nFROM orders \nORDER BY created_at DESC \nLIMIT 15;`,
    },
    {
      title: 'Dishes & Modifiers (order_items)',
      sql: `SELECT oi.order_id, o.order_number, oi.name, oi.quantity, oi.spice_level, oi.butter_preference, oi.price \nFROM order_items oi \nJOIN orders o ON oi.order_id = o.id \nORDER BY o.created_at DESC \nLIMIT 20;`,
    },
    {
      title: 'Revenue by Channel',
      sql: `SELECT order_type, count(*) as order_count, sum(total) as gross_revenue, round(avg(total), 2) as avg_order \nFROM orders \nGROUP BY order_type \nORDER BY gross_revenue DESC;`,
    },
    {
      title: 'Orders by Status',
      sql: `SELECT status, count(*) as count, sum(total) as total_amount \nFROM orders \nGROUP BY status \nORDER BY count DESC;`,
    },
    {
      title: 'Count Rows in All Tables',
      sql: `SELECT 'orders' as table_name, count(*) as row_count FROM orders \nUNION ALL \nSELECT 'order_items', count(*) FROM order_items \nUNION ALL \nSELECT 'dining_tables', count(*) FROM dining_tables;`,
    },
    {
      title: 'Clear Old Orders in DB (>7 days)',
      sql: `DELETE FROM orders \nWHERE status IN ('completed', 'cancelled', 'served') \n  AND created_at < NOW() - INTERVAL '7 days' \nRETURNING id, order_number, status, created_at;`,
    },
    {
      title: 'Public Tables in Schema',
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`,
    },
  ];

  const handleCopyPsql = () => {
    const activeDb = dbStatus?.database || 'neondb';
    navigator.clipboard.writeText(`psql "postgresql://neondb_owner:YOUR_PASSWORD@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/${activeDb}?sslmode=require"`);
    setCopiedPsql(true);
    setTimeout(() => setCopiedPsql(false), 2000);
  };

  const totalAppOrders = orders.length + onlineOrders.filter((o) => o.approvalStatus === 'approved').length + bulkOrders.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Neon PostgreSQL Explorer: <span className="text-amber-400 font-mono">{dbStatus?.database || 'neondb'}</span>
              </h2>
              {dbStatus?.connected ? (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-2.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected ({dbStatus.database})</span>
                </span>
              ) : (
                <span className="text-xs bg-rose-500/10 text-rose-400 font-semibold px-2.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Auth Rejected / Reconnect Needed</span>
                </span>
              )}

              {dbStatus?.fallbackActive && (
                <span className="text-xs bg-cyan-500/10 text-cyan-400 font-semibold px-2.5 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Auto-Fallback Active ({dbStatus.database})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Live queries, schema tables, and two-way sync between your POS front-end, Render deployment, and Neon PostgreSQL database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchStatus}
            disabled={isLoadingStatus}
            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>

          <button
            onClick={handleSyncOrders}
            disabled={isSyncing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isSyncing ? 'Syncing...' : `Sync All ${totalAppOrders} Orders to Postgres`}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium shadow-sm animate-in fade-in ${
            syncMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
          }`}
        >
          {syncMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Catalog & Fallback Insight Card */}
      {dbStatus?.fallbackActive && (
        <div className="p-4 bg-cyan-950/40 border border-cyan-800/60 rounded-2xl flex items-start gap-3 text-xs text-cyan-200">
          <Layers className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-cyan-300 text-sm">
              Auto-Catalog Resilience Active: Connected to &ldquo;{dbStatus.database}&rdquo;
            </span>
            <p className="text-cyan-200/90 leading-relaxed">
              Target database &ldquo;<code className="text-white font-mono">{dbStatus.targetDatabase || 'Barbeque_ledger'}</code>&rdquo; does not exist on Neon yet. The server automatically connected to default database &ldquo;<code className="text-white font-mono">{dbStatus.database}</code>&rdquo;, initialized all tables (<code className="font-mono">orders</code>, <code className="font-mono">order_items</code>, <code className="font-mono">dining_tables</code>), and is actively saving orders here without interruption!
            </p>
            <p className="text-neutral-400 text-[11px] pt-1">
              Want a dedicated database strictly named <span className="text-amber-400 font-semibold">Barbeque_ledger</span>? Simply open <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">console.neon.tech</a> &rarr; Databases &rarr; New Database &rarr; enter &ldquo;Barbeque_ledger&rdquo;. The app will automatically connect to it!
            </p>
          </div>
        </div>
      )}

      {/* Connection Diagnostic / Reconnect Station */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Neon Credentials &amp; Database Target
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              If Neon rotated your password (error <code className="text-rose-400 font-mono">28P01</code>) or you want to switch databases, paste your fresh connection string or password below.
            </p>
          </div>

          <button
            onClick={() => setShowRenderGuide(!showRenderGuide)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Render Deployment Guide</span>
            {showRenderGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Diagnostic info if disconnected */}
        {dbStatus && !dbStatus.connected && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs space-y-2 text-rose-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-300">Why are new orders not showing in Neon?</span>
                <p className="text-rose-200/90 mt-0.5">
                  {dbStatus.error || 'Connection rejected by Neon PostgreSQL.'}
                </p>
              </div>
            </div>
            <div className="text-neutral-300 bg-black/40 p-2.5 rounded-lg border border-neutral-800 space-y-1">
              <div>💡 <strong>Troubleshooting Guide:</strong></div>
              <div>
                1. <strong>Password Expired:</strong> Neon automatically resets passwords when a branch or compute endpoint is changed (error <code className="text-amber-300 font-mono">28P01</code>). Paste your new password below.
              </div>
              <div>
                2. <strong>Database Catalog:</strong> Neon creates database <code className="text-amber-300 font-mono">neondb</code> by default. If <code className="text-amber-300 font-mono">Barbeque_ledger</code> does not exist, the app will auto-fallback to <code className="text-amber-300 font-mono">neondb</code>.
              </div>
              <div>
                3. <strong>Render Environment:</strong> Ensure <code className="text-amber-300 font-mono">DATABASE_URL</code> is set in Render Dashboard Environment variables.
              </div>
            </div>
          </div>
        )}

        {/* Reconnect Form */}
        <form onSubmit={handleReconnect} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inputConnString}
              onChange={(e) => setInputConnString(e.target.value)}
              placeholder="Paste fresh Neon connection string OR password (e.g. npg_...)"
              className="flex-1 bg-neutral-950 border border-neutral-750 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 placeholder-neutral-500 selection:bg-neutral-800"
            />
            <button
              type="submit"
              disabled={isReconnecting || !inputConnString.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl shrink-0 transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Testing & Connecting...' : 'Connect & Sync Orders'}</span>
            </button>
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 flex-wrap">
            <span>Tip: Go to</span>
            <a
              href="https://console.neon.tech"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              console.neon.tech <ExternalLink className="w-3 h-3" />
            </a>
            <span>&rarr; Select Project &rarr; Click &quot;Connection Details&quot; &rarr; Copy connection string.</span>
          </div>
        </form>

        {/* Render.com Guide Drawer */}
        {showRenderGuide && (
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 text-xs text-neutral-300">
            <span className="font-bold text-white text-sm block">
              How to configure your Render deployment:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-300">
              <li>
                Log into <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">dashboard.render.com</a>.
              </li>
              <li>
                Click your web service (e.g. <strong className="text-white">barbeque-application</strong>).
              </li>
              <li>
                Click <strong>&quot;Environment&quot;</strong> in the left sidebar menu.
              </li>
              <li>
                Add or edit the environment variable:
                <div className="mt-1 bg-black p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 border border-neutral-800 select-all space-y-1">
                  <div>Key: DATABASE_URL</div>
                  <div>Value: postgresql://neondb_owner:YOUR_PASSWORD@ep-lively-truth-az3ifhzf-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&amp;uselibpqcompat=true</div>
                </div>
              </li>
              <li>
                Click <strong>&quot;Save Changes&quot;</strong>. Render will restart your web service and immediately direct all new orders straight into Neon PostgreSQL!
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Active Database</span>
          <div className="text-base font-bold text-amber-400 mt-1 font-mono truncate">
            {dbStatus?.database || 'neondb'}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
            ap-southeast-1.aws.neon.tech
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Orders in PostgreSQL</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            {dbStatus?.stats?.totalOrders ?? '—'}
          </div>
          <div className="text-[11px] text-neutral-400">Stored in table &lsquo;orders&rsquo;</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-400">Orders in POS Memory</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono tabular-nums">
              {totalAppOrders}
            </div>
            <div className="text-[11px] text-neutral-400">Active state &amp; cache</div>
          </div>
          <button
            onClick={() => {
              const count = clearOldOrders(24);
              setSyncMessage({
                type: 'success',
                text: `Cleared ${count} old finished order(s) (>24h) from local memory.`,
              });
            }}
            className="mt-2 text-[10px] font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 px-2 py-1 rounded transition-colors self-start"
            title="Prune completed/cancelled orders older than 24 hours from local browser state"
          >
            Prune Old Finished (&gt;24h)
          </button>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">Settled Revenue in DB</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            ₹{dbStatus?.stats?.totalRevenue ? dbStatus.stats.totalRevenue.toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[11px] text-neutral-400">From &lsquo;orders.total&rsquo;</div>
        </div>
      </div>

      {/* Preset Queries Strip */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2">
        <span className="text-xs font-semibold text-neutral-300 block">
          Quick Order &amp; Analytics Queries (Click to load &amp; run):
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
              SQL Query Console (Neon &middot; {dbStatus?.database || 'neondb'})
            </span>
          </div>

          <button
            onClick={() => handleRunQuery()}
            disabled={isExecuting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
          >
            <PlayIcon isExecuting={isExecuting} />
            <span>{isExecuting ? 'Running...' : 'Run SQL'}</span>
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={4}
            className="w-full bg-neutral-950 border border-neutral-800 text-emerald-400 font-mono text-xs rounded-xl p-3.5 focus:outline-none focus:border-amber-500 selection:bg-neutral-800"
            placeholder="Type any SQL query, e.g. SELECT * FROM orders ORDER BY created_at DESC;"
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
              Query executed successfully. 0 rows returned in table &lsquo;orders&rsquo;. Use &lsquo;Sync Orders&rsquo; button above to insert data.
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
          <span>How to Query Directly via Terminal (psql / DBeaver / pgAdmin)</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-neutral-300 font-semibold block mb-1">
              Using psql CLI in your terminal:
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black text-emerald-400 p-2.5 rounded-xl border border-neutral-800 font-mono text-[11px] overflow-x-auto select-all">
                psql &quot;{defaultNeonConnection}&quot;
              </code>
              <button
                onClick={handleCopyPsql}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedPsql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPsql ? 'Copied!' : 'Copy psql'}</span>
              </button>
            </div>
          </div>

          <div>
            <span className="text-neutral-300 font-semibold block mb-1">
              Once connected, check your orders with:
            </span>
            <div className="bg-black text-amber-400 p-2.5 rounded-xl border border-neutral-800 font-mono text-[11px] select-all space-y-0.5">
              <div>SELECT order_number, order_type, table_number, total, status FROM orders ORDER BY created_at DESC;</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function PlayIcon({ isExecuting }: { isExecuting: boolean }) {
  if (isExecuting) {
    return <RotateCw className="w-3.5 h-3.5 animate-spin" />;
  }
  return (
    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
