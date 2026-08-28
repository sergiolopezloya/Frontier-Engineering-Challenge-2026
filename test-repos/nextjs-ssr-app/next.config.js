/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    // Dangerous anti-pattern: Exposing database connection string in client-accessible env
    NEXT_PUBLIC_DATABASE_URL: 'postgres://postgres:supersecretpass@db.production.internal:5432/app_db'
  }
};

module.exports = nextConfig;
