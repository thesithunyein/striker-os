const { getFixtures } = require("../sports.cjs");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const fixtures = await getFixtures(8);
    res.json({ ok: true, count: fixtures.length, fixtures });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};
