const express = require('express');
const SystemConfig = require('../models/SystemConfig');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper: get-or-create the singleton config document
const getConfig = async () => {
  let config = await SystemConfig.findOne({ _key: 'global' });
  if (!config) {
    config = await SystemConfig.create({
      _key: 'global',
      electionVisible: true,
      leadershipVisible: true,
      clubsVisible: true,
      servicesVisible: true,
      complaintsVisible: true,
      graduationYearRequired: true,
      activeMemberRequired: true,
      attendanceRatioRequired: true,
      portalActivityRequired: true
    });
  }
  return config;
};

// @desc    Get global system config (public — no auth needed for initial page load)
// @route   GET /api/config
// @access  Public
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    res.json({
      success: true,
      electionVisible: config.electionVisible ?? true,
      leadershipVisible: config.leadershipVisible ?? true,
      clubsVisible: config.clubsVisible ?? true,
      servicesVisible: config.servicesVisible ?? true,
      complaintsVisible: config.complaintsVisible ?? true,
      // Certificate gate rules
      graduationYearRequired: config.graduationYearRequired ?? true,
      activeMemberRequired: config.activeMemberRequired ?? true,
      attendanceRatioRequired: config.attendanceRatioRequired ?? true,
      portalActivityRequired: config.portalActivityRequired ?? true
    });
  } catch (error) {
    console.error('Get config error:', error);
    // Safe default — never block the UI on a config fetch failure
    res.json({
      success: true,
      electionVisible: true,
      leadershipVisible: true,
      clubsVisible: true,
      servicesVisible: true,
      complaintsVisible: true,
      graduationYearRequired: true,
      activeMemberRequired: true,
      attendanceRatioRequired: true,
      portalActivityRequired: true
    });
  }
});

// @desc    Toggle election portal visibility
// @route   POST /api/config/toggle-election
// @access  Private/Admin
router.post('/toggle-election', protect, async (req, res) => {
  try {
    // Only president (dbu10101020) or system admin (dbu10101030) may change this
    const allowedUsernames = ['dbu10101020', 'dbu10101030'];
    const hasPermission = allowedUsernames.includes(req.user.username) ||
                          req.user.role === 'president' ||
                          req.user.role === 'system_admin';

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Not authorized to change system configuration' });
    }

    const config = await getConfig();
    config.electionVisible = !config.electionVisible;
    await config.save();

    console.log(`⚙️  Election visibility toggled to: ${config.electionVisible} by ${req.user.username}`);

    res.json({
      success: true,
      electionVisible: config.electionVisible,
      message: `Election portal is now ${config.electionVisible ? 'VISIBLE' : 'HIDDEN'}`
    });
  } catch (error) {
    console.error('Toggle election config error:', error);
    res.status(500).json({ success: false, message: 'Server error updating configuration' });
  }
});

// @desc    Toggle a specific configuration key
// @route   POST /api/config/toggle/:key
// @access  Private/Admin
router.post('/toggle/:key', protect, async (req, res) => {
  try {
    const { key } = req.params;
    const allowedKeys = ['electionVisible', 'leadershipVisible', 'clubsVisible', 'servicesVisible', 'complaintsVisible'];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid configuration key' });
    }

    // Only president (dbu10101020) or system admin (dbu10101030) may change this
    const allowedUsernames = ['dbu10101020', 'dbu10101030'];
    const hasPermission = allowedUsernames.includes(req.user.username) ||
                          req.user.role === 'president' ||
                          req.user.role === 'system_admin';

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Not authorized to change system configuration' });
    }

    const config = await getConfig();
    config[key] = !config[key];
    await config.save();

    console.log(`⚙️  Feature "${key}" toggled to: ${config[key]} by ${req.user.username}`);

    res.json({
      success: true,
      [key]: config[key],
      message: `Feature is now ${config[key] ? 'VISIBLE' : 'HIDDEN'}`
    });
  } catch (error) {
    console.error(`Toggle config error for key ${key}:`, error);
    res.status(500).json({ success: false, message: 'Server error updating configuration' });
  }
});

// @desc    Toggle a certificate gate rule (Required ↔ Optional)
// @route   POST /api/config/toggle-cert-rule/:key
// @access  Private — Club Admin (dbu10101040) only
router.post('/toggle-cert-rule/:key', protect, async (req, res) => {
  try {
    const { key } = req.params;
    const allowedKeys = [
      'graduationYearRequired',
      'activeMemberRequired',
      'attendanceRatioRequired',
      'portalActivityRequired'
    ];

    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate rule key' });
    }

    // Only Club Admin (dbu10101040) or coordinator role may change cert rules
    const isClubAdmin =
      req.user.username === 'dbu10101040' ||
      req.user.role === 'clubs_coordinator' ||
      req.user.role === 'clubAdmin' ||
      req.user.role === 'club_admin';

    if (!isClubAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied. Only the Club Admin can modify certificate rules.' });
    }

    const config = await getConfig();
    config[key] = !config[key];
    await config.save();

    const labels = {
      graduationYearRequired: 'Graduation Year Requirement',
      activeMemberRequired: 'Club Membership Verification',
      attendanceRatioRequired: '75% Attendance Ratio Rule',
      portalActivityRequired: 'Portal Active Usage Monitor'
    };

    console.log(`🎛️  Cert rule "${key}" set to ${config[key] ? 'REQUIRED' : 'OPTIONAL'} by ${req.user.username}`);

    res.json({
      success: true,
      key,
      value: config[key],
      message: `"${labels[key]}" is now ${config[key] ? 'REQUIRED 🔴' : 'OPTIONAL 🟢'}`
    });
  } catch (error) {
    console.error('Toggle cert rule error:', error);
    res.status(500).json({ success: false, message: 'Server error updating certificate rule' });
  }
});

module.exports = router;
