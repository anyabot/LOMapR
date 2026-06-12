import { useState, useCallback } from 'react';
import Head from 'next/head';

type Region = 'global' | 'kr';
type Status = { total: number; stale: number; fresh: number; deduped: number } | null;

const REGIONS: Region[] = ['global', 'kr'];

export default function AdminPage() {
  const [region, setRegion] = useState<Region>('global');
  const [force, setForce] = useState(false);
  const [status, setStatus] = useState<Record<Region, Status>>({ global: null, kr: null });
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const checkStatus = useCallback(async (r: Region) => {
    const res = await fetch(`/api/admin/blob-status?region=${r}`);
    const data = await res.json();
    setStatus(prev => ({ ...prev, [r]: data }));
  }, []);

  const checkAll = useCallback(() => {
    REGIONS.forEach(r => checkStatus(r));
  }, [checkStatus]);

  const push = useCallback(async () => {
    setBusy(true);
    setLog([`Pushing ${region}…`]);
    try {
      const res = await fetch('/api/admin/push-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, force }),
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        setLog(prev => [...prev, ...lines]);
      }
      if (buf) setLog(prev => [...prev, buf]);
      checkStatus(region);
    } catch (e: any) {
      setLog(prev => [...prev, `Error: ${e.message}`]);
    }
    setBusy(false);
  }, [region, force, checkStatus]);

  const s = status[region];

  return (
    <>
      <Head><title>LOMap Admin — Blob</title></Head>
      <div style={styles.page}>
        <h1 style={styles.h1}>LOMap Admin</h1>
        <p style={styles.sub}>Push per-enemy split files to Cloudflare R2</p>

        <div style={styles.row}>
          <label style={styles.label}>Region&nbsp;
            <select value={region} onChange={e => setRegion(e.target.value as Region)} style={styles.select}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button onClick={checkAll} style={styles.ghost}>Refresh status</button>
        </div>

        <div style={styles.card}>
          {REGIONS.map(r => {
            const st = status[r];
            return (
              <div key={r} style={{ ...styles.statRow, borderColor: r === region ? '#ecc94b' : '#2c313c' }}>
                <span style={styles.regionLabel}>{r}</span>
                {st == null
                  ? <span style={styles.dim}>—</span>
                  : <>
                      <span style={{ color: '#e0707a' }}>{st.stale} stale</span>
                      <span style={styles.dim}>/</span>
                      <span style={{ color: '#9aa0aa' }}>{st.fresh} fresh</span>
                      {st.deduped > 0 && <><span style={styles.dim}>/</span><span style={{ color: '#7aa7ff' }}>{st.deduped} same as global</span></>}
                      <span style={styles.dim}>/ {st.total} total</span>
                    </>}
              </div>
            );
          })}
        </div>

        <div style={styles.row}>
          <label style={{ ...styles.label, gap: 8 }}>
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
            force all
          </label>
          <button onClick={push} disabled={busy} style={styles.btn}>
            {busy ? 'Pushing…' : `Push ${region}`}
          </button>
        </div>

        <pre style={styles.log}>{log.length ? log.join('\n') : 'Ready.'}</pre>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'system-ui, sans-serif', background: '#0f1115', color: '#e8eaed', minHeight: '100vh', maxWidth: 640, margin: '36px auto', padding: '0 20px' },
  h1: { fontSize: 20, margin: '0 0 4px' },
  sub: { color: '#9aa0aa', fontSize: 13, marginBottom: 24 },
  card: { background: '#181b22', border: '1px solid #2c313c', borderRadius: 12, padding: '12px 18px', marginBottom: 16 },
  statRow: { display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderLeft: '3px solid', paddingLeft: 10, marginBottom: 4 },
  regionLabel: { fontFamily: 'monospace', color: '#ecc94b', minWidth: 52 },
  dim: { color: '#555' },
  row: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 },
  label: { display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 },
  select: { background: '#0f1115', color: '#e8eaed', border: '1px solid #2c313c', borderRadius: 8, padding: '6px 10px', fontSize: 14 },
  btn: { background: '#ecc94b', color: '#1a1a1a', border: 0, borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  ghost: { background: '#2c313c', color: '#e8eaed', border: 0, borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  log: { whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12.5, background: '#0b0d11', border: '1px solid #2c313c', borderRadius: 10, padding: 14, minHeight: 40, maxHeight: 320, overflow: 'auto' },
};
