#!/bin/bash

# Migration Runner for Chrome Extension Backend
# Runs database migrations to add new features

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
readonly MIGRATIONS_DIR="$SCRIPT_DIR"

# Database configuration (can be overridden by environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-realtor_data}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Check if PostgreSQL is available
check_postgresql() {
    log_info "Checking PostgreSQL connection..."
    
    if ! command -v psql >/dev/null 2>&1; then
        log_error "psql command not found. Please install PostgreSQL client."
        return 1
    fi
    
    # Test connection
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "Cannot connect to PostgreSQL database."
        log_error "Host: $DB_HOST:$DB_PORT"
        log_error "Database: $DB_NAME"
        log_error "User: $DB_USER"
        return 1
    fi
    
    log_success "PostgreSQL connection successful"
    return 0
}

# Create migrations table if it doesn't exist
create_migrations_table() {
    log_info "Creating migrations table if it doesn't exist..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    status VARCHAR(20) DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations (migration_name);
EOF

    log_success "Migrations table ready"
}

# Calculate checksum of a file
calculate_checksum() {
    local file="$1"
    sha256sum "$file" | cut -d' ' -f1
}

# Check if migration has been run
migration_exists() {
    local migration_name="$1"
    
    local count
    count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM migrations WHERE migration_name = '$migration_name';" | tr -d ' ')
    
    [[ "$count" -gt 0 ]]
}

# Record migration execution
record_migration() {
    local migration_name="$1"
    local checksum="$2"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
INSERT INTO migrations (migration_name, checksum, status)
VALUES ('$migration_name', '$checksum', 'completed')
ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = CURRENT_TIMESTAMP,
    checksum = EXCLUDED.checksum,
    status = EXCLUDED.status;
EOF
}

# Run a single migration
run_migration() {
    local migration_file="$1"
    local migration_name
    migration_name=$(basename "$migration_file" .sql)
    
    log_info "Running migration: $migration_name"
    
    # Check if already run
    if migration_exists "$migration_name"; then
        log_warning "Migration $migration_name already executed, skipping"
        return 0
    fi
    
    # Calculate checksum
    local checksum
    checksum=$(calculate_checksum "$migration_file")
    
    # Run migration
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        # Record successful execution
        record_migration "$migration_name" "$checksum"
        log_success "Migration $migration_name completed successfully"
        return 0
    else
        log_error "Migration $migration_name failed"
        return 1
    fi
}

# Run all migrations
run_all_migrations() {
    log_info "Looking for migration files in $MIGRATIONS_DIR"
    
    # Find all .sql files and sort them
    local migration_files=()
    while IFS= read -r -d '' file; do
        migration_files+=("$file")
    done < <(find "$MIGRATIONS_DIR" -name "*.sql" -type f -print0 | sort -z)
    
    if [[ ${#migration_files[@]} -eq 0 ]]; then
        log_warning "No migration files found"
        return 0
    fi
    
    log_info "Found ${#migration_files[@]} migration file(s)"
    
    local successful=0
    local failed=0
    
    for migration_file in "${migration_files[@]}"; do
        if run_migration "$migration_file"; then
            ((successful++))
        else
            ((failed++))
        fi
    done
    
    log_info "Migration summary: $successful successful, $failed failed"
    
    if [[ $failed -gt 0 ]]; then
        return 1
    fi
    
    return 0
}

# Show migration status
show_migration_status() {
    log_info "Migration Status:"
    
    if ! migration_exists "add_tags_support"; then
        echo "No migrations table found"
        return 0
    fi
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT 
    migration_name,
    status,
    executed_at,
    SUBSTRING(checksum, 1, 8) as checksum_short
FROM migrations 
ORDER BY executed_at DESC;
EOF
}

# Rollback a migration (basic implementation)
rollback_migration() {
    local migration_name="$1"
    
    log_warning "Rolling back migration: $migration_name"
    
    # Look for rollback script
    local rollback_file="$MIGRATIONS_DIR/rollback_${migration_name}.sql"
    
    if [[ -f "$rollback_file" ]]; then
        log_info "Found rollback script: $rollback_file"
        
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$rollback_file"; then
            # Remove from migrations table
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM migrations WHERE migration_name = '$migration_name';"
            log_success "Migration $migration_name rolled back successfully"
        else
            log_error "Rollback failed for migration $migration_name"
            return 1
        fi
    else
        log_warning "No rollback script found for $migration_name"
        log_warning "Manual rollback may be required"
        return 1
    fi
}

# Main function
main() {
    local command="${1:-run}"
    
    case "$command" in
        "run")
            log_info "Starting database migrations..."
            check_postgresql || exit 1
            create_migrations_table || exit 1
            run_all_migrations || exit 1
            log_success "All migrations completed successfully!"
            ;;
        "status")
            check_postgresql || exit 1
            show_migration_status
            ;;
        "rollback")
            local migration_name="${2:-}"
            if [[ -z "$migration_name" ]]; then
                log_error "Migration name required for rollback"
                log_error "Usage: $0 rollback <migration_name>"
                exit 1
            fi
            check_postgresql || exit 1
            rollback_migration "$migration_name"
            ;;
        "help"|"-h"|"--help")
            cat << EOF
Database Migration Runner for Chrome Extension Backend

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    run             Run all pending migrations (default)
    status          Show migration status
    rollback NAME   Rollback a specific migration
    help            Show this help message

ENVIRONMENT VARIABLES:
    DB_HOST         Database host (default: localhost)
    DB_PORT         Database port (default: 5432)
    DB_NAME         Database name (default: realtor_data)
    DB_USER         Database user (default: postgres)
    DB_PASSWORD     Database password (default: password)

EXAMPLES:
    # Run all migrations
    $0 run
    
    # Check migration status
    $0 status
    
    # Rollback specific migration
    $0 rollback add_tags_support
    
    # Use custom database settings
    DB_HOST=prod-db DB_PASSWORD=secret $0 run

EOF
            ;;
        *)
            log_error "Unknown command: $command"
            log_error "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
