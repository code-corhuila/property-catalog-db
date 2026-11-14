// catalog_app holds catalog_writer and nothing more (Annex J.7, J.10): it reads,
// inserts and updates the two collections of catalog, and it can neither delete a
// property nor change structure. Run as the administrator inside the mongo container;
// the checks connect as catalog_app with the password in CATALOG_APP_PASSWORD.
const catalog = db.getSiblingDB('catalog');
const roles = catalog.getUser('catalog_app').roles.map((r) => `${r.db}.${r.role}`);
if (roles.length !== 1 || roles[0] !== 'catalog.catalog_writer') {
  throw new Error(`catalog_app must hold only catalog.catalog_writer, it holds ${roles}`);
}
print('ok   catalog_app holds only catalog_writer');

const self = connect(`mongodb://catalog_app:${encodeURIComponent(process.env.CATALOG_APP_PASSWORD)}`
  + '@localhost:27017/catalog?directConnection=true');
const id = 'ffffffff-ffff-4fff-8fff-fffffffffff3';

function denied(name, action) {
  try {
    action();
  } catch (e) {
    if (e.codeName !== 'Unauthorized') throw e;
    print(`ok   denied: ${name}`);
    return;
  }
  throw new Error(`catalog_app was allowed to ${name}`);
}

self.processed_events.insertOne({ _id: id, eventType: 'ReservaCreada', processedAt: new Date() });
self.processed_events.updateOne({ _id: id }, { $set: { processedAt: new Date() } });
self.processed_events.findOne({ _id: id });
print('ok   find, insert and update on processed_events');
self.properties.find().limit(1).toArray();
print('ok   find on properties');

denied('delete a document', () => self.processed_events.deleteOne({ _id: id }));
denied('drop a collection', () => self.properties.drop());
denied('create an index', () => self.properties.createIndex({ title: 1 }));
denied('create a collection', () => self.createCollection('anything'));

catalog.processed_events.deleteOne({ _id: id });
