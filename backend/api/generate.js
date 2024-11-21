import { rateLimit } from '../middleware/rateLimit';
import { anthropic } from '../lib/anthropic';

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await rateLimit(req, res);
    const { emailContent, senderName, recipientName } = req.body;

    if (!emailContent || !senderName || !recipientName) {
      return res.status(400).json({
        error: 'emailContent, senderName, and recipientName are required',
      });
    }

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
            3. In the subsequent paragraphs, address each point or question raised in the original email.
            4. If any action items or next steps were mentioned, acknowledge them and provide your plan.
            5. Maintain a professional and polite tone throughout the email.
            6. Conclude the email with a courteous closing statement and your name. Your name for the signature is ${recipientName}.
            7. Keep the overall length concise but comprehensive.

            Write your draft response inside <emailResponse> tags.
          `,
        },
      ],
    });

    return res.status(200).json({ generatedResponse: msg.content[0].text });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export default handler;