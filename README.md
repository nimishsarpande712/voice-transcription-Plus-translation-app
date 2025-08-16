# Multilingual Audio Transcriber (Hindi | Marathi | Sanskrit)

## 📌 Project Description

This project is a full-stack web application built with **Next.js** and **Express.js** that allows users to:

- Upload an audio file (e.g., `.mp3` or `.wav`)
- Automatically transcribe the audio to text
- Translate the recognized text into Hindi, Marathi, or Sanskrit
- Display the translated text in Devanagari script on the UI
- Optionally play back the translated text as speech (Text-to-Speech)

---

## ⚡ How It Works

### 1. Frontend (Next.js)
- Users upload an audio file and select a target language from a dropdown
- The file and language choice are sent to the Express backend via API
- Transcribed and translated text is displayed on the screen
- "🔊 Listen" button lets users hear the translation using the browser's SpeechSynthesis API

### 2. Backend (Express.js)
- Receives the uploaded audio file
- Uses a speech recognition engine (Google Speech-to-Text, Whisper, or Web Speech API) to transcribe audio
- Translates the recognized text using Google Translate API
- Sends the translated text back to the frontend

---

## �️ Tech Stack

**Frontend:**
- Next.js (React + TailwindCSS)
- Web Speech API (for direct recording)
- Web SpeechSynthesis API (for text-to-speech)

**Backend:**
- Express.js (API routes)
- multer (audio uploads)
- Google Translate (translation)
- Whisper / Google Speech-to-Text (transcription)

**Languages Supported:**
- Hindi 🇮🇳 (`hi-IN`)
- Marathi 🌸 (`mr-IN`)
- Sanskrit 📜 (`sa`)

---

## 🚀 Features

✅ Upload audio files (`.mp3`, `.wav`)
✅ Automatic speech transcription
✅ Translate transcription into Hindi, Marathi, Sanskrit
✅ Display text in Devanagari script
✅ Listen to the translated text (Text-to-Speech)
✅ Fullstack: Next.js frontend + Express backend

---

## 📂 Workflow Example

1. User uploads: `lecture_hindi.mp3`
2. Backend transcribes: `"भारत एक महान देश है"`
3. User selects "Marathi" → Translated to: `"भारत एक महान देश आहे"`
4. App displays text + speaks it aloud in Marathi

---

## 🏗️ Project Structure

```
.
├── express-server/         # Express.js backend (API, transcription, translation)
├── nextjs-app/             # Next.js frontend (UI)
├── .env.example            # Example environment variables
├── package.json            # Project metadata
├── README.md               # Project documentation
├── setup.bat / setup.sh    # Setup scripts
```

---

## 🚦 Getting Started

1. **Clone the repository**
  ```sh
  git clone https://github.com/nimishsarpande712/voice-transcription-Plus-translation-app.git
  cd voice-transcription-Plus-translation-app
  ```
2. **Install dependencies**
  ```sh
  cd express-server && npm install
  cd ../nextjs-app && npm install
  ```
3. **Configure environment variables**
  - Copy `.env.example` to `.env` and fill in required values for API keys and services
4. **Run the servers**
  - Start Express backend: `npm start` (from `express-server`)
  - Start Next.js frontend: `npm run dev` (from `nextjs-app`)

---

## 🤝 Contributing

Pull requests and issues are welcome! Please follow conventional commit messages and provide clear descriptions.

---

## 📄 License

BSD-3-Clause

 ## 🚀 Features

 - **Express.js API Server** (`express-server/`)
   - RESTful API endpoints
   - MongoDB integration
   - Temporary file storage
 - **Next.js Frontend** (`nextjs-app/`)
   - Modern React UI
   - TypeScript support
   - Custom icons and global styles
 - **Cross-platform Setup Scripts** (`setup.bat`, `setup.sh`)
 - **Documentation** (`GOOGLE_SETUP.md`, `README.md`)

 ---

 ## 🛠️ Prerequisites

 - [Node.js](https://nodejs.org/) >= 18.x
 - [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
 - [MongoDB](https://www.mongodb.com/try/download/community)

 ---

 ## ⚡ Quick Start

 ### 1️⃣ Clone the Repository

 ```powershell
 git clone https://github.com/your-username/mongodb-project.git
 cd "mongodb project"
 ```

 ### 2️⃣ Install Dependencies

 #### Express Server
 ```powershell
 cd express-server; npm install
 ```

 #### Next.js App
 ```powershell
 cd ../nextjs-app; npm install
 ```

 ### 3️⃣ Configure Environment

 - Create a `.env` file in `express-server/` with your MongoDB URI:

 ```env
 MONGODB_URI=mongodb://localhost:27017/your-db-name
 PORT=5000
 ```

 - (Optional) Configure environment variables for Next.js in `nextjs-app/.env.local`.

 ### 4️⃣ Start the Applications



 ---

 ## 🌐 API Endpoints
 | POST   | `/api/items`     | Create new item      |
 | PUT    | `/api/items/:id` | Update item by ID    |

 - Access the Next.js app at [http://localhost:3000](http://localhost:3000)
 - Features:
   - List, create, update, and delete items
   - Responsive UI
   - Custom SVG icons

 ---

 ## 🧪 Testing

 - Backend: Add tests in `express-server/tests/` (Jest recommended)
 - Frontend: Add tests in `nextjs-app/__tests__/` (Jest + React Testing Library)

 ---

 ## 📝 Scripts

 | Script         | Location         | Description                |
 |----------------|------------------|----------------------------|
 | `setup.bat`    | Root             | Windows setup script       |
 | `setup.sh`     | Root             | Unix/Mac setup script      |
 | `npm start`    | express-server   | Start Express server       |
 | `npm run dev`  | nextjs-app       | Start Next.js frontend     |

 ---

 ## 📦 Dependencies

 - **Express.js**
 - **MongoDB**
 - **Next.js**
 - **React**
 - **TypeScript**
 - **PostCSS**

 ---

 ## 🖼️ Icons & Assets

 - SVG icons in `nextjs-app/public/`
 - Favicon in `nextjs-app/app/`

 ---

 ## 🤝 Contributing

 1. Fork the repository
 2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
 3. Commit your changes (`git commit -m 'Add some feature'`)
 4. Push to the branch (`git push origin feature/AmazingFeature`)
 5. Open a Pull Request

 ---

 ## 📄 License

 This project is licensed under the MIT License.

 ---

 ## 🙋‍♂️ Support & Contact

 - For issues, use [GitHub Issues](https://github.com/your-username/mongodb-project/issues)
 - For questions, contact [your-email@example.com](mailto:your-email@example.com)

 ---

 ## 🌟 Acknowledgements

 - [Express.js](https://expressjs.com/)
 - [Next.js](https://nextjs.org/)
 - [MongoDB](https://www.mongodb.com/)

 ---

 ## 🏁 Get Started Now!

 Happy coding! 🚀
