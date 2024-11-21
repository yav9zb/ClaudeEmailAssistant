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
    // Find compose area after clicking reply
    const replyButton = document.querySelector('div[role="button"][data-tooltip="Reply"]');
    replyButton.click();

    // Wait for compose area to appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    const composeArea = document.querySelector('div[role="textbox"][aria-label^="Message Body"]');
    if (!composeArea) {
      throw new Error('Could not find compose area');
    }

    const { subject, emailBody, senderName, recipientName } = await getEmailContent();

    const response = await generateResponse(emailBody, senderName, recipientName);
    composeArea.innerHTML = formatResponse(response);
  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'Failed to generate response');
  }
}

async function generateResponse(emailBody, senderName, recipientName) {
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
        recipientName
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