// content.js
let buttonInjected = false;

function injectReplyButton() {
  // Target the Gmail reply area more specifically
  const replyContainer = document.querySelector('div[role="button"][data-tooltip="Reply"]')?.parentElement;
  if (!replyContainer || buttonInjected) return;

  const assistButton = document.createElement('div');
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

async function handleClick() {
  try {
    // Find compose area after clicking reply
    const replyButton = document.querySelector('div[role="button"][data-tooltip="Reply"]');
    replyButton.click();
    
    // Wait for compose area to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const composeArea = document.querySelector('div[role="textbox"][aria-label="Message Body"]');
    if (!composeArea) {
      throw new Error('Could not find compose area');
    }

    const { subject, emailBody } = await getEmailContent();
    const response = await generateResponse(subject, emailBody);
    composeArea.innerHTML = formatResponse(response);
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to generate response');
  }
}

async function getEmailContent() {
  try {
    const emailBody = document.querySelector('.a3s.aiL')?.innerText;
    const subject = document.querySelector('h2.hP')?.innerText;
    if (!emailBody || !subject) throw new Error('Email content not found');
    return { subject, emailBody };
  } catch (error) {
    console.error('Error getting email content:', error);
    throw error;
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff4444; color: white; padding: 12px 24px; border-radius: 4px; z-index: 9999;';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

function formatResponse(response) {
  // Add basic formatting
  return response.replace(/\n/g, '<br>');
}

async function generateResponse(subject, emailBody) {
  const apiKey = await chrome.storage.sync.get(['claudeApiKey']);
  if (!apiKey.claudeApiKey) throw new Error('API key not found');

  const response = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailContent: `Subject: ${subject}\n\nEmail body:\n${emailBody}`
    })
  });

  if (!response.ok) throw new Error('Failed to generate response');
  const data = await response.json();
  return data.content[0].text;
}

// Optimized observer with debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const observer = new MutationObserver(debounce(() => {
  if (!buttonInjected) injectReplyButton();
}, 250));

// Check for button injection every 2 seconds until successful
const checkInterval = setInterval(() => {
  if (document.querySelector('div[role="button"][data-tooltip="Reply"]')) {
    injectReplyButton();
    if (buttonInjected) clearInterval(checkInterval);
  }
}, 2000);