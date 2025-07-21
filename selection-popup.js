// Create and manage the selection popup

// Selection popup functionality
let popup = null;
let lastSelection = null;

function createPopup() {
  if (popup) return;

  popup = document.createElement('div');
  popup.className = 'tldr-selection-popup';
  popup.innerHTML = `
    <button class="tldr-selection-button summarize-button">📝 Summarize</button>
    <button class="tldr-selection-button ask-button">❓ Ask about</button>
  `;
  document.body.appendChild(popup);

  // Add event listeners to buttons
  popup.querySelector('.summarize-button').addEventListener('click', handleSummarizeClick);
  popup.querySelector('.ask-button').addEventListener('click', handleAskClick);

  // Prevent popup from disappearing when clicking inside it
  popup.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
}

function handleSummarizeClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!lastSelection) return;

  const selectedText = lastSelection.toString().trim();
  if (!selectedText) return;

  // Send message to background script
  chrome.runtime.sendMessage({
    action: 'startTask',
    taskType: 'summarize',
    content: selectedText,
    source: 'selection'
  }, response => {
    if (response && response.success) {
      // Open the extension popup to show progress
      chrome.runtime.sendMessage({
        action: 'showResult',
        taskId: response.taskId,
        source: 'selection'
      });
      hidePopup();
    }
  });
}

function handleAskClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!lastSelection) return;

  const selectedText = lastSelection.toString().trim();
  if (!selectedText) return;

  // Send message to open popup with question input focused
  chrome.runtime.sendMessage({
    action: 'openPopupForQuestions',
    source: 'selection'
  });
  hidePopup();
}

function showPopup(selection) {
  if (!popup) {
    createPopup();
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Position popup above the selection
  const popupTop = rect.top + window.scrollY - popup.offsetHeight - 10;
  const popupLeft = rect.left + window.scrollX + (rect.width / 2) - (popup.offsetWidth / 2);

  popup.style.top = `${popupTop}px`;
  popup.style.left = `${popupLeft}px`;
  popup.style.display = 'flex';
  
  lastSelection = selection;
}

function hidePopup() {
  if (popup) {
    popup.style.display = 'none';
  }
}

// Handle text selection
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    hidePopup();
    lastSelection = null;
    return;
  }

  showPopup(selection);
});

// Hide popup when clicking outside
document.addEventListener('mousedown', (e) => {
  if (popup && !popup.contains(e.target)) {
    hidePopup();
  }
});

// Initialize
createPopup(); 