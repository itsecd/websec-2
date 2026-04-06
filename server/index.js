const express = require('express');
const path = require('path');
const { parseSchedule } = require('./services/parser');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/schedule', async (req, res) => {
    try {
        const { type, id, week } = req.query;
        const result = await parseSchedule(type || 'group', id || '1213641978', week || '1');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});