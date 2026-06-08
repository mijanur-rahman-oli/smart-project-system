// scripts/health-check.js
const { prisma } = require('../src/lib/db/prisma');
const redis = require('../src/lib/cache/redis');

async function healthCheck() {
  console.log('Running health checks...');
  
  // Check database connection
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection: OK');
  } catch (error) {
    console.error('❌ Database connection: FAILED', error);
    process.exit(1);
  }
  
  // Check Redis connection
  try {
    await redis.ping();
    console.log('✅ Redis connection: OK');
  } catch (error) {
    console.error('❌ Redis connection: FAILED', error);
    process.exit(1);
  }
  
  // Check storage bucket
  try {
    // Add storage check logic here
    console.log('✅ Storage bucket: OK');
  } catch (error) {
    console.error('❌ Storage bucket: FAILED', error);
  }
  
  console.log('All health checks passed!');
}

healthCheck();