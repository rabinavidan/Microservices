#!/bin/bash
# Creates one database per service on first container start, demonstrating
# the database-per-service pattern on a single shared Postgres instance
# (in a real deployment each would be its own managed instance/cluster).
set -e

for db in "$ORDERS_DB_NAME" "$PAYMENTS_DB_NAME" "$INVENTORY_DB_NAME"; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE "$db"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done
