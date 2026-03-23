// server.js — entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const submitRoute = require('./routes/submit');
const uploadRoute = require('./routes/upload');
const { getDeal }  = require('./hubspot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/submit', submitRoute);
app.use('/upload', uploadRoute);

// GET /deal/:id — returns deal summary for the sidebar
app.get('/deal/:id', async (req, res) => {
  try {
    const deal = await getDeal(req.params.id);
    res.json(deal);
  } catch (err) {
    console.error('getDeal error:', err.response?.data || err.message);
    res.status(404).json({ error: 'Deal not found.' });
  }
});

app.listen(PORT, () => {
  console.log(`uniq-onboarding server running on port ${PORT}`);
});
