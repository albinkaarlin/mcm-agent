require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 3000;

// 1. Inställningar från din HubSpot App
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
const SCOPES = 'crm.objects.contacts.read';

// 2. Startsidan - Här klickar kunden på "Anslut HubSpot"
app.get('/', (req, res) => {
    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}`;
    res.send(`<h1>AI Marketing Agent</h1><a href="${authUrl}">Anslut ditt HubSpot-gym här</a>`);
});

// 3. Callback - Hit skickas kunden efter inloggning
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;

    try {
        // Byt ut koden mot en Access Token
        const tokenResponse = await axios.post('https://api.hubapi.com/oauth/v1/token', new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code: code
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;
        
        // Nu när vi har token, hämta gymmets kunder!
        const contacts = await fetchContacts(accessToken);
        
        res.json({
            message: "Inloggning lyckades! Här är kunddatan till din AI:",
            data: contacts
        });

    } catch (error) {
        res.status(500).send("Något gick fel vid inloggningen.");
    }
});

// Funktion för att hämta de 50 kunderna
async function fetchContacts(token) {
    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        params: {
            limit: 50,
            properties: 'firstname,lastname,email,membership_level' // De fält vi vill ha
        },
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.results;
}

app.listen(PORT, () => console.log(`Server körs på http://localhost:${PORT}`));