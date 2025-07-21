class TLDRExtension {
  constructor() {
    this.currentContent = null;
    this.messages = [];
    this.selectedTabs = new Set();
    this.activeTaskId = null;
    this.websiteType = null;
    this.contextSuggestions = {
      ecommerce: [
        { text: "Find cheaper alternatives", prompt: "Find similar products that are cheaper than the current item" },
        { text: "Compare features", prompt: "Compare the features of this product with similar products" },
        { text: "Read reviews", prompt: "Summarize the key points from customer reviews" }
      ],
      news: [
        { text: "Summarize article", prompt: "Provide a concise summary of this article" },
        { text: "Check facts", prompt: "Verify the key claims in this article" },
        { text: "Related topics", prompt: "Find related articles and topics" }
      ],
      documentation: [
        { text: "Explain concept", prompt: "Explain this concept in simple terms" },
        { text: "Find examples", prompt: "Find practical examples of this concept" },
        { text: "Common issues", prompt: "List common issues and their solutions" }
      ],
      social: [
        { text: "Analyze sentiment", prompt: "Analyze the sentiment of this post and comments" },
        { text: "Key points", prompt: "Extract the main points from this discussion" },
        { text: "Find similar content", prompt: "Find similar posts and discussions" }
      ]
    };
    this.init();
  }

  async init() {
    await this.loadState();
    this.bindEvents();
    this.setupMessageListener();
    await this.loadTabs();
    await this.showContextSuggestions();
    
    // Check for any active tasks when popup opens
    if (this.activeTaskId) {
      this.pollForResult(this.activeTaskId);
    }
  }

  async loadState() {
    try {
      const state = await chrome.storage.local.get(['messages', 'selectedTabs']);
      if (state.messages) {
        this.messages = state.messages;
        this.displayMessages();
      }
      if (state.selectedTabs) {
        this.selectedTabs = new Set(state.selectedTabs);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        messages: this.messages,
        selectedTabs: Array.from(this.selectedTabs)
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  async loadTabs() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const tabDropdown = document.getElementById('tabDropdown');
      const tabSelectBtn = document.getElementById('tabSelectBtn');
      const selectedCount = document.getElementById('selectedCount');
      
      // Clear existing options
      tabDropdown.innerHTML = '';

      // Add tabs as options
      tabs.forEach(tab => {
        const option = document.createElement('div');
        option.className = 'tab-option';
        if (this.selectedTabs.has(tab.id)) {
          option.classList.add('selected');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.selectedTabs.has(tab.id);
        checkbox.addEventListener('change', async (e) => {
          e.stopPropagation();
          if (e.target.checked) {
            this.selectedTabs.add(tab.id);
            option.classList.add('selected');
          } else {
            this.selectedTabs.delete(tab.id);
            option.classList.remove('selected');
          }
          await this.saveState();
          this.updateSelectedCount();
          this.updateButtonText();
        });

        const label = document.createElement('span');
        label.textContent = tab.title;
        label.title = tab.url;

        option.appendChild(checkbox);
        option.appendChild(label);
        tabDropdown.appendChild(option);
      });

      // Update selected count and button text
      this.updateSelectedCount();
      this.updateButtonText();

      // Add click event listener to the button
      tabSelectBtn.addEventListener('click', () => {
        tabDropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!tabSelectBtn.contains(e.target) && !tabDropdown.contains(e.target)) {
          tabDropdown.classList.remove('show');
        }
      });

    } catch (error) {
      console.error('Failed to load tabs:', error);
    }
  }

  updateSelectedCount() {
    const selectedCount = document.getElementById('selectedCount');
    if (this.selectedTabs.size > 0) {
      selectedCount.textContent = `${this.selectedTabs.size} tab${this.selectedTabs.size > 1 ? 's' : ''} selected`;
    } else {
      selectedCount.textContent = '';
    }
  }

  updateButtonText() {
    const tabSelectBtn = document.getElementById('tabSelectBtn');
    if (this.selectedTabs.size > 0) {
      tabSelectBtn.textContent = `${this.selectedTabs.size} tab${this.selectedTabs.size > 1 ? 's' : ''} selected`;
    } else {
      tabSelectBtn.textContent = 'Select tabs to analyze';
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'taskCompleted') {
        this.hideStatus();
        this.addMessage(message.result);
        this.saveState();
        this.activeTaskId = null;
      } else if (message.action === 'taskError') {
        this.showError(message.error);
        this.activeTaskId = null;
      }
    });
  }

  bindEvents() {
    // Summarize button
    document.getElementById('summarizeBtn').addEventListener('click', () => {
      this.summarizeCurrentPage();
    });

    // Summarize all tabs button
    document.getElementById('summarizeAllBtn').addEventListener('click', () => {
      this.summarizeAllTabs();
    });

    // Question input
    const input = document.getElementById('questionInput');
    const submitBtn = document.getElementById('submitQuestionBtn');

    input.addEventListener('input', () => {
      submitBtn.disabled = !input.value.trim();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && input.value.trim()) {
        e.preventDefault();
        this.handleQuestionSubmit();
      }
    });

    submitBtn.addEventListener('click', () => {
      if (input.value.trim()) {
        this.handleQuestionSubmit();
      }
    });

    // Select all tabs button
    document.getElementById('selectAllTabs').addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.tab-option input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const option = checkbox.closest('.tab-option');
        option.classList.add('selected');
      });
      
      this.selectedTabs = new Set(
        Array.from(checkboxes).map(checkbox => 
          parseInt(checkbox.closest('.tab-option').dataset.tabId)
        )
      );
      this.saveState();
      this.updateSelectedCount();
      this.updateButtonText();
    });

    // Close button
    document.querySelector('.close-btn').addEventListener('click', () => {
      window.close();
    });
  }

  async summarizeCurrentPage() {
    try {
      this.showLoading('Getting page content...');

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Get the content
      this.currentContent = await this.getPageContent(tab.id);
      
      this.showLoading('Generating summary...');

      // Send to background for processing
      const response = await chrome.runtime.sendMessage({
        action: 'startTask',
        taskType: 'summarize',
        content: this.currentContent,
        model: document.getElementById('modelSelect').value
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to start summarization');
      }

      // Show loading and wait for result
      this.pollForResult(response.taskId);

    } catch (error) {
      this.showError(error.message);
      console.error('Summarization error:', error);
    }
  }

  async summarizeAllTabs() {
    try {
      this.showLoading('Getting content from all tabs...');

      // Get all tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('No tabs found');
      }

      // Get content from each tab
      let allContent = '';
      for (const tab of tabs) {
        try {
          const content = await this.getPageContent(tab.id);
          allContent += `\n\nPage: ${tab.title}\nURL: ${tab.url}\n${content}`;
        } catch (error) {
          console.warn(`Failed to get content from tab ${tab.url}:`, error);
          // Continue with other tabs even if one fails
        }
      }

      if (!allContent) {
        throw new Error('Could not extract content from any tab');
      }

      this.currentContent = allContent;
      this.showLoading('Generating summary of all tabs...');

      // Send to background for processing
      const response = await chrome.runtime.sendMessage({
        action: 'startTask',
        taskType: 'summarize',
        content: this.currentContent,
        model: document.getElementById('modelSelect').value
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to start summarization');
      }

      // Show loading and wait for result
      this.pollForResult(response.taskId);

    } catch (error) {
      this.showError(error.message);
      console.error('Summarization error:', error);
    }
  }

  async handleQuestionSubmit() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    
    if (!question) return;

    try {
      // Disable input while processing
      input.disabled = true;
      document.getElementById('submitQuestionBtn').disabled = true;

      // Add question to chat
      this.addMessage(question, true);
      
      // Clear input
      input.value = '';

      this.showLoading('Getting content from selected tabs...');

      // Get content from selected tabs
      let allContent = '';
      if (this.selectedTabs.size > 0) {
        for (const tabId of this.selectedTabs) {
          try {
            const content = await this.getPageContent(tabId);
            const tab = await chrome.tabs.get(tabId);
            allContent += `\n\nPage: ${tab.title}\nURL: ${tab.url}\n${content}`;
          } catch (error) {
            console.warn(`Failed to get content from tab ${tabId}:`, error);
          }
        }
      } else {
        // Fallback to current tab if no tabs selected
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          throw new Error('No active tab found');
        }
        allContent = await this.getPageContent(tab.id);
      }

      if (!allContent) {
        throw new Error('Could not extract content from any selected tab');
      }

      this.currentContent = allContent;
      this.showLoading('Processing your question...');

      // Send to background for processing
      const response = await chrome.runtime.sendMessage({
        action: 'startTask',
        taskType: 'question',
        content: this.currentContent,
        question: question,
        model: document.getElementById('modelSelect').value
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to process question');
      }

      // The background script will handle the rest and notify us when done

    } catch (error) {
      this.showError(error.message);
      console.error('Question error:', error);
    } finally {
      // Re-enable input
      input.disabled = false;
      document.getElementById('submitQuestionBtn').disabled = !input.value.trim();
    }
  }

  async getPageContent(tabId) {
    try {
      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      // Wait for script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get content
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: 'extractContent' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response || !response.success) {
            reject(new Error(response?.error || 'Failed to extract content'));
            return;
          }

          resolve(response.content);
        });
      });
    } catch (error) {
      throw new Error(`Content extraction failed: ${error.message}`);
    }
  }

  pollForResult(taskId) {
    this.activeTaskId = taskId;
    const checkResult = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'checkTaskStatus',
          taskId: taskId
        });

        if (response.status === 'completed') {
          this.hideStatus();
          this.addMessage(response.result);
          this.saveState();
          this.activeTaskId = null;
          return;
        }

        if (response.status === 'error') {
          this.showError(response.error);
          this.activeTaskId = null;
          return;
        }

        // If still processing, check again in 1 second
        if (response.status === 'processing') {
          setTimeout(checkResult, 1000);
        }
      } catch (error) {
        console.error('Error checking task status:', error);
        this.showError('Failed to check task status');
        this.activeTaskId = null;
      }
    };

    checkResult();
  }

  addMessage(content, isUser = false) {
    this.messages.push({ content, isUser });
    this.displayMessages();
    this.saveState();
  }

  displayMessages() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';

    this.messages.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${msg.isUser ? 'user' : 'model'}`;
      messageDiv.textContent = msg.content;
      container.appendChild(messageDiv);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  showLoading(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status';
    status.style.display = 'block';
  }

  showError(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status error';
    status.style.display = 'block';
  }

  hideStatus() {
    const status = document.getElementById('status');
    status.style.display = 'none';
  }

  async detectWebsiteType(tab) {
    const url = tab.url.toLowerCase();
    const title = tab.title.toLowerCase();
    
    // E-commerce detection
    if (url.includes('amazon.com') || url.includes('ebay.com') || 
        url.includes('walmart.com') || url.includes('shop') || 
        url.includes('product') || url.includes('cart')) {
      return 'ecommerce';
    }
    
    // News detection
    if (url.includes('news') || url.includes('article') || 
        url.includes('reuters.com') || url.includes('bbc.com') || 
        url.includes('cnn.com')) {
      return 'news';
    }
    
    // Documentation detection
    if (url.includes('docs') || url.includes('documentation') || 
        url.includes('guide') || url.includes('tutorial') || 
        url.includes('api')) {
      return 'documentation';
    }
    
    // Social media detection
    if (url.includes('twitter.com') || url.includes('facebook.com') || 
        url.includes('reddit.com') || url.includes('linkedin.com')) {
      return 'social';
    }
    
    return 'general';
  }

  async showContextSuggestions() {
    const suggestionsContainer = document.getElementById('contextSuggestions');
    if (!suggestionsContainer) return;

    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Detect website type
    this.websiteType = await this.detectWebsiteType(tab);
    
    // Get suggestions for the detected type
    const suggestions = this.contextSuggestions[this.websiteType] || [];
    
    // Clear existing suggestions
    suggestionsContainer.innerHTML = '';
    
    if (suggestions.length > 0) {
      suggestionsContainer.style.display = 'flex';
      suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.className = 'suggestion-btn';
        button.textContent = suggestion.text;
        button.addEventListener('click', () => {
          document.getElementById('questionInput').value = suggestion.prompt;
          this.handleQuestionSubmit();
        });
        suggestionsContainer.appendChild(button);
      });
    } else {
      suggestionsContainer.style.display = 'none';
    }
  }
}

// Initialize the extension
new TLDRExtension();