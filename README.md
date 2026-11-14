# property-catalog-db

> catalog bounded context: database (collections, validators, indexes, roles and migrations)

Part of the **PMS Property** distributed system — team `pms-property`, Grupo 2.
Governance and documentation live in [`property-docs`](https://github.com/code-corhuila/property-docs).

This repository owns the structure of the database `catalog`: its collections with their
validators, its indexes, its roles and its seed, versioned with **Liquibase and its
MongoDB extension** (Annex B). It holds **no database instance**: the single MongoDB 7
instance of each environment is defined in `property-infra-mongo` (Annex J, ADR-008).
`property-catalog-api` reads and writes the database as `catalog_app`; it never migrates it.

## Layout

```
changelog/changelog-master.yaml   single entry point of the pipeline
01_ddl/    structure  00_collections (each one with its validator), 01_validators, 02_indexes, 03_views
02_dml/    data       inserts, updates, deletes, upserts, patches
03_dcl/    access     00_roles
tests/                mongosh checks run by the CI after the database is built
deploy/compose.yml    only the migration runner, catalog-db-migrate
deploy/liquibase.Dockerfile   Liquibase 4.29 with liquibase-mongodb and the mongodb driver
.github/workflows/    rebuilds the database from empty on every pull request
```

There is no `04_alter`, `04_tcl` or `05_rollbacks`: MongoDB has no foreign keys, and
every changeset declares its inverse inline (Annex B).

## Rules

1. **The structure lives in the validator** of each collection, with `validationLevel:
   strict` and `validationAction: error`, as `06-data/models.md` writes it. A later
   change to a validator is a new changeset with `collMod` in `01_validators/`.
2. **Every index is named** (`idx_<collection>_<fields>`) and serves a real query of the
   service. `idx_properties_city_capacity` carries the collation `es`, strength 1,
   because the city of E-05 matches ignoring case and accents.
3. **Each changeset is idempotent by itself:** a single operation, so a failure leaves
   nothing half done. Seeds are upserts.
4. **Every changeset declares its rollback, and an applied changeset is never edited.**

## Run it

From `property-infra-postgres`, with the repositories cloned side by side and the
instance up:

```bash
docker compose --env-file env/dev.env run --rm catalog-db-migrate
docker compose --env-file env/dev.env run --rm catalog-db-migrate status --verbose
docker compose --env-file env/dev.env run --rm catalog-db-migrate rollback-count 1
```

Running it alone, against an instance already on the `platform` network:

```bash
cp .env.example .env          # and set the administrator user and password
docker compose -f deploy/compose.yml --env-file .env run --rm --build catalog-db-migrate
```

## Verification

`.github/workflows/db-ci.yml` runs on every pull request into `develop` and `qa`.
It prepares an empty MongoDB 7 the way the instance is prepared (an administrator and
`catalog_app` with no role), then: `update` → a second `update` that must apply nothing
→ the checks in `tests/` (the validator rejects a value outside an `enum`, an undeclared
field, a missing array and an array above `maxItems`, and accepts a valid document; the
indexes exist) → `rollback-count 999`, which must leave no collection, role or grant →
`update` again.

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `property-docs`.
