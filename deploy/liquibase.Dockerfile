# Liquibase with the MongoDB extension (Annex B). Two packages: liquibase-mongodb is the
# extension and mongodb is the Java driver it needs. With only the driver, Liquibase
# fails with "Driver class was not specified". Both versions are fixed.
FROM liquibase/liquibase:4.29
RUN lpm add liquibase-mongodb@4.29.1 mongodb@3.12.14 --global
