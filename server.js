// server.js — entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const submitRoute = require('./routes/submit');
const uploadRoute = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/submit', submitRoute);
app.use('/upload', uploadRoute);

app.listen(PORT, () => {
  console.log(`uniq-onboarding server running on port ${PORT}`);
});
