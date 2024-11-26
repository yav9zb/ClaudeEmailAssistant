const updatedButtonStyles = `
.claude-assistant-button {
  margin-right: 8px;
}

.claude-assistant-button button {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.claude-assistant-button button:hover {
  background: #1557b0;
}

.claude-assistant-button .icon {
  width: 16px;
  height: 16px;
}

.claude-prompt-overlay {
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
  backdrop-filter: blur(4px);
}

.prompt-container {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 500px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.prompt-header {
  margin: 0 0 20px 0;
  color: #202124;
  font-size: 18px;
  font-weight: 600;
}

.prompt-textarea {
  width: 100%;
  height: 120px;
  padding: 12px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  margin-bottom: 20px;
  font-family: inherit;
}

.prompt-textarea:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26,115,232,0.2);
}

.prompt-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.prompt-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.prompt-button.secondary {
  background: #f1f3f4;
  color: #5f6368;
}

.prompt-button.secondary:hover {
  background: #e8eaed;
}

.prompt-button.primary {
  background: #1a73e8;
  color: white;
}

.prompt-button.primary:hover {
  background: #1557b0;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5f6368;
  font-size: 14px;
  padding: 12px;
}

.loading-indicator .spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #dadce0;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #d93025;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
`;

// Updated function to create prompt overlay with new design
function createPromptOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "claude-prompt-overlay";

  const container = document.createElement("div");
  container.className = "prompt-container";

  container.innerHTML = `
    <h3 class="prompt-header">Quick Instructions for Claude</h3>
    <textarea 
      id="claude-prompt" 
      class="prompt-textarea"
      placeholder="Enter your instructions for the email response (e.g., 'Polite decline to the meeting invitation' or 'Accept and ask to move it to next week')"></textarea>
    <div class="prompt-buttons">
      <button id="claude-cancel" class="prompt-button secondary">Cancel</button>
      <button id="claude-generate" class="prompt-button primary">
        Generate Response
      </button>
    </div>
  `;

  overlay.appendChild(container);
  return overlay;
}

// Updated loading indicator
function showLoadingState(composeArea) {
  composeArea.innerHTML = `
    <div class="loading-indicator">
      <div class="spinner"></div>
      <span>Generating your response...</span>
    </div>
  `;
}

// Updated error toast
function showError(message) {
  const toast = document.createElement("div");
  toast.className = "error-toast";
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-in forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

let buttonInjected = false;

function injectReplyButton() {
  const replyContainer = document.querySelector(
    'div[role="listitem"] div[data-tooltip="Reply"]'
  )?.parentElement;
  if (
    !replyContainer ||
    replyContainer.querySelector(".Claude-Assistant-Button")
  )
    return;

  const assistButton = document.createElement("div");
  assistButton.classList.add("Claude-Assistant-Button");
  assistButton.innerHTML = `
  <button>
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
  Claude Assistant
</button>
`;

  assistButton.onclick = handleClick;
  replyContainer.prepend(assistButton);
  buttonInjected = true;
  console.log("Button injected successfully");
}

async function getEmailContent() {
  try {
    // Find the active email container
    const emailContainers = document.querySelectorAll('div[role="listitem"]');

    // Get the last email in the thread
    const lastEmail = Array.from(emailContainers).pop();
    if (!lastEmail) throw new Error("Active email not found");

    // Extract email components
    const emailBody =
      lastEmail.querySelector(".a3s.aiL")?.innerText ||
      lastEmail.querySelector('div[data-message-id] div[dir="ltr"]')
        ?.innerText ||
      lastEmail.querySelector('div[role="textbox"]')?.innerText;

    // Find subject line - try multiple possible locations
    const subject =
      document.querySelector("h2[data-thread-title]")?.innerText ||
      document.querySelector(".hP")?.innerText;

    // Find sender name with fallbacks
    const senderElement = lastEmail.querySelector(".gD");
    const senderName =
      senderElement?.getAttribute("name") ||
      senderElement?.innerText ||
      lastEmail.querySelector(".ga")?.innerText;

    // Get recipient name with fallbacks
    const recipientName =
      document
        .querySelector(".gb_A.gb_La")
        ?.getAttribute("aria-label")
        ?.split(" ")[0] ||
      document.querySelector(".gb_d.gb_Da.gb_g")?.innerText?.split(" ")[0] ||
      "User";

    // Detailed logging for debugging
    console.log("Found elements:", {
      emailBody: emailBody?.slice(0, 50),
      subject,
      senderName,
      recipientName,
    });

    // Verify required fields
    if (!emailBody) throw new Error("Could not extract email body");
    if (!subject) throw new Error("Could not find subject line");
    if (!senderName) throw new Error("Could not find sender name");

    console.log("Successfully extracted all email details");

    return { subject, emailBody, senderName, recipientName };
  } catch (error) {
    console.error("Error getting email details:", error);
    throw error;
  }
}

async function handleClick() {
  try {
    // Find compose area after clicking reply
    const replyButton = document.querySelector(
      'div[role="button"][data-tooltip="Reply"]'
    );
    replyButton.click();

    // Wait for compose area to appear
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const composeArea = document.querySelector(
      'div[role="textbox"][aria-label^="Message Body"]'
    );
    if (!composeArea) {
      throw new Error("Could not find compose area");
    }

    const { subject, emailBody, senderName, recipientName } =
      await getEmailContent();

    const response = await generateResponse(
      emailBody,
      senderName,
      recipientName
    );
    composeArea.innerHTML = formatResponse(response);
  } catch (error) {
    console.error("Error:", error);
    showError(error.message || "Failed to generate response");
  }
}

async function generateResponse(emailBody, senderName, recipientName) {
  try {
    const storage = await chrome.storage.sync.get(["claudeApiKey"]);
    if (!storage.claudeApiKey) {
      throw new Error(
        "Claude API key not configured. Please set it in extension settings."
      );
    }

    const response = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${storage.claudeApiKey}`,
      },
      body: JSON.stringify({
        emailContent: emailBody,
        senderName,
        recipientName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${errorText}`);
    }

    const data = await response.json();
    return data.generatedResponse;
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
}

function formatResponse(response) {
  return response.replace(/\n/g, "<br>");
}

function showError(message) {
  const errorDiv = document.createElement("div");
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
const observer = new MutationObserver(
  (() => {
    let timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(injectReplyButton, 250);
    };
  })()
);

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial check for button injection
const checkInterval = setInterval(() => {
  if (document.querySelector('div[role="button"][data-tooltip="Reply"]')) {
    injectReplyButton();
    if (buttonInjected) clearInterval(checkInterval);
  }
}, 1000);
