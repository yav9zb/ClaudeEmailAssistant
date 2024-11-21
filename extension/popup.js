// popup.js for settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  chrome.storage.sync.set({ claudeApiKey: apiKey }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
});

// Load saved settings
chrome.storage.sync.get(['claudeApiKey'], (result) => {
  if (result.claudeApiKey) {
    document.getElementById('apiKey').value = result.claudeApiKey;
  }
});

async function generateResponse(emailContent, senderName, recipientName) {
  const apiKey = await chrome.storage.sync.get(['claudeApiKey']);
  if (!apiKey.claudeApiKey) {
    throw new Error('API key not configured. Please set it in extension settings.');
  }

  const response = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.claudeApiKey}`, // Added auth header if necessary
    },
    body: JSON.stringify({
      emailContent,
      senderName,
      recipientName,
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Failed to generate response: ${errorDetails}`);
  }

  return response.json();
}
