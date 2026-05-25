import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Copy,
  Link2,
  LoaderCircle,
  Rocket,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { buildShortLink, createCustomUrl, deleteUrl, getClickCount, getUrlStatus, shortenUrl } from './api/urlService';

const defaultForm = {
  longUrl: '',
  customAlias: '',
};

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  return hasProtocol ? trimmed : `https://${trimmed}`;
}

function isValidAlias(value) {
  return /^[A-Za-z0-9_-]+$/.test(value.trim());
}

export function App() {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recentLinks, setRecentLinks] = useState([]);
  const [activeResult, setActiveResult] = useState(null);
  const [statusLookup, setStatusLookup] = useState(null);
  const currentStatus = statusLookup?.status;

  useEffect(() => {
    const saved = window.localStorage.getItem('pulse-link-history');
    if (saved) {
      try {
        setRecentLinks(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem('pulse-link-history');
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('pulse-link-history', JSON.stringify(recentLinks));
  }, [recentLinks]);

  const metrics = useMemo(() => {
    const totalClicks = recentLinks.reduce((total, item) => total + item.clickCount, 0);
    return [
      { label: 'Links created', value: String(recentLinks.length || 0) },
      { label: 'Tracked clicks', value: String(totalClicks) },
      { label: 'Status checks', value: String(statusLookup ? 1 + recentLinks.length : recentLinks.length) },
    ];
  }, [recentLinks, statusLookup]);

  const persistLink = (record) => {
    setRecentLinks((current) => [record, ...current.filter((item) => item.shortUrl !== record.shortUrl)].slice(0, 6));
    setActiveResult(record);
  };

  const refreshRecord = async (shortUrl) => {
    const [status, clickCount] = await Promise.all([
      getUrlStatus(shortUrl),
      getClickCount(shortUrl).catch(() => 0),
    ]);

    return {
      shortUrl: status.shortUrl,
      longUrl: status.longUrl,
      createdAt: status.createdAt,
      clickCount: typeof clickCount === 'number' ? clickCount : status.clickCount ?? 0,
      custom: Boolean(status.shortUrl && status.shortUrl === shortUrl),
    };
  };

  const handleShorten = async (event) => {
    event.preventDefault();

    const longUrl = normalizeUrl(form.longUrl);
    if (!longUrl) {
      toast.error('Enter a destination URL.');
      return;
    }

    if (form.customAlias.trim() && !isValidAlias(form.customAlias)) {
      toast.error('Custom aliases can use only letters, numbers, hyphens, and underscores.');
      return;
    }

    setSubmitting(true);
    try {
      const shortUrl = form.customAlias.trim()
        ? await createCustomUrl(longUrl, form.customAlias.trim())
        : await shortenUrl(longUrl);

      const record = await refreshRecord(shortUrl);
      persistLink(record);
      setForm(defaultForm);
      setStatusLookup({
        shortUrl,
        status: { shortUrl, longUrl, createdAt: record.createdAt, clickCount: record.clickCount },
        clickCount: record.clickCount,
      });
      toast.success('Short link is ready.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    const shortUrl = lookupCode.trim();

    if (!shortUrl) {
      toast.error('Enter a short code to inspect.');
      return;
    }

    setLookupLoading(true);
    try {
      const record = await refreshRecord(shortUrl);
      setStatusLookup({
        shortUrl,
        status: {
          shortUrl: record.shortUrl,
          longUrl: record.longUrl,
          createdAt: record.createdAt,
          clickCount: record.clickCount,
        },
        clickCount: record.clickCount,
      });
      persistLink(record);
      toast.success('Short link details loaded.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCopy = async (shortUrl) => {
    try {
      await navigator.clipboard.writeText(buildShortLink(shortUrl));
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Unable to copy the link right now.');
    }
  };

  const handleDelete = async (shortUrl) => {
    try {
      await deleteUrl(shortUrl);
      setRecentLinks((current) => current.filter((item) => item.shortUrl !== shortUrl));
      if (activeResult?.shortUrl === shortUrl) {
        setActiveResult(null);
      }
      if (statusLookup?.shortUrl === shortUrl) {
        setStatusLookup(null);
      }
      toast.success('Link deleted.');
    } catch {
      toast.error('Unable to delete the link.');
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={14} />
            URL shortener
          </span>
          <h1>Turn long URLs into polished, trackable links.</h1>
          <p>
            PulseLink connects directly to your Spring backend for quick shortening, custom aliases,
            status lookup, click tracking, and safe error feedback through toast notifications.
          </p>

          <div className="metric-grid">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <aside className="hero-panel">
          <div className="panel-header">
            <Wand2 size={18} />
            <span>Features</span>
          </div>

          <div className="feature-list">
            <div className="feature">
              <div className="feature-icon"><Rocket size={22} /></div>
              <div>
                <h4 className="feature-title">Instant Shortening</h4>
                <p>Generate polished short links in one click, with optional custom aliases.</p>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon"><BarChart3 size={22} /></div>
              <div>
                <h4 className="feature-title">Built-in Analytics</h4>
                <p>Quickly inspect click counts and status without leaving the app.</p>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon"><Copy size={22} /></div>
              <div>
                <h4 className="feature-title">Share Effortlessly</h4>
                <p>Copy links, open them in a new tab, or delete with a single tap.</p>
              </div>
            </div>
          </div>

          <div className="hero-panel-footer">
            <div>
              <span className="section-kicker">Quick action</span>
              <p>Start creating links immediately.</p>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => document.querySelector('.form-card input')?.focus()}
            >
              Get started
            </button>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <div className="card form-card">
          <div className="section-title">
            <div>
              <span className="section-kicker">Create</span>
              <h2>Shorten a link</h2>
            </div>
            <Rocket size={22} />
          </div>

          <form className="stack" onSubmit={handleShorten}>
            <label>
              Destination URL
              <input
                placeholder="https://example.com/very/long/article"
                value={form.longUrl}
                onChange={(event) => setForm((current) => ({ ...current, longUrl: event.target.value }))}
              />
            </label>

            <label>
              Custom alias, optional
              <input
                placeholder="summer-campaign"
                value={form.customAlias}
                onChange={(event) => setForm((current) => ({ ...current, customAlias: event.target.value }))}
              />
            </label>

            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
              {submitting ? 'Generating' : 'Generate short link'}
            </button>
          </form>

          {activeResult ? (
            <div className="result-card">
              <div className="result-top">
                <div>
                  <span className="section-kicker">Latest</span>
                  <h3>{activeResult.shortUrl}</h3>
                </div>
                <span className="chip">{activeResult.clickCount} clicks</span>
              </div>
              <p>{activeResult.longUrl}</p>
              <div className="result-actions">
                <button className="button button-ghost" type="button" onClick={() => handleCopy(activeResult.shortUrl)}>
                  <Copy size={16} />
                  Copy
                </button>
                <a className="button button-ghost" href={buildShortLink(activeResult.shortUrl)} target="_blank" rel="noreferrer">
                  <Link2 size={16} />
                  Open
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card lookup-card">
          <div className="section-title">
            <div>
              <span className="section-kicker">Inspect</span>
              <h2>Fetch status and clicks</h2>
            </div>
            <BarChart3 size={22} />
          </div>

          <form className="stack" onSubmit={handleLookup}>
            <label>
              Short code
              <input
                placeholder="abc123"
                value={lookupCode}
                onChange={(event) => setLookupCode(event.target.value)}
              />
            </label>

            <button className="button button-secondary" type="submit" disabled={lookupLoading}>
              {lookupLoading ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
              {lookupLoading ? 'Loading' : 'Lookup'}
            </button>
          </form>

          {currentStatus ? (
            <div className="status-card">
              <div className="status-row">
                <span>Short URL</span>
                <strong>{currentStatus.shortUrl}</strong>
              </div>
              <div className="status-row">
                <span>Original URL</span>
                <strong>{currentStatus.longUrl}</strong>
              </div>
              <div className="status-row">
                <span>Clicks</span>
                <strong>{statusLookup.clickCount ?? currentStatus.clickCount ?? 0}</strong>
              </div>
              <div className="result-actions">
                <button
                  className="button button-ghost"
                  type="button"
                  onClick={() => handleCopy(currentStatus.shortUrl)}
                >
                  <Copy size={16} />
                  Copy link
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => handleDelete(currentStatus.shortUrl)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card recent-card">
        <div className="section-title">
          <div>
            <span className="section-kicker">Recent</span>
            <h2>Saved links</h2>
          </div>
          <span className="chip">{recentLinks.length} items</span>
        </div>

        <div className="recent-list">
          {recentLinks.length === 0 ? (
            <p className="empty-state">Your latest shortened links will appear here.</p>
          ) : (
            recentLinks.map((item) => (
              <article className="recent-item" key={item.shortUrl}>
                <div>
                  <strong>{item.shortUrl}</strong>
                  <p>{item.longUrl}</p>
                </div>
                <div className="result-actions">
                  <button className="button button-ghost" type="button" onClick={() => handleCopy(item.shortUrl)}>
                    <Copy size={16} />
                    Copy
                  </button>
                  <button className="button button-danger" type="button" onClick={() => handleDelete(item.shortUrl)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}