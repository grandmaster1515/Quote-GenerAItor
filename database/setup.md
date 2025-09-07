# Database Setup Instructions

## Prerequisites

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run --name quote-generator-db -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:15`

2. **Install pgvector extension**
   ```bash
   # On Ubuntu/Debian
   sudo apt install postgresql-15-pgvector
   
   # On macOS with Homebrew
   brew install pgvector
   
   # Or compile from source
   git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   sudo make install
   ```

## Database Setup

1. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres -h localhost
   
   # Create database
   CREATE DATABASE quote_generator;
   
   # Connect to the new database
   \c quote_generator;
   
   # Create user (optional)
   CREATE USER quote_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE quote_generator TO quote_user;
   ```

2. **Run Schema**
   ```bash
   # From the database directory
   psql -U postgres -d quote_generator -f schema.sql
   
   # Or from the backend directory
   psql -U postgres -d quote_generator -f ../database/schema.sql
   ```

3. **Add Sample Data**
   ```bash
   # From the database directory
   psql -U postgres -d quote_generator -f sample_data.sql
   
   # Or from the backend directory
   psql -U postgres -d quote_generator -f ../database/sample_data.sql
   ```

## Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quote_generator
DB_USER=postgres
DB_PASSWORD=password

# Or use DATABASE_URL
DATABASE_URL=postgresql://postgres:password@localhost:5432/quote_generator
```

## Verify Installation

1. **Check Tables**
   ```sql
   \dt
   ```

2. **Check pgvector Extension**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pgvector';
   ```

3. **Test Sample Data**
   ```sql
   SELECT * FROM businesses;
   SELECT * FROM business_context LIMIT 5;
   ```

## Troubleshooting

### pgvector Extension Issues
- Make sure PostgreSQL development headers are installed
- Restart PostgreSQL after installing pgvector
- Check PostgreSQL logs for detailed error messages

### Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check firewall settings
- Ensure pg_hba.conf allows connections

### Permission Issues
- Grant proper permissions to the database user
- Check file permissions on PostgreSQL data directory

## Production Considerations

1. **Security**
   - Use strong passwords
   - Configure SSL/TLS
   - Restrict network access
   - Regular security updates

2. **Performance**
   - Configure appropriate connection pooling
   - Set up proper indexes
   - Monitor query performance
   - Regular VACUUM and ANALYZE

3. **Backup**
   - Set up automated backups
   - Test restore procedures
   - Consider point-in-time recovery

4. **Monitoring**
   - Monitor connection counts
   - Track query performance
   - Set up alerts for errors
