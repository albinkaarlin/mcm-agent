// server.cjs
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Backend port (where this server runs)
const PORT = process.env.PORT || 3000;

// HubSpot app credentials from .env
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// This MUST match the redirect URL configured in your HubSpot app
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

// Exakt de scopes som HubSpot kräver
const SCOPES =
  "crm.objects.companies.read crm.objects.contacts.read oauth";

// Frontend URL (React dev server)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// Var vi sparar CRM-datan (gemensam fil som Gemini-backenden kan läsa)
const HUBSPOT_DATA_PATH =
  process.env.HUBSPOT_DATA_PATH ||
  path.join(__dirname, "..", "hubspot_data.json");

console.log("CLIENT_ID:", CLIENT_ID ? "loaded ✅" : "MISSING ❌");
console.log("CLIENT_SECRET:", CLIENT_SECRET ? "loaded ✅" : "MISSING ❌");
console.log("REDIRECT_URI:", REDIRECT_URI);
console.log("FRONTEND_URL:", FRONTEND_URL);
console.log("SCOPES:", SCOPES);
console.log("HUBSPOT_DATA_PATH:", HUBSPOT_DATA_PATH);

// 1. Start OAuth – your React app redirects the user here
app.get("/auth/hubspot", (req, res) => {
  const authUrl =
    "https://app.hubspot.com/oauth/authorize" +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;

  return res.redirect(authUrl);
});

// 2. Callback – HubSpot sends the user back here with ?code=...
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    console.error("Missing code from HubSpot");
    return res.redirect(`${FRONTEND_URL}/?error=missing_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://api.hubapi.com/oauth/v1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("Got access token ✅");

    // Fetch contacts & companies
    const [contacts, companies] = await Promise.all([
      fetchContacts(accessToken),
      fetchCompanies(accessToken),
    ]);

    console.log("Fetched contacts:", contacts.length);
    console.log("Fetched companies:", companies.length);

    // Convert to CSV text
    const contactsCsv = toCsv(contacts, ["firstname", "lastname", "email", "age,", "membership_level", "membership_startdate", "city", "country"]);
    const companiesCsv = toCsv(companies, ["name", "domain","description"]);

    // Build object to store
    const dataToStore = {
      fetchedAt: new Date().toISOString(),
      contactsCount: contacts.length,
      companiesCount: companies.length,
      contactsCsv,
      companiesCsv,
    };

    // Write JSON file so Gemini-backend (8000) can read it
    try {
      fs.writeFileSync(
        HUBSPOT_DATA_PATH,
        JSON.stringify(dataToStore, null, 2),
        "utf-8"
      );
      console.log("Saved HubSpot data to", HUBSPOT_DATA_PATH);
    } catch (e) {
      console.error("Failed to write HubSpot data file:", e);
    }

    // Success – send user back to frontend create page
    return res.redirect(`${FRONTEND_URL}/create?connected=1`);
  } catch (error) {
    console.error(
      "OAuth error:",
      error.response?.data || error.message || error
    );
    return res.redirect(`${FRONTEND_URL}/?error=oauth_failed`);
  }
});

// Helper to fetch contacts from HubSpot
async function fetchContacts(token) {
  const response = await axios.get(
    "https://api.hubapi.com/crm/v3/objects/contacts",
    {
      params: {
        limit: 50,
        properties: "firstname,lastname,email,age,membership_level,membership_startdate,city,country",
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.results || [];
}

// Helper to fetch companies from HubSpot
async function fetchCompanies(token) {
  const response = await axios.get(
    "https://api.hubapi.com/crm/v3/objects/companies",
    {
      params: {
        limit: 50,
        properties: "name,domain,description",
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.results || [];
}

// Very dumb CSV generator: array of records + chosen fields -> CSV string
function toCsv(items, fields) {
  if (!items || items.length === 0) return "";
  const header = fields.join(",");
  const rows = items.map((item) => {
    const props = item.properties || {};
    return fields
      .map((field) =>
        (props[field] ?? "")
          .toString()
          .replace(/"/g, '""') // escape quotes
      )
      .map((v) => `"${v}"`)
      .join(",");
  });
  return [header, ...rows].join("\n");
}

// Debug endpoint to see that data actually finns
app.get("/hubspot/debug", (req, res) => {
  try {
    if (!fs.existsSync(HUBSPOT_DATA_PATH)) {
      return res.json({
        exists: false,
        message: "No hubspot_data file found yet.",
      });
    }
    const raw = fs.readFileSync(HUBSPOT_DATA_PATH, "utf-8");
    const data = JSON.parse(raw);
    res.json({
      exists: true,
      fetchedAt: data.fetchedAt,
      contactsCount: data.contactsCount,
      companiesCount: data.companiesCount,
      sampleContactsCsv: data.contactsCsv
        ?.split("\n")
        .slice(0, 3)
        .join("\n"),
      sampleCompaniesCsv: data.companiesCsv
        ?.split("\n")
        .slice(0, 3)
        .join("\n"),
    });
  } catch (e) {
    console.error("Error reading hubspot data:", e);
    res.status(500).json({ error: "Failed to read hubspot data file" });
  }
});

app.listen(PORT, () => {
  console.log(`Server körs på http://localhost:${PORT}`);
});