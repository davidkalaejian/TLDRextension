// Simple content extractor
(() => {
  console.log('Content script loaded'); // Debug log

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      try {
        // Get the main content
        const content = extractContent();
        sendResponse({ 
          success: true, 
          content: content
        });
      } catch (error) {
        console.error('Content extraction error:', error); // Debug log
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      }
    }
    return true; // Keep the message channel open for async response
  });

  function extractContent() {
    console.log('Extracting content'); // Debug log
    
    // Clone the body to avoid modifying the actual page
    const clonedBody = document.body.cloneNode(true);
    
    // Remove unwanted elements from clone
    const unwanted = clonedBody.querySelectorAll('script, style, noscript, iframe, img, svg, nav, header:not(article header), footer:not(article footer), aside');
    unwanted.forEach(el => el.remove());

    // Try to find the main content
    let content = '';
    
    // 1. Try article content first
    const article = clonedBody.querySelector('article');
    if (article) {
      content = article.textContent;
      console.log('Found article content'); // Debug log
    }

    // 2. Try main content
    if (!content || content.length < 100) {
      const main = clonedBody.querySelector('main');
      if (main) {
        content = main.textContent;
        console.log('Found main content'); // Debug log
      }
    }

    // 3. Try common content selectors
    if (!content || content.length < 100) {
      const selectors = [
        '.post-content',
        '.article-content',
        '.entry-content',
        '.content',
        '#content',
        '.main-content'
      ];

      for (const selector of selectors) {
        const element = clonedBody.querySelector(selector);
        if (element) {
          const text = element.textContent;
          if (text && text.length > content.length) {
            content = text;
            console.log('Found content using selector:', selector); // Debug log
          }
        }
      }
    }

    // 4. Fallback to body content
    if (!content || content.length < 100) {
      content = clonedBody.textContent;
      console.log('Using body content as fallback'); // Debug log
    }

    // Clean the content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\t+/g, ' ')
      .trim();

    if (!content || content.length < 50) {
      throw new Error('No readable content found on this page');
    }

    console.log('Content extracted successfully'); // Debug log
    return content;
  }
})();