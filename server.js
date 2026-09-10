import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT) || 3000;
const ollamaUrl = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3.5:4b';

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

const planSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overview: { type: 'string' },
    tips: { type: 'array', items: { type: 'string' } },
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          day: { type: 'string' },
          date: { type: 'string' },
          subject: { type: 'string' },
          focus: { type: 'string' },
          duration: { type: 'integer' },
          reason: { type: 'string' }
        },
        required: ['day', 'date', 'subject', 'focus', 'duration', 'reason']
      }
    }
  },
  required: ['overview', 'tips', 'sessions']
};

const systemPrompt = `You are StudyPilot AI, a supportive revision-planning assistant for students.
Create a realistic, balanced revision timetable from the supplied subjects.
Prioritise subjects with earlier exam dates and higher difficulty, but avoid putting the same subject in every session.
Respect the student's approximate daily study hours and preferred session length.
Use active recall, practice questions, flashcards, past papers, teaching/explaining, and spaced review where appropriate.
Do not invent exams or dates. If an exam date is missing, treat that subject as lower priority.
Return only data matching the supplied JSON schema. Keep the overview and reasons concise and student-friendly.
Dates must be ISO YYYY-MM-DD where a date is available; otherwise use an empty string.
Generate up to 14 sessions for the coming 7 days, with no more than 4 sessions per day.`;

async function checkOllama() {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) return { available: false, modelInstalled: false };
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    const modelInstalled = models.some((model) => model.name === ollamaModel || model.model === ollamaModel);
    return { available: true, modelInstalled };
  } catch {
    return { available: false, modelInstalled: false };
  }
}

app.post('/api/generate-plan', async (req, res) => {
  const { subjects, studyHours, sessionLength, examFocus } = req.body || {};

  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'Add at least one subject before generating a timetable.' });
  }

  const cleanSubjects = subjects.slice(0, 30).map((s) => ({
    subject: String(s.subject || '').slice(0, 80),
    examDate: String(s.examDate || ''),
    difficulty: String(s.difficulty || 'Medium')
  }));

  const input = JSON.stringify({
    subjects: cleanSubjects,
    studyHours: Number(studyHours) || 2,
    sessionLength: Number(sessionLength) || 50,
    examFocus: Boolean(examFocus)
  });

  try {
    const ollamaStatus = await checkOllama();
    if (!ollamaStatus.available) {
      return res.status(503).json({
        error: 'Ollama is not running. Open Ollama and try again.'
      });
    }

    if (!ollamaStatus.modelInstalled) {
      return res.status(503).json({
        error: `The Ollama model "${ollamaModel}" is not installed. Run: ollama pull ${ollamaModel}`
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Create the revision timetable using these settings:\n${input}\n\nReturn JSON only. The required JSON schema is:\n${JSON.stringify(planSchema)}`
          }
        ],
        stream: false,
        format: planSchema,
        options: { temperature: 0.2 }
      })
    });

    clearTimeout(timeout);

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data.error || 'Ollama returned an error.' });
    }

    const plan = JSON.parse(data.message?.content || '{}');
    return res.json(plan);
  } catch (error) {
    console.error(error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Ollama took too long to generate the timetable. Try a smaller model or fewer subjects.' });
    }
    return res.status(500).json({ error: 'The AI timetable could not be generated. Make sure Ollama is running and the model is installed.' });
  }
});

app.get('/api/status', async (_req, res) => {
  const status = await checkOllama();
  res.json({
    configured: status.available && status.modelInstalled,
    ollamaRunning: status.available,
    modelInstalled: status.modelInstalled,
    model: ollamaModel
  });
});

app.get('*path', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`StudyPilot AI running at http://localhost:${port}`);
  console.log(`Ollama: ${ollamaUrl}`);
  console.log(`Model: ${ollamaModel}`);
});
