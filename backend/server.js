require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const timeout = require("connect-timeout");
const Anthropic = require("@anthropic-ai/sdk"); // Import Anthropic SDK

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(timeout("30s"));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}

// Validate environment variables
if (!process.env.CLAUDE_API_KEY) {
  console.error("CLAUDE_API_KEY is required");
  process.exit(1);
}

// Initialize Anthropic SDK
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY, // Uses API key from environment variable
});

app.get("/", (req, res) => {
  res.send("Claude Email Assistant is running");
});

app.post("/api/generate", async (req, res) => {
  try {
    const { emailContent, senderName, recipientName, userPrompt } = req.body;

    if (!emailContent || !senderName || !recipientName) {
      return res.status(400).json({
        error: "emailContent, senderName, and recipientName are required",
      });
    }

    // Construct the base prompt
    let basePrompt = `You are a professional email assistant tasked with drafting courteous and appropriate responses to received emails. Your goal is to create a comprehensive yet concise reply that addresses all points raised in the original email while maintaining a professional tone.


        Here is the original email you are responding to:

<originalEmail>
${emailContent}
</originalEmail>

The sender's name is:
<senderName>
${senderName}
</senderName>

Your name (for signature purposes) is:
<recipientName>
${recipientName}
</recipientName>`;

    // Add user prompt if provided
    if (userPrompt) {
      basePrompt += `\n\nAdditional instructions from the user:\n${userPrompt}\n`;
    }

    basePrompt += `\nBefore drafting the email, please analyze the original email and plan your response inside <email_analysis> tags. In your analysis, consider the following:

1. Identify the main topic of the email.
2. List any questions or points that need to be addressed.
3. Note any action items or next steps mentioned.
4. Determine the appropriate level of formality based on the original email's tone.
5. Identify the tone and emotional context of the original email (e.g., urgent, friendly, concerned).
6. Double-check any specific dates, times, or other factual information mentioned in the original email to ensure accurate reflection in your response.
7. For each point or question, brainstorm a potential response.

After your analysis, draft a response that follows these guidelines:

1. Begin by addressing the sender by name.
2. In the first paragraph, acknowledge receipt of their email and briefly mention the main topic.
3. Address each point or question raised in the original email, providing clear and concise responses.
4. Acknowledge any action items or next steps, providing your plan to address them or requesting necessary clarification.
5. Maintain a professional and polite tone throughout, matching the formality level of the original email.
6. Conclude with a courteous closing statement and your name (as provided in the <recipientName> tags).
7. Ensure the overall length is concise but comprehensive, aiming for clarity and brevity.

Present your email response within <emailResponse> tags. The content within these tags should solely be the text of the email response, without any additional explanations or comments.

Remember to carefully review your response to ensure all points are addressed accurately and that any mentioned dates, times, or other specific information from the original email are correctly reflected in your reply.`;

    // Create the message
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: basePrompt,
        },
      ],
    });

    // Extract both analysis and response
    const response = msg.content[0].text;

    // Extract email analysis
    const analysisMatch = response.match(
      /<email_analysis>([\s\S]*?)<\/email_analysis>/
    );
    const analysis = analysisMatch ? analysisMatch[1].trim() : null;

    // Extract email response
    const emailResponseMatch = response.match(
      /<emailResponse>([\s\S]*?)<\/emailResponse>/
    );
    const generatedResponse = emailResponseMatch
      ? emailResponseMatch[1].trim()
      : response;

    // Send both analysis and response back to client
    res.json({
      generatedResponse,
      analysis,
      fullResponse: response, // For debugging
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
