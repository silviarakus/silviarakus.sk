// Odhlásenie zo zóny pre maklérov.
const auth = require('./_lib/makler/auth');

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', auth.clearCookie());
  res.setHeader('Location', '/makler/prihlasenie.html');
  res.statusCode = 303;
  return res.end();
};
