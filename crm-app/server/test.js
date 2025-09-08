console.log('Test server starting...');
const express = require('express');
const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
