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
 * Fetch the first ticket already associated to a deal.
 * Tickets are created automatically when a deal enters the Design Start stage.
 * @param {string} dealId
 * @returns {Promise<string>} ticketId
 */
async function getAssociatedTicket(dealId) {
  const { data } = await hs.get(
    `/crm/v3/objects/deals/${dealId}/associations/tickets`
  );
  const results = data?.results;
  if (!results?.length) throw new Error('No ticket found for this deal.');
  return results[0].id;
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

/**
 * Fetch deal properties + owner name for the sidebar summary.
 * Property names below match HubSpot defaults + common custom names —
 * verify cup_type / cup_size / quantity against your portal's API names.
 * @param {string} dealId
 * @returns {Promise<{brandName, cupType, cupSize, quantity, repName}>}
 */
async function getDeal(dealId) {
  const props = [
    'dealname', 'cup_type', 'cup_size', 'quantity',
    'hubspot_owner_id', 'design_brief_submitted',
  ].join(',');
  const { data } = await hs.get(`/crm/v3/objects/deals/${dealId}?properties=${props}`);

  let repName = null;
  if (data.properties.hubspot_owner_id) {
    try {
      const owner = await hs.get(`/crm/v3/owners/${data.properties.hubspot_owner_id}`);
      repName = `${owner.data.firstName} ${owner.data.lastName}`.trim() || null;
    } catch {
      // owner lookup failure is non-fatal
    }
  }

  return {
    brandName:        data.properties.dealname               || null,
    cupType:          data.properties.cup_type               || null,
    cupSize:          data.properties.cup_size               || null,
    quantity:         data.properties.quantity               || null,
    repName,
    alreadySubmitted: data.properties.design_brief_submitted === 'true',
  };
}

/**
 * Mark a deal as having had its design brief submitted.
 * Prevents duplicate submissions.
 * @param {string} dealId
 */
async function markBriefSubmitted(dealId) {
  await hs.patch(`/crm/v3/objects/deals/${dealId}`, {
    properties: { design_brief_submitted: 'true' },
  });
}

module.exports = { uploadFile, getAssociatedTicket, createNote, getDeal, markBriefSubmitted };
