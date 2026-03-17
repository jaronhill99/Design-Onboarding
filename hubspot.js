const axios = require('axios');
const FormData = require('form-data');

// Shared axios instance — all requests pre-authorized
const hs = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
  },
});

/**
 * Upload a file to HubSpot File Manager.
 * Files are PUBLIC_NOT_INDEXABLE: accessible via URL, not searchable.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} mimetype
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadFile(buffer, filename, mimetype) {
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimetype });
  form.append('options', JSON.stringify({ access: 'PUBLIC_NOT_INDEXABLE' }));
  form.append('folderPath', '/design-briefs');

  const { data } = await hs.post('/files/v3/files', form, {
    headers: form.getHeaders(),
  });

  return data.url;
}

/**
 * Create a HubSpot ticket with design brief properties.
 * Pipeline/stage are configured via .env.
 * @param {object} properties - CRM ticket properties
 * @returns {Promise<string>} ticketId
 */
async function createTicket(properties) {
  const { data } = await hs.post('/crm/v3/objects/tickets', {
    properties: {
      hs_pipeline: process.env.HUBSPOT_PIPELINE_ID || '0',
      hs_pipeline_stage: process.env.HUBSPOT_PIPELINE_STAGE_ID || '1',
      ...properties,
    },
  });

  return data.id;
}

/**
 * Associate a ticket to a deal (CRM v4 associations).
 * @param {string} ticketId
 * @param {string} dealId
 */
async function associateTicketToDeal(ticketId, dealId) {
  await hs.put(
    `/crm/v4/objects/tickets/${ticketId}/associations/deals/${dealId}`,
    [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 26 }]
  );
}

/**
 * Create a formatted note and associate it to both a deal AND a ticket.
 * This ensures the full brief summary appears on both object timelines.
 * @param {string} dealId
 * @param {string} ticketId
 * @param {string} bodyHtml - HTML-formatted note content
 * @returns {Promise<string>} noteId
 */
async function createNote(dealId, ticketId, bodyHtml) {
  const { data } = await hs.post('/crm/v3/objects/notes', {
    properties: {
      hs_note_body: bodyHtml,
      hs_timestamp: Date.now().toString(),
    },
    associations: [
      {
        to: { id: dealId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }],
      },
      {
        to: { id: ticketId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 216 }],
      },
    ],
  });

  return data.id;
}

module.exports = { uploadFile, createTicket, associateTicketToDeal, createNote };
