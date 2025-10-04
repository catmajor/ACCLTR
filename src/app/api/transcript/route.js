 import { spawn } from 'child_process';

export async function POST(req) {
  const body = await req.json();
  const { transcript } = body;

  if (!transcript) {
    return new Response(JSON.stringify({ error: 'Transcript is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('Received transcript:', transcript);

  // Call Python script with transcript
  const python = spawn('python3', ['spacy/analyzer.py']);

  let entities = '';
  let error = '';

  python.stdout.on('data', (data) => {
    entities += data.toString();
  });

  python.stderr.on('data', (data) => {
    error += data.toString();
  });

  python.stdin.write(transcript);
  python.stdin.end();

  const result = await new Promise((resolve) => {
    python.on('close', () => {
      if (error) {
        resolve({ success: false, error });
      } else {
        resolve({ success: true, entities: JSON.parse(entities) });
      }
    });
  });

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
