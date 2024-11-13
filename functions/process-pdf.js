const pdfParse = require('pdf-parse');
const multiparty = require('multiparty');

exports.handler = (event, context) => {
  if (event.httpMethod !== 'POST') {
    return Promise.resolve({ statusCode: 405, body: 'Method Not Allowed' });
  }

  return new Promise((resolve) => {
    const form = new multiparty.Form();

    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        return resolve({ statusCode: 500, body: JSON.stringify({ error: 'Form parsing error.' }) });
      }

      try {
        const file = files.file[0];
        const buffer = Buffer.from(file.buffer, 'base64');
        const data = await pdfParse(buffer);
        const text = data.text;

        return resolve({
          statusCode: 200,
          body: JSON.stringify({ text }),
        });
      } catch (error) {
        console.error('PDF processing error:', error);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to process PDF.' }),
        });
      }
    });
  });
}; 