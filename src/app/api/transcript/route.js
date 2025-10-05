import { spawn } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  const body = await req.json();
  const { transcript } = body;

  if (!transcript) {
    return new Response(
      JSON.stringify({ error: 'Transcript is required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log('Received transcript:', transcript);

  // Spawn Python process (Windows uses "python")
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const python = spawn(pythonCmd, ['spacy/analyzer.py']);

  python.stdout.setEncoding('utf-8');
  python.stderr.setEncoding('utf-8');

  let entities = '';
  let error = '';

  python.stdout.on('data', (data) => {
    entities += data;
  });

  python.stderr.on('data', (data) => {
    error += data;
  });

  python.stdin.write(transcript, 'utf-8');
  python.stdin.end();

  const result = await new Promise((resolve) => {
    python.on('close', () => {
      if (error) {
        resolve({ success: false, error });
      } else {
        try {
          console.log(entities);
          resolve({ success: true, entities: JSON.parse(entities) });
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse JSON from Python output.' });
        }
      }
    });
  });

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error || 'Entity extraction failed.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  console.log('Extracted entities:', result.entities);

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing GOOGLE_API_KEY.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const filtered = (result.entities || []).filter(
    (e) => e && e.label !== 'MISC' && e.text
  );

  async function analyzeEntry(entry) {
    const instruction = 'Generate the definition which culturally fits in with context. Reply with only the definition.';
    const prompt = `${instruction}\n\nContext:\n${transcript}\n\nTerm:\n${entry}`;
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    return { title: entry, definition: text.trim() };
  }

  const entries = await Promise.all(filtered.map((e) => analyzeEntry(e.text)));

  return new Response(JSON.stringify(entries), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

