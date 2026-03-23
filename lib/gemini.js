const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generate a concept image using Gemini Imagen 3.
 * Returns a Buffer containing the JPEG image data.
 * @param {object} brief - { cupType, brandName, description, colors, wrapStyle }
 * @returns {Promise<Buffer>}
 */
async function generateMockupImage(brief) {
  const prompt = buildPrompt(brief);

  const response = await ai.models.generateImages({
    model:  'imagen-3.0-generate-002',
    prompt,
    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
  });

  const b64 = response.generatedImages[0].image.imageBytes;
  return Buffer.from(b64, 'base64');
}

/**
 * Build a Gemini image generation prompt from the brief fields.
 * @param {object} brief
 * @returns {string}
 */
function buildPrompt(brief) {
  return [
    `Create a concept design mockup for a custom printed ${brief.cupType || 'disposable cup'}.`,
    brief.brandName   ? `Brand name: ${brief.brandName}.`                          : '',
    brief.description ? `Design brief: ${brief.description}`                       : '',
    brief.colors      ? `Brand colors: ${brief.colors}.`                           : '',
    brief.wrapStyle   ? `Print coverage: ${brief.wrapStyle.replace(/_/g, ' ')}.`   : '',
    'Style: modern, clean, professional food & beverage branding.',
    'Present as a photorealistic product render on a clean neutral background.',
  ].filter(Boolean).join(' ');
}

module.exports = { generateMockupImage };
