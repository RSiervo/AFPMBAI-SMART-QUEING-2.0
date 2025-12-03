const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from the build directory (dist or build)
// Note: Depending on your build tool, this might be 'dist' or 'build'
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the 'static' folder (where AFPMBAI.mp4 is located)
app.use('/static', express.static(path.join(__dirname, 'static')));

// --- In-Memory Database ---
// In a production environment, you would use a real database (MySQL, MongoDB).
// For this standalone deployment, we use a global variable.
let tickets = [];

// --- API Routes ---

// GET: Retrieve all tickets (Polling endpoint)
app.get('/api/tickets', (req, res) => {
  res.json(tickets);
});

// POST: Create a new ticket
app.post('/api/tickets', (req, res) => {
  const newTicket = req.body;
  // Ensure no duplicates by ID
  if (!tickets.find(t => t.id === newTicket.id)) {
    tickets.push(newTicket);
  }
  res.status(201).json(newTicket);
});

// PUT: Update a specific ticket
app.put('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = tickets.findIndex(t => t.id === id);
  
  if (index !== -1) {
    // Merge updates
    tickets[index] = { ...tickets[index], ...updates };
    res.json(tickets[index]);
  } else {
    res.status(404).json({ message: 'Ticket not found' });
  }
});

// POST: Reset/Clear the queue
app.post('/api/reset', (req, res) => {
  tickets = [];
  res.json({ success: true });
});

// --- Frontend Routing ---
// For any request that doesn't match an API route, send the React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Fallback if 'dist' doesn't exist yet (dev mode)
      res.status(500).send("Application not built. Please run 'npm run build' first.");
    }
  });
});

// Start Server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`----------------------------------------------------------`);
  console.log(`AFPMBAI Smart Queuing System Server is Running!`);
  console.log(`Access Locally: http://localhost:${PORT}`);
  console.log(`Access Network: http://<YOUR-SERVER-IP>:${PORT}`);
  console.log(`----------------------------------------------------------`);
});