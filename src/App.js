import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

const THEME_COLORS = {
  'KYC & Onboarding': '#e74c3c',
  'Withdrawals': '#e67e22',
  'Payments & Transactions': '#f39c12',
  'App Performance': '#3498db',
  'Statements & Reports': '#9b59b6',
};

function assignTheme(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('kyc') || t.includes('onboard') || t.includes('verification') || t.includes('document') || t.includes('selfie') || t.includes('video call')) return 'KYC & Onboarding';
  if (t.includes('withdraw') || t.includes('redemption') || t.includes('redeem') || t.includes('refund')) return 'Withdrawals';
  if (t.includes('payment') || t.includes('sip') || t.includes('deduct') || t.includes('upi') || t.includes('transaction')) return 'Payments & Transactions';
  if (t.includes('statement') || t.includes('report') || t.includes('tax') || t.includes('capital gain') || t.includes('download')) return 'Statements & Reports';
  return 'App Performance';
}

const DEMO_CSV = `review_id,date,rating,platform,title,review_text,theme
R001,2025-02-03,1,Play Store,KYC stuck for weeks,"I completed my KYC 3 weeks ago but my account is still not activated. Support keeps sending automated replies.",KYC & Onboarding
R002,2025-02-05,5,Play Store,Best investing app,"Groww is super easy to use. Bought my first mutual fund in under 5 minutes. Clean UI and no confusion at all.",Onboarding & UI
R003,2025-02-07,2,App Store,Withdrawal not received,"Initiated a withdrawal 5 days ago. Money is still not in my bank account. Customer support is unreachable.",Withdrawals
R004,2025-02-08,4,Play Store,Good app minor bugs,"Overall great experience. Sometimes the app crashes when switching between stocks and MF.",App Performance
R005,2025-02-10,1,Play Store,KYC rejected no reason,"My KYC was rejected without any explanation. Tried resubmitting twice. Still stuck.",KYC & Onboarding
R006,2025-02-11,5,App Store,Love the simplicity,"The dashboard is so clean. SIP setup took less than 2 minutes.",Onboarding & UI
R007,2025-02-13,2,Play Store,Payment failed but money deducted,"My SIP payment failed but the amount was deducted from my bank. No refund after 4 days.",Payments & Transactions
R008,2025-02-14,3,App Store,Average support experience,"App is good but when I had an issue the support team took 5 days to respond.",Customer Support
R009,2025-02-15,1,Play Store,Account frozen without notice,"My account was suddenly frozen. No email no notification.",Account & Access
R010,2025-02-17,5,Play Store,SIP automation is great,"Set up 4 SIPs in one go. The automation is seamless.",Payments & Transactions
R011,2025-02-18,2,App Store,Statements not downloading,"Capital gains statement is not downloading. PDF keeps failing.",Statements & Reports
R012,2025-02-20,4,Play Store,Smooth stock buying,"Buying and selling stocks is very fast. Execution is quick.",App Performance
R013,2025-02-21,1,Play Store,KYC video call never connects,"I have been trying to complete video KYC for 10 days. The call drops every time.",KYC & Onboarding
R014,2025-02-22,5,App Store,Best for beginners,"As a first time investor Groww made everything so simple.",Onboarding & UI
R015,2025-02-24,2,Play Store,Refund delayed 2 weeks,"Asked for redemption 2 weeks back. Money is not credited.",Withdrawals
R016,2025-02-25,3,App Store,App lags during market hours,"Between 9:30 and 10:30 the app becomes very slow.",App Performance
R017,2025-02-26,1,Play Store,Double charged for SIP,"I was charged twice for my monthly SIP. No option to raise a dispute.",Payments & Transactions
R018,2025-02-28,4,Play Store,Clean and intuitive,"Really like the portfolio view. XIRR display is very clear.",Onboarding & UI
R019,2025-03-01,2,App Store,Tax report wrong numbers,"The P&L statement shows different numbers than what my CA calculated.",Statements & Reports
R020,2025-03-03,5,Play Store,Fast KYC approval,"KYC was done in 15 minutes via video call. Account activated same day.",KYC & Onboarding`;

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [weeklyNote, setWeeklyNote] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('upload');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCSV = (csvText) => {
    Papa.parse(csvText, {
      header: true,
      complete: (result) => {
        const parsed = result.data.filter(r => r.review_text || r.text);
        const withThemes = parsed.map(r => ({
          ...r,
          review_text: r.review_text || r.text || '',
          rating: r.rating || '3',
          platform: r.platform || 'Play Store',
          theme: r.theme || assignTheme(r.review_text || r.text || '')
        }));
        setReviews(withThemes);
        computeAnalysis(withThemes);
        setStep('analysis');
      }
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleCSV(ev.target.result);
    reader.readAsText(file);
  };

  const computeAnalysis = (data) => {
    const total = data.length;
    const avgRating = (data.reduce((s, r) => s + parseFloat(r.rating || 3), 0) / total).toFixed(1);
    const negative = data.filter(r => parseFloat(r.rating) <= 2).length;
    const positive = data.filter(r => parseFloat(r.rating) >= 4).length;

    const themeCounts = {};
    data.forEach(r => {
      const t = r.theme || 'App Performance';
      if (!themeCounts[t]) themeCounts[t] = { count: 0, reviews: [] };
      themeCounts[t].count++;
      themeCounts[t].reviews.push(r);
    });

    const sorted = Object.entries(themeCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    const negR = data.filter(r => parseFloat(r.rating) <= 2 && (r.review_text || '').length > 30);
    const posR = data.filter(r => parseFloat(r.rating) >= 4 && (r.review_text || '').length > 30);
    const midR = data.filter(r => parseFloat(r.rating) == 3 && (r.review_text || '').length > 30);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const quotes = [pick(negR), pick(posR), pick(midR.length ? midR : negR)].filter(Boolean);

    setAnalysis({ total, avgRating, negative, positive, sorted, quotes });
  };

  const generateWithGroq = async () => {
    if (!analysis) return;
    setLoading(true);
    const top3 = analysis.sorted.slice(0, 3);
    const quotesText = analysis.quotes.map((q, i) =>
      `Quote ${i+1}: "${(q.review_text || '').slice(0, 150)}" (${q.rating}★, ${q.platform})`
    ).join('\n');

    const prompt = `You are a product analyst for Groww, an Indian investment app. Generate a weekly pulse note based on this review data.

Total reviews: ${analysis.total} | Avg rating: ${analysis.avgRating}★ | Negative (≤2★): ${analysis.negative} | Positive (≥4★): ${analysis.positive}

Top 3 themes:
1. ${top3[0]?.[0]} — ${top3[0]?.[1]?.count} mentions
2. ${top3[1]?.[0]} — ${top3[1]?.[1]?.count} mentions
3. ${top3[2]?.[0]} — ${top3[2]?.[1]?.count} mentions

User quotes:
${quotesText}

Generate a weekly pulse note in EXACTLY this format, under 250 words, no PII:

## Groww App — Weekly Review Pulse
**Period:** Feb–May 2025 | **Reviews:** ${analysis.total} | **Avg Rating:** ${analysis.avgRating}★

### Top 3 Themes
1. [theme] — [X mentions] — [1 line insight]
2. [theme] — [X mentions] — [1 line insight]
3. [theme] — [X mentions] — [1 line insight]

### What Users Are Saying
> "[quote 1]" — [platform] [rating]★
> "[quote 2]" — [platform] [rating]★
> "[quote 3]" — [platform] [rating]★

### 3 Action Ideas
1. [specific actionable recommendation]
2. [specific actionable recommendation]
3. [specific actionable recommendation]

Tone: professional, product-team, scannable.`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 800
        })
      });
      const data = await res.json();
      const note = data.choices[0].message.content;
      setWeeklyNote(note);
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      setEmailDraft(`From: insights-bot@groww.in\nTo: you@groww.in\nSubject: Groww App — Weekly Review Pulse · ${today}\n\n${note}\n\n---\nNo PII included. Anonymised public data.\nGenerated by Groww Review Intelligence · ${today}`);
      setStep('note');
    } catch (err) {
      alert('Groq API error: ' + err.message);
    }
    setLoading(false);
  };

  const downloadMD = () => {
    const blob = new Blob([weeklyNote], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'groww_weekly_pulse.md';
    a.click();
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(emailDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = ['Import', 'Analyse', 'Weekly Note', 'Email'];
  const stepKeys = ['upload', 'analysis', 'note', 'email'];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#f5f7fa' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#00d09c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>G</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>Groww Review Intelligence</div>
          <div style={{ fontSize: 12, color: '#888' }}>App Review Insights Analyser · Weekly Pulse</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {steps.map((s, i) => {
            const active = step === stepKeys[i];
            const done = stepKeys.indexOf(step) > i;
            return (
              <div key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: active ? '#00d09c' : done ? '#e8f8f0' : '#f0f0f0', color: active ? 'white' : done ? '#00a67e' : '#aaa', fontWeight: active ? 600 : 400 }}>{s}</div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '40px auto', padding: '0 24px' }}>

        {step === 'upload' && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 8 }}>Import Reviews</h2>
            <p style={{ color: '#888', fontSize: 15, marginBottom: 32 }}>Upload Groww app reviews CSV or load the sample dataset</p>

            <label htmlFor="csv-upload" style={{ display: 'block', border: '2px dashed #ddd', borderRadius: 16, padding: '56px 24px', textAlign: 'center', cursor: 'pointer', background: 'white', transition: 'all 0.2s', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: 16, marginBottom: 6 }}>Drop CSV here or click to upload</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>Columns: rating, platform, review_text, date, theme (optional)</div>
              <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              <span style={{ fontSize: 13, color: '#bbb' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
            </div>

            <button onClick={() => handleCSV(DEMO_CSV)}
              style={{ width: '100%', padding: 16, borderRadius: 12, border: '2px solid #00d09c', background: 'white', color: '#00d09c', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              🗂 Load Sample Groww Reviews (20 reviews · Feb–Mar 2025)
            </button>
          </div>
        )}

        {step === 'analysis' && analysis && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 28 }}>Review Analysis</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Total Reviews', value: analysis.total, color: '#111' },
                { label: 'Avg Rating', value: `${analysis.avgRating} ★`, color: '#f39c12' },
                { label: 'Negative (≤2★)', value: analysis.negative, color: '#e74c3c' },
                { label: 'Positive (≥4★)', value: analysis.positive, color: '#00d09c' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'white', borderRadius: 14, padding: '18px 16px', border: '1px solid #eee' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #eee', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>Top Themes</div>
              {analysis.sorted.map(([name, info]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ minWidth: 210, fontSize: 14, color: '#333', fontWeight: 500 }}>{name}</div>
                  <div style={{ flex: 1, height: 10, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((info.count / analysis.sorted[0][1].count) * 100)}%`, height: '100%', background: THEME_COLORS[name] || '#888', borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#555', minWidth: 28, textAlign: 'right' }}>{info.count}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #eee', marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>User Quotes</div>
              {analysis.quotes.map((q, i) => {
                const r = parseFloat(q.rating);
                const s = r >= 4 ? { bg: '#e8f8f0', color: '#00a67e', label: 'Positive' } : r <= 2 ? { bg: '#fdecea', color: '#c0392b', label: 'Negative' } : { bg: '#fff8e6', color: '#e67e22', label: 'Mixed' };
                return (
                  <div key={i} style={{ border: '1px solid #eee', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, color: '#333', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 10 }}>"{(q.review_text || '').slice(0, 220)}"</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, fontWeight: 700 }}>{s.label}</span>
                      <span style={{ fontSize: 12, color: '#bbb' }}>{q.platform} · {q.rating}★</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={generateWithGroq} disabled={loading}
              style={{ width: '100%', padding: 18, borderRadius: 14, background: loading ? '#aaa' : '#00d09c', color: 'white', border: 'none', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ Generating with Groq AI…' : '✨ Generate Weekly Note with AI →'}
            </button>
          </div>
        )}

        {step === 'note' && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 28 }}>Weekly Pulse Note</h2>
            <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #eee', marginBottom: 20 }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, color: '#333', lineHeight: 1.9, margin: 0 }}>{weeklyNote}</pre>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('email')}
                style={{ flex: 1, padding: 16, borderRadius: 12, background: '#00d09c', color: 'white', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                ✉️ Draft Email →
              </button>
              <button onClick={downloadMD}
                style={{ padding: '16px 22px', borderRadius: 12, background: 'white', border: '1px solid #ddd', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#555' }}>
                ⬇️ Download MD
              </button>
            </div>
          </div>
        )}

        {step === 'email' && (
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 28 }}>Email Draft</h2>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #eee', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#f8f9fa', padding: '16px 22px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}><b>From:</b> insights-bot@groww.in</div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}><b>To:</b> you@groww.in</div>
                <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}><b>Subject:</b> Groww App — Weekly Review Pulse · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <pre style={{ padding: '22px', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: '#333', lineHeight: 1.9, margin: 0, maxHeight: 420, overflowY: 'auto' }}>{emailDraft}</pre>
              <div style={{ padding: '16px 22px', borderTop: '1px solid #eee', display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={copyEmail}
                  style={{ padding: '10px 20px', borderRadius: 10, background: copied ? '#e8f8f0' : 'white', border: '1px solid #ddd', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: copied ? '#00a67e' : '#555' }}>
                  {copied ? '✅ Copied!' : '📋 Copy Draft'}
                </button>
                {emailSent && <span style={{ fontSize: 13, color: '#00a67e', fontWeight: 600 }}>✅ Draft saved to Gmail!</span>}
              </div>
            </div>
            <button onClick={() => setStep('analysis')}
              style={{ padding: '10px 18px', borderRadius: 10, background: 'white', border: '1px solid #ddd', fontSize: 13, color: '#888', cursor: 'pointer' }}>
              ← Back to Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
