const config = require('../_lib/zakaznik/config');
const { json } = require('../_lib/zakaznik/http');

module.exports = (req, res) => json(res, 200, { turnstileSiteKey: config.turnstileSiteKey || null });
