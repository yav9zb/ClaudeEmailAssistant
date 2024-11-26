let buttonInjected = false;

function injectReplyButton() {
  const replyContainer = document.querySelector('div[role="listitem"] div[data-tooltip="Reply"]')?.parentElement;
  if (!replyContainer || replyContainer.querySelector('.Claude-Assistant-Button')) return;

  const assistButton = document.createElement('div');
  assistButton.classList.add('Claude-Assistant-Button');
  assistButton.innerHTML = `
    <div role="button" class="T-I J-J5-Ji aoO T-I-atl" 
         style="background: #1a73e8; color: white; margin-right: 8px;">
      Claude Assistant
    </div>`;

  assistButton.onclick = handleClick;
  replyContainer.prepend(assistButton);
  buttonInjected = true;
  console.log('Button injected successfully');
}

function createPromptOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'claude-prompt-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  const promptBox = document.createElement('div');
  promptBox.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 500px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  `;

  promptBox.innerHTML = `
    <h3 style="margin: 0 0 15px 0;">Quick Instructions for Claude</h3>
    <textarea id="claude-prompt" style="width: 100%; height: 100px; margin-bottom: 15px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
      placeholder="Enter your brief instructions for the email response (e.g., 'Polite decline to the meeting invitation' or 'Accept and ask to move it to next week')"></textarea>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="claude-cancel" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; background: #f1f3f4;">Cancel</button>
      <button id="claude-generate" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; background: #1a73e8; color: white;">Generate Response</button>
    </div>
  `;

  overlay.appendChild(promptBox);
  return overlay;
}

async function getEmailContent() {
  try {
    // Find the active email container
    const emailContainers = document.querySelectorAll('div[role="listitem"]');

    // Get the last email in the thread
    const lastEmail = Array.from(emailContainers).pop();
    if (!lastEmail) throw new Error('Active email not found');

    // Extract email components
    const emailBody =
      lastEmail.querySelector('.a3s.aiL')?.innerText ||
      lastEmail.querySelector('div[data-message-id] div[dir="ltr"]')?.innerText ||
      lastEmail.querySelector('div[role="textbox"]')?.innerText;

    // Find subject line - try multiple possible locations
    const subject =
      document.querySelector('h2[data-thread-title]')?.innerText ||
      document.querySelector('.hP')?.innerText;

    // Find sender name with fallbacks
    const senderElement = lastEmail.querySelector('.gD');
    const senderName =
      senderElement?.getAttribute('name') ||
      senderElement?.innerText ||
      lastEmail.querySelector('.ga')?.innerText;

    // Get recipient name with fallbacks
    const recipientName =
      document.querySelector('.gb_A.gb_La')?.getAttribute('aria-label')?.split(' ')[0] ||
      document.querySelector('.gb_d.gb_Da.gb_g')?.innerText?.split(' ')[0] ||
      'User';

    // Detailed logging for debugging
    console.log('Found elements:', {
      emailBody: emailBody?.slice(0, 50),
      subject,
      senderName,
      recipientName
    });

    // Verify required fields
    if (!emailBody) throw new Error('Could not extract email body');
    if (!subject) throw new Error('Could not find subject line');
    if (!senderName) throw new Error('Could not find sender name');

    console.log('Successfully extracted all email details');

    return { subject, emailBody, senderName, recipientName };
  } catch (error) {
    console.error('Error getting email details:', error);
    throw error;
  }
}

async function handleClick() {
  try {
    // Create and show the prompt overlay
    const overlay = createPromptOverlay();
    document.body.appendChild(overlay);

    // Set up event listeners
    const cancelButton = document.getElementById('claude-cancel');
    const generateButton = document.getElementById('claude-generate');
    const promptInput = document.getElementById('claude-prompt');

    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
    };

    generateButton.onclick = async () => {
      const userPrompt = promptInput.value.trim();
      if (!userPrompt) {
        alert('Please enter instructions for the response');
        return;
      }

      // Remove overlay
      document.body.removeChild(overlay);

      // Find compose area after clicking reply
      const replyButton = document.querySelector('div[role="button"][data-tooltip="Reply"]');
      replyButton.click();

      // Wait for compose area to appear
      await new Promise(resolve => setTimeout(resolve, 1000));

      const composeArea = document.querySelector('div[role="textbox"][aria-label^="Message Body"]');
      if (!composeArea) {
        throw new Error('Could not find compose area');
      }

      // Show loading indicator
      composeArea.innerHTML = '<div style="color: #666;">Generating response...</div>';

      const { subject, emailBody, senderName, recipientName } = await getEmailContent();

      const response = await generateResponse(emailBody, senderName, recipientName, userPrompt);
      composeArea.innerHTML = formatResponse(response);
    };

  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'Failed to generate response');
  }
}

async function generateResponse(emailBody, senderName, recipientName, userPrompt) {
  try {
    const storage = await chrome.storage.sync.get(['claudeApiKey']);
    if (!storage.claudeApiKey) {
      throw new Error('Claude API key not configured. Please set it in extension settings.');
    }

    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.claudeApiKey}`
      },
      body: JSON.stringify({
        emailContent: emailBody,
        senderName,
        recipientName,
        userPrompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${errorText}`);
    }

    const data = await response.json();
    return data.generatedResponse;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

function formatResponse(response) {
  return response.replace(/\n/g, '<br>');
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d32f2f;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Optimized observer setup
const observer = new MutationObserver((() => {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(injectReplyButton, 250);
  };
})());

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial check for button injection
const checkInterval = setInterval(() => {
  if (document.querySelector('div[role="button"][data-tooltip="Reply"]')) {
    injectReplyButton();
    if (buttonInjected) clearInterval(checkInterval);
  }
}, 1000);