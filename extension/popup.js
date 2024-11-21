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

async function generateResponse(emailContent) {
  const response = await fetch('https://your-backend.com/generate-response', {
    method: 'POST',
    body: JSON.stringify({ email: emailContent })
  });
  return response.json();
}