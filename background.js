// Background script for TL;DR Extension

// Store active tasks
const tasks = new Map();

// Initialize state from storage
chrome.runtime.onInstalled.addListener(async () => {
  const state = await chrome.storage.local.get(['messages', 'selectedTabs']);
  if (!state.messages) {
    await chrome.storage.local.set({ messages: [] });
  }
  if (!state.selectedTabs) {
    await chrome.storage.local.set({ selectedTabs: [] });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startTask') {
    const taskId = Date.now().toString();
    
    // Create new task
    tasks.set(taskId, {
      status: 'processing',
      type: request.taskType,
      source: request.source || 'page',
      text: request.content.substring(0, 100) + '...',
      model: request.model,
      question: request.question,
      content: request.content
    });

    // Process task asynchronously
    processTask(taskId, request)
      .then(async result => {
        const task = tasks.get(taskId);
        if (task) {
          task.status = 'completed';
          task.result = result;
          
          // Update messages in storage
          const state = await chrome.storage.local.get(['messages']);
          const messages = state.messages || [];
          messages.push({ content: task.question || 'Summarize this content', isUser: true });
          messages.push({ content: result, isUser: false });
          await chrome.storage.local.set({ messages });

          // Notify any open popups about completion
          chrome.runtime.sendMessage({
            action: 'taskCompleted',
            taskId: taskId,
            type: task.type,
            source: task.source,
            text: task.text,
            result: result
          }).catch(() => {
            // Ignore errors if no popup is open
          });
        }
      })
      .catch(error => {
        const task = tasks.get(taskId);
        if (task) {
          task.status = 'error';
          task.error = error.message;
          
          // Notify any open popups about error
          chrome.runtime.sendMessage({
            action: 'taskError',
            taskId: taskId,
            error: error.message
          }).catch(() => {
            // Ignore errors if no popup is open
          });
        }
      });

    // Return task ID immediately
    sendResponse({ success: true, taskId });
    return true;
  }

  if (request.action === 'checkTaskStatus') {
    const task = tasks.get(request.taskId);
    if (!task) {
      sendResponse({ status: 'error', error: 'Task not found' });
      return true;
    }

    sendResponse({
      status: task.status,
      result: task.result,
      error: task.error,
      type: task.type,
      source: task.source,
      text: task.text
    });

    // Only clean up completed tasks if they're older than 5 minutes
    if ((task.status === 'completed' || task.status === 'error') && 
        Date.now() - parseInt(taskId) > 5 * 60 * 1000) {
      tasks.delete(request.taskId);
    }

    return true;
  }

  if (request.action === 'getState') {
    chrome.storage.local.get(['messages', 'selectedTabs'], (state) => {
      sendResponse(state);
    });
    return true;
  }

  if (request.action === 'updateState') {
    chrome.storage.local.set({
      messages: request.messages,
      selectedTabs: request.selectedTabs
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'checkOllamaStatus') {
    checkOllamaStatus()
      .then(status => {
        sendResponse({ success: true, status });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function processTask(taskId, request) {
  try {
    let prompt;

    // Build prompt based on task type
    if (request.taskType === 'summarize') {
      prompt = `Please provide a concise summary of the following ${request.source === 'selection' ? 'selected text' : 'content'}. Focus on the key points and main ideas:

${request.content}`;
    } else if (request.taskType === 'question') {
      prompt = `You are a helpful AI assistant. You have access to the ${request.source === 'selection' ? 'selected text' : 'webpage content'}.

${request.source === 'selection' ? 'Selected text' : 'Webpage content'}:
${request.content}

Based on the content, please answer this question: "${request.question}"`;
    } else {
      throw new Error('Unknown task type');
    }

    // Call Ollama API
    let response;
    try {
      response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || 'llama2',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 500
          }
        })
      });
    } catch (fetchError) {
      throw new Error(`Network error: ${fetchError.message}`);
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Model not found. Please make sure Ollama is running and the model is downloaded.');
      }
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.response) {
      throw new Error('Empty response from Ollama');
    }

    return data.response.trim();
  } catch (error) {
    throw new Error(`Failed to process task: ${error.message}`);
  }
}

async function checkOllamaStatus() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error('Ollama API error');
    }
    const data = await response.json();
    return {
      running: true,
      models: data.models || []
    };
  } catch (error) {
    throw new Error('Cannot connect to Ollama');
  }
}