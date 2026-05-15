import { useState, useRef } from 'react';
import { useStore } from '../store';
import {
  Save, Info, Copy, Check, Upload, Download,
  FileText, Loader2, AlertCircle, X,
} from 'lucide-react';

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  // Plain text / Markdown
  if (
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    name.endsWith('.txt') ||
    name.endsWith('.md')
  ) {
    return file.text();
  }

  // DOCX
  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  // PDF
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lineText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      pageTexts.push(lineText);
    }
    return pageTexts.join('\n\n');
  }

  throw new Error(`Unsupported file type: ${file.type || name.split('.').pop()}`);
}

export function BaseCVPage() {
  const { baseCV, setBaseCV } = useStore();
  const [draft, setDraft] = useState(baseCV);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setBaseCV(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopy() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([draft], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = uploadedFileName
      ? uploadedFileName.replace(/\.[^.]+$/, '.md')
      : 'base-cv.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const text = await extractTextFromFile(file);
      setDraft(text);
      setUploadedFileName(file.name);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Could not extract text from file.'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Base CV Manager</h1>
        <p className="text-gray-600 mt-1">
          Your master CV — Claude uses this to generate tailored CVs and cover letters for each role.
        </p>
      </div>

      {/* Tips card */}
      <div className="card p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Tips for a great base CV:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              <li>Include your full work history with detailed bullet points — Claude will select the most relevant parts</li>
              <li>List all skills, technologies, and tools you know</li>
              <li>Include quantified achievements where possible (e.g. "increased revenue by 30%")</li>
              <li>You can use Markdown formatting — it will be preserved in generated CVs</li>
              <li>The richer your base CV, the better Claude's tailored outputs will be</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-700">Upload your CV</p>
            <p className="text-xs text-gray-500 mt-0.5">
              PDF, Word (.docx), plain text or Markdown — text is extracted automatically
            </p>
          </div>
          <div className="flex items-center gap-2">
            {uploadedFileName && !uploading && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg px-2.5 py-1.5">
                <FileText size={12} />
                <span className="max-w-[180px] truncate">{uploadedFileName}</span>
                <button
                  onClick={() => setUploadedFileName('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary"
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Extracting…</>
                : <><Upload size={14} /> Upload file</>}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
            <AlertCircle size={14} className="shrink-0" />
            {uploadError}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Base CV (Markdown supported)</span>
            <span className="text-xs text-gray-400">{wordCount.toLocaleString()} words</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-secondary btn-sm">
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!draft.trim()}
              className="btn-secondary btn-sm"
              title="Download as Markdown"
            >
              <Download size={13} /> Download
            </button>
            <button
              onClick={handleSave}
              disabled={draft === baseCV}
              className="btn-primary btn-sm"
            >
              {saved ? <Check size={13} /> : <Save size={13} />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
        <textarea
          className="w-full p-4 font-mono text-sm focus:outline-none resize-none"
          rows={36}
          placeholder={`# Your Name
email@example.com | LinkedIn: linkedin.com/in/yourname | Phone: +61 XXX XXX XXX

## Summary
Experienced [Role] with X years of experience in...

## Experience

### Senior [Role] — Company Name (2021–Present)
- Led initiative that resulted in...
- Managed a team of X engineers...
- Delivered X% improvement in...

### [Previous Role] — Previous Company (2018–2021)
- ...

## Skills
**Languages:** Python, TypeScript, SQL...
**Frameworks:** React, FastAPI...
**Tools:** AWS, Docker, Terraform...

## Education
**B.Sc. Computer Science** — University Name (2015–2018)

## Certifications
- AWS Solutions Architect — Associate (2022)`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>

      {draft !== baseCV && (
        <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-amber-700">You have unsaved changes</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setDraft(baseCV); setUploadedFileName(''); }}
              className="btn-secondary btn-sm"
            >
              Discard
            </button>
            <button onClick={handleSave} className="btn-primary btn-sm">
              <Save size={13} /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
