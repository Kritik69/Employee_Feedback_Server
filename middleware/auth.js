const jwt = require('jsonwebtoken');

const JWT_SECRET = '12345678'; // In production, this should be in .env file

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token, access denied' });
    }

    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token verification failed, access denied' });
  }
};

module.exports = { auth, JWT_SECRET }; 