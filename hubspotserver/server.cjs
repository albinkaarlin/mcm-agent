// server.cjs
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

// Backend port (where this server runs)
const PORT = process.env.PORT || 3000;

// HubSpot app credentials from .env
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// This MUST match the redirect URL configured in your HubSpot app
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

// Scopes you request from HubSpot
// Exakt de tre som är obligatoriska i er app:
const SCOPES =
  'crm.objects.companies.read crm.objects.contacts.read oauth';

// Frontend URL (React dev server)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// Debug logs (can remove later)
console.log('CLIENT_ID:', CLIENT_ID ? 'loaded ✅' : 'MISSING ❌');
console.log('CLIENT_SECRET:', CLIENT_SECRET ? 'loaded ✅' : 'MISSING ❌');
console.log('REDIRECT_URI:', REDIRECT_URI);
console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('SCOPES:', SCOPES);

// 1. Start OAuth – your React app redirects the user here
app.get('/auth/hubspot', (req, res) => {
  const authUrl =
    'https://app.hubspot.com/oauth/authorize' +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;

  return res.redirect(authUrl);
});

// 2. Callback – HubSpot sends the user back here with ?code=...
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    console.error('Missing code from HubSpot');
    // Redirect back so frontend can show a toast
    return res.redirect(`${FRONTEND_URL}/?error=missing_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, // must match HubSpot app setting
        code: code,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log('Got access token ✅');

    // Example: fetch contacts (optional for now)
    const contacts = await fetchContacts(accessToken);
    console.log('Fetched contacts:', contacts.length);

    // ✅ Success – send user back to frontend, e.g. /create
    return res.redirect(`${FRONTEND_URL}/create?connected=1`);
  } catch (error) {
    console.error(
      'OAuth error:',
      error.response?.data || error.message || error
    );

    // On error, redirect back so frontend can show an error toast
    return res.redirect(`${FRONTEND_URL}/?error=oauth_failed`);
  }
});

// Helper to fetch contacts from HubSpot
async function fetchContacts(token) {
  const response = await axios.get(
    'https://api.hubapi.com/crm/v3/objects/contacts',
    {
      params: {
        limit: 50,
        properties: 'firstname,lastname,email',
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.results || [];
}

app.listen(PORT, () => {
  console.log(`Server körs på http://localhost:${PORT}`);
});