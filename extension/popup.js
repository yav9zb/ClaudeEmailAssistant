// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const generateButton = document.getElementById('generateResponse');
  const statusDiv = document.getElementById('status');

  generateButton.addEventListener('click', async () => {
    try {
      generateButton.disabled = true;
      statusDiv.textContent = 'Generating response...';

      // Send message to content script to get email content
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getEmailContent' });

      if (!response.success) {
        throw new Error('Could not get email content');
      }

      // Call Claude API
      const apiResponse = await fetch('https://claude-email-assistant.vercel.app/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailContent: response.emailContent,
          senderName: response.senderName,
          recipientName: response.recipientName
        })
      });

      if (!apiResponse.ok) {
        throw new Error('API request failed');
      }

      const data = await apiResponse.json();
      
      // Send response back to content script to insert into Gmail
      await chrome.tabs.sendMessage(tab.id, {
        action: 'insertResponse',
        response: data.generatedResponse
      });

      statusDiv.textContent = 'Response generated successfully!';
    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = 'Error: ' + error.message;
    } finally {
      generateButton.disabled = false;
    }
  });
});