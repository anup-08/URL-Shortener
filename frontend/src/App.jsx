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
import { buildShortLink, createCustomUrl, deleteUrl, getUrlStatus, shortenUrl } from './api/urlService';

const defaultForm = {
  longUrl: '',
  customAlias: '',
};

const storageKey = 'pulse-link-session';
const maxRecentLinks = 6;
const pollIntervalMs = 8000;

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

function isSameRecord(current, next) {
  return (
    current.shortUrl === next.shortUrl &&
    current.longUrl === next.longUrl &&
    current.createdAt === next.createdAt &&
    current.clickCount === next.clickCount
  );
}

function readSessionState() {
  if (typeof window === 'undefined') {
    return {
      form: defaultForm,
      recentLinks: [],
      activeResult: null,
      statusLookup: null,
      lookupCode: '',
    };
  }

  const saved = window.sessionStorage.getItem(storageKey);
  if (!saved) {
    return {
      form: defaultForm,
      recentLinks: [],
      activeResult: null,
      statusLookup: null,
      lookupCode: '',
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      form: parsed.form && typeof parsed.form === 'object' ? {
        longUrl: typeof parsed.form.longUrl === 'string' ? parsed.form.longUrl : '',
        customAlias: typeof parsed.form.customAlias === 'string' ? parsed.form.customAlias : '',
      } : defaultForm,
      recentLinks: Array.isArray(parsed.recentLinks) ? parsed.recentLinks : [],
      activeResult: parsed.activeResult ?? null,
      statusLookup: parsed.statusLookup ?? null,
      lookupCode: typeof parsed.lookupCode === 'string' ? parsed.lookupCode : '',
    };
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return {
      form: defaultForm,
      recentLinks: [],
      activeResult: null,
      statusLookup: null,
      lookupCode: '',
    };
  }
}

export function App() {
  const [persistedState] = useState(() => readSessionState());
  const [form, setForm] = useState(persistedState.form);
  const [submitting, setSubmitting] = useState(false);
  const [lookupCode, setLookupCode] = useState(persistedState.lookupCode);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recentLinks, setRecentLinks] = useState(persistedState.recentLinks);
  const [activeResult, setActiveResult] = useState(persistedState.activeResult);
  const [statusLookup, setStatusLookup] = useState(persistedState.statusLookup);
  const currentStatus = statusLookup?.status;

  useEffect(() => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        form,
        recentLinks,
        activeResult,
        statusLookup,
        lookupCode,
      }),
    );
  }, [activeResult, lookupCode, recentLinks, statusLookup]);

  useEffect(() => {
    if (recentLinks.length === 0 && !statusLookup?.shortUrl) {
      return undefined;
    }

    let cancelled = false;

    const syncTrackedLinks = async () => {
      const trackedShortUrls = [...new Set([
        ...recentLinks.map((item) => item.shortUrl),
        statusLookup?.shortUrl,
      ].filter(Boolean))];

      if (trackedShortUrls.length === 0) {
        return;
      }

      const results = await Promise.all(
        trackedShortUrls.map(async (shortUrl) => {
          try {
            const record = await getUrlStatus(shortUrl, { skipGlobalToast: true });
            return [shortUrl, record];
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const updates = new Map(results.filter(Boolean));
      if (updates.size === 0) {
        return;
      }

      setRecentLinks((current) => {
        let hasChanges = false;
        const nextLinks = current.map((item) => {
          const refreshed = updates.get(item.shortUrl);
          if (!refreshed) {
            return item;
          }

          const nextRecord = { ...item, ...refreshed };
          if (isSameRecord(item, nextRecord)) {
            return item;
          }

          hasChanges = true;
          return nextRecord;
        });

        return hasChanges ? nextLinks : current;
      });

      setActiveResult((current) => {
        if (!current) {
          return current;
        }

        const refreshed = updates.get(current.shortUrl);
        if (!refreshed) {
          return current;
        }

        const nextRecord = { ...current, ...refreshed };
        return isSameRecord(current, nextRecord) ? current : nextRecord;
      });

      setStatusLookup((current) => {
        if (!current) {
          return current;
        }

        const refreshed = updates.get(current.shortUrl);
        if (!refreshed) {
          return current;
        }

        if (current.status && isSameRecord(current.status, refreshed) && current.clickCount === refreshed.clickCount) {
          return current;
        }

        return {
          ...current,
          status: refreshed,
          clickCount: refreshed.clickCount,
        };
      });
    };

    syncTrackedLinks();
    const interval = window.setInterval(syncTrackedLinks, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [recentLinks, statusLookup?.shortUrl]);

  const metrics = useMemo(() => {
    const totalClicks = recentLinks.reduce((total, item) => total + item.clickCount, 0);
    return [
      { label: 'Links created', value: String(recentLinks.length || 0) },
      { label: 'Tracked clicks', value: String(totalClicks) },
      { label: 'Status checks', value: String(statusLookup ? 1 + recentLinks.length : recentLinks.length) },
    ];
  }, [recentLinks, statusLookup]);

  const persistLink = (record) => {
    setRecentLinks((current) => [record, ...current.filter((item) => item.shortUrl !== record.shortUrl)].slice(0, maxRecentLinks));
    setActiveResult(record);
  };

  const refreshRecord = async (shortUrl) => {
    const status = await getUrlStatus(shortUrl);

    return {
      shortUrl: status.shortUrl,
      longUrl: status.longUrl,
      createdAt: status.createdAt,
      clickCount: status.clickCount ?? 0,
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
    } catch (error) {
      console.error('Unable to delete the link.', error);
    }
  };

  const handleOpen = (record) => {
    const targetUrl = buildShortLink(record.shortUrl);

    const newWindow = window.open(targetUrl, '_blank');

    if (!newWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
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
              <p className="url-text" title={activeResult.longUrl}>{activeResult.longUrl}</p>
              <div className="result-actions">
                <button className="button button-ghost" type="button" onClick={() => handleCopy(activeResult.shortUrl)}>
                  <Copy size={16} />
                  Copy
                </button>
                <button className="button button-ghost" type="button" onClick={() => handleOpen(activeResult)}>
                  <Link2 size={16} />
                  Open
                </button>
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
                <strong className="url-text" title={currentStatus.longUrl}>{currentStatus.longUrl}</strong>
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
                <div className="url-stack">
                  <strong className="url-text" title={item.shortUrl}>{item.shortUrl}</strong>
                  <p className="url-text" title={item.longUrl}>{item.longUrl}</p>
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