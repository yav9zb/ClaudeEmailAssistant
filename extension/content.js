// content.js
let buttonInjected = false;

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

function injectReplyButton() {
  if (buttonInjected) return;
  
  const replyContainer = document.querySelector('.ams.bkH');
  if (!replyContainer) return;

  const assistButton = document.createElement('div');
  assistButton.innerHTML = `
    <div class="T-I J-J5-Ji aoO T-I-atl L3" 
         style="background-color: #1a73e8; margin-right: 8px;">
      <span class="button-text">Claude Assistant</span>
      <div class="loading-spinner" style="display: none;"></div>
    </div>`;
  
  assistButton.onclick = handleClick;
  replyContainer.prepend(assistButton);
  buttonInjected = true;
}

async function handleClick() {
  const button = this.querySelector('.T-I');
  const spinner = this.querySelector('.loading-spinner');
  const buttonText = this.querySelector('.button-text');
  
  try {
    button.style.opacity = '0.7';
    spinner.style.display = 'block';
    buttonText.textContent = 'Generating...';
    
    const { subject, emailBody } = await getEmailContent();
    const response = await generateResponse(subject, emailBody);
    
    const replyBox = document.querySelector('[role="textbox"]');
    if (replyBox) replyBox.innerHTML = formatResponse(response);
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to generate response');
  } finally {
    button.style.opacity = '1';
    spinner.style.display = 'none';
    buttonText.textContent = 'Claude Assistant';
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
const observer = new MutationObserver(_.debounce(() => {
  if (!buttonInjected) injectReplyButton();
}, 250));

observer.observe(document.body, {
  childList: true,
  subtree: true
});