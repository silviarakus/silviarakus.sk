// Odhlásenie zo zóny pre klientov.
module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'klient=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.setHeader('Location', '/');
  return res.status(303).end();
};
