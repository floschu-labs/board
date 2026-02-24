import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getAll, saveAll, clearAll } from './db.js';
import { validateBoardData } from './validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../dist')));

// API routes
app.get('/api/data', (req, res) => {
  try {
    const data = getAll();
    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const { projects, lists, cards } = req.body;
    
    // Validate that all required fields are arrays
    if (!Array.isArray(projects) || !Array.isArray(lists) || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Invalid data format: projects, lists, and cards must be arrays' });
    }
    
    // SECURITY: Validate all data before saving to prevent injection attacks
    try {
      validateBoardData({ projects, lists, cards });
    } catch (validationError) {
      return res.status(400).json({ error: `Validation failed: ${validationError.message}` });
    }
    
    saveAll({ projects, lists, cards });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.delete('/api/data', (req, res) => {
  try {
    clearAll();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Initialize database and start server
initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
