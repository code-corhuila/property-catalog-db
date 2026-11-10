// The validator of properties rejects what models.md forbids and accepts a valid
// document (Annex B, "Cómo se verifica"). Run as the administrator, against the
// database catalog, after `update`. It leaves nothing behind.
const properties = db.getSiblingDB('catalog').properties;
const id = 'ffffffff-ffff-4fff-8fff-fffffffffff1';
const valid = () => ({
  _id: id,
  title: 'Validator check',
  city: 'Neiva',
  country: 'Colombia',
  host: { id: 'ffffffff-ffff-4fff-8fff-fffffffffff2', displayName: 'Check', hostSince: NumberInt(2024) },
  capacity: NumberInt(2),
  amenities: ['wifi'],
  photos: [],
  pricePerNightCents: NumberLong('100000'),
  currency: 'COP',
  rating: 4.5,
  unavailableRanges: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

function rejects(name, change) {
  const doc = valid();
  change(doc);
  try {
    properties.insertOne(doc);
  } catch (e) {
    if (e.code !== 121) throw e;             // 121 = DocumentValidationFailure
    print(`ok   rejects ${name}`);
    return;
  }
  properties.deleteOne({ _id: id });
  throw new Error(`the validator accepted ${name}`);
}

rejects('a value outside the enum of currency', (d) => { d.currency = 'USD'; });
rejects('an undeclared field', (d) => { d.titel = 'typo'; });
rejects('a document without the required array photos', (d) => { delete d.photos; });
rejects('amenities above maxItems (31)', (d) => { d.amenities = Array.from({ length: 31 }, (_, i) => `a${i}`); });
rejects('money as a double', (d) => { d.pricePerNightCents = 100000.5; });
rejects('a capacity above 20', (d) => { d.capacity = NumberInt(21); });
rejects('a range without reservationId', (d) => { d.unavailableRanges = [{ startDate: '2026-01-01', endDate: '2026-01-03' }]; });

properties.insertOne(valid());
properties.deleteOne({ _id: id });
print('ok   accepts a valid document');

const names = properties.getIndexes().map((i) => i.name);
for (const name of ['idx_properties_geo', 'idx_properties_city_capacity']) {
  if (!names.includes(name)) throw new Error(`missing index ${name}`);
  print(`ok   index ${name}`);
}
