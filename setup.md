# TL;DR News Summarizer Chrome Extension

A Chrome extension that generates concise TL;DR summaries of web pages using local Ollama models.

## Features

- 📰 **Single Page Summary**: Generate TL;DR for the current page
- 📑 **All Tabs Summary**: Summarize all open tabs at once
- 🔗 **URL Input**: Paste any URL to generate summary
- 💾 **Save Summaries**: Store summaries locally for later reference
- 📋 **Copy Function**: Easy copy to clipboard
- 🤖 **Multiple Models**: Choose from various Ollama models
- 🎨 **Modern UI**: Beautiful gradient interface with animations

## Prerequisites

### 1. Install Ollama

First, install Ollama on your system:

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai/download

### 2. Download and Start Models

After installing Ollama, download the models you want to use:

```bash
# Fast and lightweight (recommended to start)
ollama pull llama3.2:1b

# Balanced performance
ollama pull llama3.2:3b

# Higher quality (requires more resources)
ollama pull llama3.1:8b

# Alternative models
ollama pull mistral:7b
ollama pull phi3:mini
```

### 3. Start Ollama Server

Start the Ollama server (it runs on localhost:11434):

```bash
ollama serve
```

Keep this running in the background while using the extension.

#### Setting up Browser Extension Origins (One-time Setup)

To allow the extension to communicate with Ollama, you need to set up the allowed origins. This is a one-time setup:

**For zsh users:**
```bash
echo 'export OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*,safari-web-extension://*"' >> ~/.zshrc
source ~/.zshrc
```

**For bash users:**
```bash
echo 'export OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*,safari-web-extension://*"' >> ~/.bashrc
source ~/.bashrc
```

After setting this up, you can simply run `ollama serve` without specifying the origins each time.

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Create Extension Directory**:
   ```bash
   mkdir tldr-extension
   cd tldr-extension
   ```

2. **Create Files**: Create the following files in the directory:

   - `manifest.json` (copy from the manifest artifact above)
   - `popup.html` (copy from the popup HTML artifact)
   - `popup.js` (copy from the popup JavaScript artifact)
   - `content.js` (copy from the content script artifact)
   - `background.js` (copy from the background service worker artifact)

3. **Add Icons** (optional): Create or download 16x16, 48x48, and 128x128 pixel PNG icons named:
   - `icon16.png`
   - `icon48.png` 
   - `icon128.png`

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select your `tldr-extension` directory

### Method 2: Package as .crx (Production)

1. In Chrome Extensions page, click "Pack extension"
2. Select your extension directory
3. Generate the .crx file for distribution

## Usage

### Basic Usage

1. **Open the Extension**: Click the TL;DR extension icon in your Chrome toolbar
2. **Select Model**: Choose your preferred Ollama model from the dropdown
3. **Generate Summary**: Click "📰 TL;DR This Page" to summarize the current page

### Advanced Features

- **All Tabs**: Click "📑 TL;DR All Tabs" to get summaries of all open tabs
- **URL Input**: Paste any URL in the input field and click "Generate TL;DR from URL"
- **Save Summary**: Click "💾 Save TL;DR" to store the summary locally
- **Copy**: Click "📋 Copy" to copy the summary to your clipboard
- **View Saved**: Click "📚 View Saved" to see all your saved summaries

### Keyboard Shortcuts (Optional)

You can add keyboard shortcuts in Chrome:
1. Go to `chrome://extensions/shortcuts`
2. Find "TL;DR News Summarizer"
3. Set a shortcut for "Summarize current page"

## Configuration

### Model Selection

The extension supports multiple Ollama models:

- **Llama 3.2 1B**: Fastest, lowest resource usage
- **Llama 3.2 3B**: Good balance of speed and quality
- **Llama 3.1 8B**: Higher quality, requires more resources
- **Mistral 7B**: Alternative high-quality model
- **Phi-3 Mini**: Microsoft's efficient model

### Performance Tips

1. **Start with smaller models** (1B or 3B) for faster responses
2. **Ensure Ollama is running** before using the extension
3. **Check system resources** when using larger models
4. **Close unused tabs** when summarizing all tabs

## Troubleshooting

### Common Issues

**"Cannot connect to Ollama"**
- Ensure Ollama is installed and running (`ollama serve`)
- Check that port 11434 is not blocked
- Verify models are downloaded (`ollama list`)

**"No content found"**
- Some pages may block content extraction
- Try refreshing the page and waiting for it to fully load
- Check if the page has substantial text content

**Slow performance**
- Switch to a smaller model (llama3.2:1b)
- Ensure sufficient system RAM is available
- Close other resource-intensive applications

**Extension not appearing**
- Check if it's enabled in chrome://extensions/
- Try reloading the extension
- Check browser console for errors

### Debug Mode

1. Open Chrome DevTools (F12)
2. Go to the Extensions panel
3. Find your extension and click "Inspect views: popup"
4. Check console for error messages

## Privacy & Security

- **Local Processing**: All summaries are generated locally using Ollama
- **No External APIs**: No data is sent to external services
- **Local Storage**: Saved summaries are stored locally in your browser
- **No Tracking**: Extension doesn't collect or transmit usage data

## Customization

### Adding New Models

To add support for new Ollama models:

1. Download the model: `ollama pull model-name`
2. Edit `popup.html` and add the model to the select options:
   ```html
   <option value="model-name">Model Display Name</option>
   ```

### Modifying the Prompt

Edit the `callOllamaAPI` function in `popup.js` to customize the summarization prompt:

```javascript
const prompt = `Your custom prompt here: ${content}`;
```

### Styling

Modify the CSS in `popup.html` to change the appearance:
- Colors: Update the gradient values
- Fonts: Change the font-family properties  
- Layout: Adjust padding, margins, and sizes

## File Structure

```
tldr-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Main extension logic
├── content.js            # Content extraction script
├── background.js         # Background service worker
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
└── icon128.png          # Extension icon (128x128)
```

## Contributing

Feel free to modify and improve the extension:

1. Add new features to the popup interface
2. Improve content extraction for specific sites
3. Add support for additional Ollama models
4. Enhance the UI/UX design
5. Add export functionality for saved summaries

## License

This extension is provided as-is for educational and personal use. Modify and distribute freely.