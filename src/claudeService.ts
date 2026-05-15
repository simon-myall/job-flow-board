import Anthropic from '@anthropic-ai/sdk';

export type GenerationResult = {
  text: string;
  error?: string;
};

function getClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function generateCoverLetter(
  apiKey: string,
  jobTitle: string,
  company: string,
  jobDescription: string,
  baseCV: string,
  onChunk: (chunk: string) => void
): Promise<GenerationResult> {
  if (!apiKey) return { text: '', error: 'No API key configured. Add your Claude API key in Settings.' };
  if (!baseCV.trim()) return { text: '', error: 'No base CV found. Please add your base CV in the CV Manager.' };

  const client = getClient(apiKey);
  let full = '';

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: `You are an expert career coach and professional writer.
Write compelling, tailored cover letters that highlight relevant experience and skills from the candidate's CV
that match the job description. Be concise (300-400 words), professional, and specific.
Do not fabricate experience — only use what is in the provided CV.`,
      messages: [
        {
          role: 'user',
          content: `Write a tailored cover letter for the following role.

**Job Title:** ${jobTitle}
**Company:** ${company}

**Job Description:**
${jobDescription || '(Not provided — write a general cover letter for this role)'}

**My CV / Background:**
${baseCV}

Write the full cover letter ready to send, starting with "Dear Hiring Manager," (or use a specific name if inferable).
Include my relevant skills and experience from the CV that match the job requirements.`,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        full += event.delta.text;
        onChunk(event.delta.text);
      }
    }

    return { text: full };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: '', error: msg };
  }
}

export async function generateCustomCV(
  apiKey: string,
  jobTitle: string,
  company: string,
  jobDescription: string,
  baseCV: string,
  onChunk: (chunk: string) => void
): Promise<GenerationResult> {
  if (!apiKey) return { text: '', error: 'No API key configured. Add your Claude API key in Settings.' };
  if (!baseCV.trim()) return { text: '', error: 'No base CV found. Please add your base CV in the CV Manager.' };

  const client = getClient(apiKey);
  let full = '';

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: `You are an expert career coach specialising in CV optimisation.
Tailor CVs to specific job descriptions by reordering bullet points,
highlighting the most relevant experience, and subtly reframing descriptions to match the job requirements.
Do NOT invent experience — only reframe and reorder existing content.
Return the full tailored CV in clean Markdown format.`,
      messages: [
        {
          role: 'user',
          content: `Tailor my CV for the following role by emphasising the most relevant experience and skills.

**Target Role:** ${jobTitle} at ${company}

**Job Description:**
${jobDescription || '(Not provided — optimise generally for this type of role)'}

**My Base CV:**
${baseCV}

Return the complete tailored CV in Markdown format. Reorder and reframe bullet points to best match the job requirements. Keep all factual content accurate.`,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        full += event.delta.text;
        onChunk(event.delta.text);
      }
    }

    return { text: full };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: '', error: msg };
  }
}

/** Fetch a job posting URL via CORS proxy and return the visible page text. */
export async function fetchJobDescription(url: string): Promise<{ text: string; error?: string }> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`;
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Proxy responded with HTTP ${response.status}`);

    const data = await response.json() as { contents?: string; status?: { http_code?: number } };
    if (data.status?.http_code && data.status.http_code >= 400) {
      throw new Error(`Page returned HTTP ${data.status.http_code}`);
    }
    const html = data.contents ?? '';

    const text = html
      // Remove script/style blocks entirely
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Drop all remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&[a-z]+;/gi, ' ')
      // Collapse whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: '', error: `Could not fetch page: ${msg}` };
  }
}

export async function extractJobDetails(
  apiKey: string,
  text: string
): Promise<{ title?: string; company?: string; location?: string; salary?: string }> {
  if (!apiKey) return {};

  const client = getClient(apiKey);

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: 'Extract job details from the provided text. Return JSON only.',
      messages: [
        {
          role: 'user',
          content: `Extract the following from this job posting and return as JSON with keys: title, company, location, salary.
If a field is not present, use null.

Text:
${text.slice(0, 3000)}`,
        },
      ],
    });

    const raw = response.content.find((b) => b.type === 'text')?.text ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return {};
  } catch {
    return {};
  }
}
