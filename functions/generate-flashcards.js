const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = event.headers['x-api-key'];
  if (!apiKey) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'API key is required.' }) 
    };
  }

  const configuration = new Configuration({
    apiKey: apiKey,
  });

  const openai = new OpenAIApi(configuration);

  const { text } = JSON.parse(event.body);

  if (!text || !text.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No text provided.' }) };
  }

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{
        role: 'system',
        content: 'You are a helpful assistant that creates flashcards from text. Format each flashcard with "Q:" for questions and "A:" for answers, separated by newlines.'
      }, {
        role: 'user',
        content: `Create 3-30 (depending on the length of the text, and content) flashcards from the following text. Format each flashcard as:

Q: (question here)
A: (answer here)

Use two newlines between cards.

Text:
${text}`
      }],
      max_tokens: 16384,
      temperature: 0.5,
    });

    const content = response.data.choices[0].message.content.trim();
    console.log('OpenAI Response:', content);

    const flashcards = parseFlashcards(content);
    
    if (flashcards.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'No valid flashcards could be parsed from the response.',
          rawContent: content 
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ flashcards }),
    };
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate flashcards.',
        details: error.response?.data?.error?.message || error.message
      }),
    };
  }
};

function parseFlashcards(content) {
  const flashcards = [];
  
  // First try the Q: A: format
  const cards = content.split('\n\n');
  for (const card of cards) {
    // Try multiple possible formats
    const questionMatch = card.match(/(?:Q:|Question:)\s*(.+?)(?=\n|$)/i);
    const answerMatch = card.match(/(?:A:|Answer:)\s*(.+?)(?=\n|$)/i);

    if (questionMatch && answerMatch) {
      flashcards.push({
        question: questionMatch[1].trim(),
        answer: answerMatch[1].trim(),
      });
    }
  }

  // If no flashcards found, try number format (1., 2., etc)
  if (flashcards.length === 0) {
    const numberFormat = content.split(/\d+\.\s+/).filter(Boolean);
    for (const card of numberFormat) {
      const [question, answer] = card.split(/\n|:\\s+/);
      if (question && answer) {
        flashcards.push({
          question: question.trim(),
          answer: answer.trim(),
        });
      }
    }
  }

  // Add console logging to help debug
  console.log('Raw content from OpenAI:', content);
  console.log('Parsed flashcards:', flashcards);

  return flashcards;
} 