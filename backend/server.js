require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const timeout = require('connect-timeout');
const Anthropic = require('@anthropic-ai/sdk'); // Import Anthropic SDK

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});

const timeout = require('connect-timeout');

app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(timeout('30s'));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}

// Validate environment variables
if (!process.env.CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY is required');
    process.exit(1);
}

// Initialize Anthropic SDK
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY, // Uses API key from environment variable
});

app.get('/', (req, res) => {
    res.send('Gmail Assistant API is running');
});

app.post('/api/generate', async (req, res) => {
    try {
        const { emailContent, senderName, recipientName } = req.body;

        if (!emailContent || !senderName || !recipientName) {
            return res.status(400).json({
                error: 'emailContent, senderName, and recipientName are required',
            });
        }

        // Prepare the message
        const msg = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            temperature: 0,
            messages: [
                {
                    role: 'user',
                    content: `
            You are tasked with drafting a professional email response. Here is the original email you are responding to:
            
            <originalEmail>
            ${emailContent}
            </originalEmail>

            Your task is to draft a courteous and appropriate response to this email. Follow these guidelines:

            1. Begin by addressing the sender by name. The sender's name is ${senderName}.

            2. In the first paragraph, acknowledge receipt of their email and briefly mention the main topic they addressed.

            3. In the subsequent paragraphs, address each point or question raised in the original email. Ensure you provide clear and concise responses to any inquiries.

            4. If any action items or next steps were mentioned in the original email, acknowledge them and provide your plan to address them or request any necessary clarification.

            5. Maintain a professional and polite tone throughout the email. The level of formality should match that of the original email.

            6. Conclude the email with a courteous closing statement and your name. Your name for the signature is ${recipientName}.

            7. Keep the overall length of the email concise but comprehensive. Aim for clarity and brevity.

            Write your draft response inside <emailResponse> tags. Do not include any explanations or comments outside of these tags; the content within the tags should be solely the text of the email response.
          `,
                },
            ],
        });

        // Send response back to client
        res.json({ generatedResponse: msg.content[0].text });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
