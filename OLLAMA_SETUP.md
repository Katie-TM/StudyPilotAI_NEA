# StudyPilot AI + Ollama setup

This version of StudyPilot uses Ollama instead of the OpenAI API. The AI model runs locally on your computer, so the project does not need an OpenAI API key.

## 1. Install Ollama

Download Ollama for Windows from:
https://ollama.com/download/windows

Install it with the normal/default options. Ollama runs its local API at `http://localhost:11434`.

## 2. Open Command Prompt

Open Command Prompt and check Ollama is installed:

```bash
ollama --version
```

## 3. Download the AI model

StudyPilot is set up to use Qwen 3.5 4B by default:

```bash
ollama pull qwen3.5:4b
```

This downloads the model to your computer. It is about 3.4 GB according to the Ollama model page.

You can test it with:

```bash
ollama run qwen3.5:4b
```

Type something like `Give me one study tip` and press Enter. When finished, type `/bye`.

## 4. Set up StudyPilot

Open the StudyPilot project folder and make a copy of `.env.example` named `.env`.

The `.env` file should contain:

```text
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:4b
PORT=3000
```

There is no `OPENAI_API_KEY` in this version.

## 5. Install the website dependencies

In Command Prompt, make sure you are inside the folder containing `server.js`, then run:

```bash
npm install
```

## 6. Start StudyPilot

Run:

```bash
npm start
```

You should see messages similar to:

```text
StudyPilot AI running at http://localhost:3000
Ollama: http://localhost:11434
Model: qwen3.5:4b
```

## 7. Open the website

Go to:

http://localhost:3000

Add your subjects in Planner first, then open AI Planner and click **Generate AI timetable**.

## If you get an Ollama error

### `Ollama is not running`

Open the Ollama application, wait a few seconds, then try generating the timetable again.

### `The Ollama model "qwen3.5:4b" is not installed`

Run:

```bash
ollama pull qwen3.5:4b
```

### Ollama is too slow

You can use a smaller model. For example:

```bash
ollama pull llama3.2:1b
```

Then change `.env` to:

```text
OLLAMA_MODEL=llama3.2:1b
```

Restart `npm start` after changing `.env`.

## Important

Do not add an OpenAI API key to this project. This version talks directly to your local Ollama server.
