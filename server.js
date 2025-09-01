const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme123';

// In-memory, ephemeral storage (purged on command or server restart)
let submissions = [];

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

// Health check
app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// Student submit endpoint
app.post('/api/submit', (req, res) => {
  const { name, motivation, energy, happiness, note } = req.body || {};
  // Basic validation
  const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 50);
  const cleanNote = (typeof note === 'string' ? note.trim() : '').slice(0, 500);
  const m = Number(motivation), e = Number(energy), h = Number(happiness);

  const valid01to10 = n => Number.isInteger(n) && n >= 1 && n <= 10;

  if (!cleanName) return res.status(400).json({ ok: false, error: 'Name is required.' });
  if (!valid01to10(m) || !valid01to10(e) || !valid01to10(h)) {
    return res.status(400).json({ ok: false, error: 'Sliders must be integers 1–10.' });
  }

  submissions.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: cleanName,
    motivation: m,
    energy: e,
    happiness: h,
    note: cleanNote,
    timestamp: new Date().toISOString()
  });

  res.json({ ok: true });
});

// Simple admin auth middleware (header-based)
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

// Compute aggregates
function computeAggregates(rows) {
  if (!rows.length) {
    return {
      count: 0,
      averages: { motivation: 0, energy: 0, happiness: 0 }
    };
  }
  const sum = rows.reduce((acc, r) => {
    acc.motivation += r.motivation;
    acc.energy += r.energy;
    acc.happiness += r.happiness;
    return acc;
  }, { motivation: 0, energy: 0, happiness: 0 });

  return {
    count: rows.length,
    averages: {
      motivation: +(sum.motivation / rows.length).toFixed(2),
      energy: +(sum.energy / rows.length).toFixed(2),
      happiness: +(sum.happiness / rows.length).toFixed(2)
    }
  };
}

// Admin: get stats; optional purge=1 to delete data AFTER returning snapshot
app.get('/api/stats', requireAdmin, (req, res) => {
  const snapshot = submissions.slice(); // copy
  const aggregates = computeAggregates(snapshot);

  const shouldPurge = String(req.query.purge || '0') === '1';

  res.json({ ok: true, aggregates, submissions: snapshot });

  // Purge after sending, so the admin can still render the chart from the snapshot
  if (shouldPurge && snapshot.length) {
    submissions = [];
  }
});

// Admin: purge explicitly
app.post('/api/purge', requireAdmin, (_req, res) => {
  submissions = [];
  res.json({ ok: true, purged: true });
});

// Admin: CSV export (optionally purge after)
app.get('/api/export', requireAdmin, (req, res) => {
  const rows = submissions.slice();
  const headers = ['timestamp','name','motivation','energy','happiness','note'];
  const csv = [
    headers.join(','),
    ...rows.map(r =>
      [
        r.timestamp,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        r.motivation,
        r.energy,
        r.happiness,
        `"${(r.note || '').replace(/"/g, '""')}"`
      ].join(',')
    )
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="checkin.csv"');
  res.send(csv);

  if (String(req.query.purge || '0') === '1' && rows.length) {
    submissions = [];
  }
});

// Routes for pages (served from /public)
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin token set. Change via ADMIN_TOKEN env var.`);
});
