const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/chat', protect, handleChat);

module.exports = router;

