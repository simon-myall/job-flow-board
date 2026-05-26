import { useState } from 'react';
import { useStore } from '../store';
import { Save, Eye, EyeOff, Check, ExternalLink, Lightbulb } from 'lucide-react';

const HIDE_DAYS_OPTIONS = [
  { value: 0, label: 'Never hide' },
  { value: 3, label: 'After 3 days' },
  { value: 5, label: 'After 5 days' },
  { value: 7, label: 'After 7 days' },
  { value: 14, label: 'After 14 days' },
  { value: 30, label: 'After 30 days' },
];

export function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [apiKey, setApiKey] = useState(settings.claudeApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateSettings({ claudeApiKey: apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleHideDaysChange(days: number) {
    updateSettings({ rejectedHideDays: days });
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your Claude API key and preferences.</p>
      </div>

      {/* Claude API key */}
      <div className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Claude AI Integration</h2>

        <div className="form-group mb-4">
          <label className="label">Anthropic API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                className="input pr-10"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={apiKey === settings.claudeApiKey}
              className="btn-primary shrink-0"
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Your key is stored locally in your browser only and never sent to any server other than Anthropic.
          </p>
        </div>

        {!settings.claudeApiKey && (
          <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <Lightbulb size={16} className="shrink-0 mt-0.5" />
            <div>
              No API key configured. You need a Claude API key to use AI generation features.{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-amber-800 hover:text-amber-900 inline-flex items-center gap-0.5"
              >
                Get one at console.anthropic.com <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {settings.claudeApiKey && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            ✓ API key configured. AI features are enabled.
          </div>
        )}
      </div>

      {/* Rejected jobs auto-hide */}
      <div className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Rejected Jobs</h2>
        <p className="text-sm text-gray-500 mb-4">
          Automatically hide rejected applications from the board after a set number of days.
        </p>
        <div className="form-group">
          <label className="label">Auto-hide rejected applications</label>
          <select
            className="input max-w-xs"
            value={settings.rejectedHideDays}
            onChange={(e) => handleHideDaysChange(Number(e.target.value))}
          >
            {HIDE_DAYS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">
            {settings.rejectedHideDays === 0
              ? 'Rejected applications will always remain visible on the board.'
              : `Rejected applications will be hidden from the board ${settings.rejectedHideDays} days after being moved to Rejected.`}
          </p>
        </div>
      </div>

      {/* Integration info */}
      <div className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Integration Opportunities</h2>
        <div className="space-y-4 text-sm text-gray-700">

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-1.5">LinkedIn Integration</h3>
            <p className="text-blue-800 text-xs mb-2">
              LinkedIn's API does not support job-ad scraping for end-users. The recommended approach is:
            </p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
              <li><strong>Browser bookmark:</strong> Visit a LinkedIn job listing, copy the URL and paste into the Job URL field</li>
              <li><strong>Job description:</strong> Copy & paste the job description text into the "Job Description" tab</li>
              <li><strong>Auto-extract:</strong> Click "Auto-extract details" to have Claude parse the title, company, location, and salary</li>
              <li><strong>Future:</strong> A browser extension could automate this flow — adding a button to LinkedIn job pages</li>
            </ul>
          </div>

          <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-1.5">Seek Integration</h3>
            <p className="text-orange-800 text-xs mb-2">
              Seek's API is employer-facing only. Recommended workflow:
            </p>
            <ul className="list-disc list-inside text-xs text-orange-700 space-y-1">
              <li>Copy the Seek job URL into the Job URL field</li>
              <li>Paste the job description into the "Job Description" tab</li>
              <li>Use "Auto-extract" to parse details with Claude</li>
              <li><strong>Seek API access:</strong> Partner-level API access exists but requires Seek approval</li>
            </ul>
          </div>

          <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-1.5">Claude AI Features (Active)</h3>
            <ul className="list-disc list-inside text-xs text-purple-700 space-y-1">
              <li><strong>Cover Letter Generation:</strong> Tailored cover letter based on your base CV + job description</li>
              <li><strong>CV Tailoring:</strong> Reordered and reframed CV sections emphasising relevant experience</li>
              <li><strong>Detail Extraction:</strong> Auto-parse title, company, location, salary from job description text</li>
              <li>Uses <strong>Claude Opus 4.7</strong> with adaptive thinking for best quality outputs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Data & Privacy</h2>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
          <li>All data is stored securely in Supabase, linked to your account</li>
          <li>Your CV and applications are never sent to any third party</li>
          <li>Only job descriptions and your base CV are sent to Anthropic's API when you generate content</li>
          <li>Your Claude API key is stored in your Supabase profile and only used server-side from the browser</li>
        </ul>
      </div>
    </div>
  );
}
