# 🌍 Dialect Identifier

A web-based NLP tool that identifies Arabic dialects (e.g., Egyptian, Gulf, Maghrebi) from user-input text using advanced machine learning models.

---

## ✨ Features

- 🌐 Supports multiple dialects: Egyptian, Gulf, Maghrebi
- 📊 Displays confidence scores per dialect
- 🧠 Uses dialect-specific lexical cues (e.g., “إزيّك” → Egyptian)
- 🔄 Feedback loop powered by Supabase
- 📥 CSV Upload to test batches of sentences
- 📤 Export classification results
- 📘 Explanations for dialect decision
- 🌈 Beautiful and accessible UI (shadcn-ui + Tailwind CSS)

---

## 🧠 How It Works

1. Users enter a sentence in Arabic.
2. The model analyzes key words and syntax patterns.
3. Displays dialect classification + confidence scores.
4. Users can give feedback to correct the model prediction.
5. Feedback is saved for future model retraining.

---

## 🛠️ Built With

- 🧪 **TypeScript**
- ⚡ **Vite**
- 🧱 **React**
- 🎨 **shadcn-ui** (UI components)
- 🌬️ **Tailwind CSS**
- 🧾 **Supabase** (for feedback storage)

---

## 📂 Project Setup (Locally)

```bash
# Clone the repo
git clone <YOUR_GIT_URL>
cd arabesque-speech-scribe

# Install dependencies
npm install

# Start development server
npm run dev
