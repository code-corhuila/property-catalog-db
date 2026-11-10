// The seed of 02_dml/03_upserts left the 24 listings with the types the validator and
// catalog-api expect, and with no range taken. Run as the administrator after `update`.
const properties = db.getSiblingDB('catalog').properties;

const total = properties.countDocuments();
if (total !== 24) throw new Error(`expected 24 listings, found ${total}`);
print('ok   24 listings');

const wrong = properties.countDocuments({
  $or: [
    { pricePerNightCents: { $not: { $type: 'long' } } },
    { capacity: { $not: { $type: 'int' } } },
    { createdAt: { $not: { $type: 'date' } } },
    { unavailableRanges: { $ne: [] } },
  ],
});
if (wrong !== 0) throw new Error(`${wrong} listings with a wrong type or a taken range`);
print('ok   money as long, capacity as int, dates as date, no range taken');

const newest = properties.find().sort({ createdAt: -1, _id: -1 }).limit(1).next();
if (newest.title !== 'Apartamento en Villa Del Mar') throw new Error(`newest is ${newest.title}`);
print('ok   the first row of the mock is the most recent');

const bogota = properties.countDocuments({ city: 'bogota' }, { collation: { locale: 'es', strength: 1 } });
if (bogota !== 6) throw new Error(`expected 6 listings in Bogotá ignoring case and accents, found ${bogota}`);
print('ok   the city matches ignoring case and accents');
