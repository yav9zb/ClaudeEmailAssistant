import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export default async function handler(req) {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Handle GET request for root path
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'API is running' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { emailContent, senderName, recipientName } = await req.json();

    if (!emailContent || !senderName || !recipientName) {
      return new Response(
        JSON.stringify({
          error: 'emailContent, senderName, and recipientName are required',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
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

    return new Response(
      JSON.stringify({ generatedResponse: msg.content[0].text }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}