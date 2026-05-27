const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('--- VALIDATION FAILED ---');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('username')
    .matches(/^dbu\d{8}$/i)
    .withMessage('Username must start with dbu followed by 8 digits'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('department')
    .notEmpty()
    .withMessage('Department is required'),
  body('year')
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'])
    .withMessage('Please select a valid academic year'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Password must contain uppercase, lowercase, digit, and symbol'),
  handleValidationErrors
];

const validateUserLogin = [
  body('username')
    .matches(/^dbu\d{8}$/i)
    .withMessage('Username must start with dbu followed by 8 digits'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Complaint validation rules
const validateComplaint = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .isIn(['academic', 'dining', 'housing', 'facilities', 'disciplinary', 'club_related', 'general'])
    .withMessage('Please select a valid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  handleValidationErrors
];

// Club validation rules
const validateClub = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Club name is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Club description is required'),
  body('category')
    .isIn(['Academic', 'Sports', 'Cultural', 'Technology', 'Service', 'Arts', 'Religious', 'Professional', 'Social', 'Other'])
    .withMessage('Please select a valid club category'),
  handleValidationErrors
];

// Post validation rules
const validatePost = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required'),
  body('type')
    .optional()
    .isIn(['News', 'Event', 'Announcement', 'Directive'])
    .withMessage('Invalid post type'),
  body('category')
    .optional()
    .isIn(['General', 'Campus', 'Academic', 'Sports', 'Research', 'Cultural', 'Club Related', 'Housing', 'Guidance'])
    .withMessage('Invalid category'),
  handleValidationErrors
];

// Election validation rules
const validateElection = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required'),
  handleValidationErrors
];

// Candidate validation rules
const validateCandidate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Candidate name is required'),
  body('manifesto')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Manifesto must be at least 10 characters long'),
  handleValidationErrors
];

// Feedback validation rules
const validateFeedback = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Feedback content is required'),
  handleValidationErrors
];

// Contact validation rules
const validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Subject must be between 3 and 100 characters'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('category')
    .optional()
    .trim()
    .isIn(['general', 'support', 'feedback', 'club_related', 'academic', 'clubs', 'dining', 'sports'])
    .withMessage('Please select a valid category'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateComplaint,
  validateClub,
  validatePost,
  validateElection,
  validateCandidate,
  validateFeedback,
  validateContact
};