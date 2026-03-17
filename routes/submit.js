const express = require('express');
const { createTicket, associateTicketToDeal, createNote } = require('../hubspot');

const router = express.Router();

// Build plain-text ticket content from brief fields
function buildTicketContent(f) {
  return [
    `Design Description:\n${f.designDescription}`,
    f.referenceInspiration ? `Reference / Inspiration:\n${f.referenceInspiration}` : null,
    f.pantoneColors       ? `Colors / Pantones:\n${f.pantoneColors}` : null,
    f.fontNames           ? `Preferred Fonts: ${f.fontNames}` : null,
    f.designFileUrls.length ? `Design Files:\n${f.designFileUrls.join('\n')}` : null,
    f.fontFileUrls.length   ? `Font Files:\n${f.fontFileUrls.join('\n')}` : null,
    f.fileDescription     ? `File Notes:\n${f.fileDescription}` : null,
    `Has Barcode / QR: ${f.hasBarcode ? 'Yes' : 'No'}`,
    f.hasBarcode && f.barcodeValue ? `Barcode / QR Value: ${f.barcodeValue}` : null,
    f.additionalNotes     ? `Additional Notes:\n${f.additionalNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Build HTML note body for deal + ticket timelines
function buildNoteHtml(f) {
  const links = (urls) =>
    urls.map((u) => `<a href="${u}">${decodeURIComponent(u.split('/').pop())}</a>`).join('<br>');

  return `
<h2>Design Brief Submission</h2>

<h3>Design Vision</h3>
<p><strong>Description:</strong><br>${f.designDescription}</p>
${f.referenceInspiration ? `<p><strong>Reference / Inspiration:</strong><br>${f.referenceInspiration}</p>` : ''}

<h3>Colors</h3>
<p><strong>Pantone / Color Values:</strong><br>${f.pantoneColors || '—'}</p>

<h3>Typography</h3>
<p><strong>Preferred Font(s):</strong> ${f.fontNames || '—'}</p>
${f.fontFileUrls.length ? `<p><strong>Font Files:</strong><br>${links(f.fontFileUrls)}</p>` : ''}

<h3>Design Files</h3>
${f.designFileUrls.length ? `<p>${links(f.designFileUrls)}</p>` : '<p>No design files uploaded.</p>'}
${f.fileDescription ? `<p><strong>File Notes:</strong><br>${f.fileDescription}</p>` : ''}

<h3>Barcodes &amp; QR Codes</h3>
<p><strong>Has Barcode / QR Code:</strong> ${f.hasBarcode ? 'Yes' : 'No'}</p>
${f.hasBarcode && f.barcodeValue ? `<p><strong>Barcode / QR Value:</strong> ${f.barcodeValue}</p>` : ''}

${f.additionalNotes ? `<h3>Additional Notes</h3><p>${f.additionalNotes}</p>` : ''}
  `.trim();
}

// Normalize an incoming value to an array of strings
function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val) return [val];
  return [];
}

// POST /submit
// Body (JSON): dealId + all brief fields + pre-uploaded file URL arrays
router.post('/', async (req, res) => {
  try {
    const {
      dealId,
      designDescription,
      referenceInspiration,
      pantoneColors,
      fontNames,
      fontFileUrls,
      designFileUrls,
      fileDescription,
      hasBarcode,
      barcodeValue,
      additionalNotes,
    } = req.body;

    if (!dealId)           return res.status(400).json({ error: 'dealId is required.' });
    if (!designDescription) return res.status(400).json({ error: 'Design description is required.' });

    const f = {
      designDescription,
      referenceInspiration: referenceInspiration || '',
      pantoneColors:        pantoneColors || '',
      fontNames:            fontNames || '',
      fontFileUrls:         toArray(fontFileUrls),
      designFileUrls:       toArray(designFileUrls),
      fileDescription:      fileDescription || '',
      hasBarcode:           hasBarcode === true || hasBarcode === 'true' || hasBarcode === 'yes',
      barcodeValue:         barcodeValue || '',
      additionalNotes:      additionalNotes || '',
    };

    // 1. Create ticket
    const ticketId = await createTicket({
      subject: 'Design Brief Submission',
      content: buildTicketContent(f),
    });

    // 2. Link ticket → deal
    await associateTicketToDeal(ticketId, dealId);

    // 3. Post formatted note on both deal + ticket timelines
    await createNote(dealId, ticketId, buildNoteHtml(f));

    res.json({ success: true, ticketId });
  } catch (err) {
    console.error('Submit error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
});

module.exports = router;
