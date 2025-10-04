# Real-Time Speech Transcription with Next.js

A modern, browser-based speech transcription application built with Next.js and the Web Speech API.

## Features

- **Real-time transcription**: Convert speech to text as you speak using the browser's built-in speech recognition
- **40+ languages**: Support for multiple languages and dialects
- **Continuous or single mode**: Choose between continuous listening or single utterances
- **Interim results**: See real-time transcription as you speak
- **Export options**: Copy to clipboard or download as text file
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **No external dependencies**: Works entirely in the browser

## Getting Started

### Prerequisites

- Node.js 18+ 
- A modern browser (Chrome, Edge, or Safari recommended)
- Microphone access

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ACCLTR
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Allow microphone access** when prompted by your browser
2. **Select your language** from the dropdown menu
3. **Choose transcription mode**:
   - **Continuous**: Keeps listening until you stop it
   - **Single**: Stops after each sentence/phrase
4. **Enable interim results** to see real-time transcription
5. **Click "Start Listening"** and speak clearly
6. **Export your transcript** using copy or download buttons

## Supported Languages

The application supports 40+ languages including:

- English (US/UK)
- Spanish (Spain/Mexico)
- French, German, Italian
- Portuguese (Brazil/Portugal)
- Russian, Japanese, Korean
- Chinese (Simplified/Traditional)
- Arabic, Hindi, Thai
- Dutch, Swedish, Norwegian
- And many more...

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Safari**: Full support
- **Firefox**: Limited support (may not work in all versions)

## Technical Details

- **Web Speech API**: Browser-native speech recognition
- **Next.js 15**: React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework
- **Client-side only**: No external APIs or servers required

## Troubleshooting

### Microphone Issues
- Ensure your browser has microphone permissions
- Check if other applications are using the microphone
- Try refreshing the page and allowing permissions again

### Transcription Issues
- Speak clearly and at normal volume
- Reduce background noise
- Try a different language if auto-detection isn't working
- Ensure you're using a supported browser

### Performance Issues
- Close other browser tabs that might be using audio
- Restart your browser if recognition becomes unresponsive
- Check your internet connection (some browsers require it)

## Development

### Project Structure
```
src/
├── app/
│   ├── components/
│   │   └── SpeechTranscriber.jsx  # Main transcription component
│   ├── page.js                    # Home page
│   └── globals.css                # Global styles
```

### Customization

- **Add languages**: Edit the `languages` array in `SpeechTranscriber.jsx`
- **Change styling**: Modify Tailwind CSS classes
- **Add features**: Extend the component with additional functionality

## License

This project is open source and available under the MIT License.