#!/usr/bin/env node
// ==========================================
// KAFKA CONFIGURATION VALIDATION SCRIPT
// ==========================================
// Validates Kafka configuration across all services

require('dotenv').config();
const { Kafka } = require('kafkajs');

// Configuration validation
function validateKafkaConfig() {
  console.log('🔍 Validating Kafka Configuration...\n');

  // Environment variables check
  const requiredEnvVars = {
    'KAFKA_BROKERS': process.env.KAFKA_BROKERS,
    'KAFKA_INTERNAL_BROKERS': process.env.KAFKA_INTERNAL_BROKERS,
    'KAFKA_CLIENT_ID': process.env.KAFKA_CLIENT_ID,
    'KAFKA_ENABLED': process.env.KAFKA_ENABLED
  };

  console.log('📋 Environment Variables:');
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    const status = value ? '✅' : '❌';
    console.log(`  ${status} ${key}: ${value || 'NOT SET'}`);
  }

  // Configuration recommendations
  console.log('\n🔧 Configuration Analysis:');
  
  if (!process.env.KAFKA_BROKERS) {
    console.log('  ❌ KAFKA_BROKERS not set - required for external connections');
  } else {
    console.log(`  ✅ KAFKA_BROKERS: ${process.env.KAFKA_BROKERS}`);
  }

  if (!process.env.KAFKA_INTERNAL_BROKERS) {
    console.log('  ⚠️  KAFKA_INTERNAL_BROKERS not set - using KAFKA_BROKERS as fallback');
  } else {
    console.log(`  ✅ KAFKA_INTERNAL_BROKERS: ${process.env.KAFKA_INTERNAL_BROKERS}`);
  }

  if (process.env.KAFKA_ENABLED !== 'true') {
    console.log('  ⚠️  KAFKA_ENABLED not set to "true" - Kafka may be disabled');
  } else {
    console.log('  ✅ KAFKA_ENABLED: true');
  }

  return requiredEnvVars;
}

// Test Kafka connectivity
async function testKafkaConnectivity() {
  console.log('\n🔌 Testing Kafka Connectivity...');

  try {
    // Test external broker (for main app)
    const externalKafka = new Kafka({
      clientId: 'config-validator-external',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      connectionTimeout: 5000,
      requestTimeout: 10000
    });

    console.log(`\n🌐 Testing External Brokers: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
    const externalAdmin = externalKafka.admin();
    await externalAdmin.connect();
    
    const metadata = await externalAdmin.fetchTopicMetadata();
    console.log(`  ✅ Connected to external brokers`);
    console.log(`  ✅ Cluster has ${metadata.topics.length} topics`);
    
    await externalAdmin.disconnect();

    // Test internal broker (for Socket.IO server)
    if (process.env.KAFKA_INTERNAL_BROKERS) {
      console.log(`\n🏠 Testing Internal Brokers: ${process.env.KAFKA_INTERNAL_BROKERS}`);
      
      const internalKafka = new Kafka({
        clientId: 'config-validator-internal',
        brokers: process.env.KAFKA_INTERNAL_BROKERS.split(','),
        connectionTimeout: 5000,
        requestTimeout: 10000
      });

      const internalAdmin = internalKafka.admin();
      try {
        await internalAdmin.connect();
        console.log(`  ✅ Connected to internal brokers`);
        await internalAdmin.disconnect();
      } catch (error) {
        console.log(`  ❌ Failed to connect to internal brokers: ${error.message}`);
      }
    }

    return true;

  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    return false;
  }
}

// Validate Docker configuration
function validateDockerConfig() {
  console.log('\n🐳 Docker Configuration Validation:');
  
  const dockerRecommendations = [
    '✅ Use kafka:9092 for internal container communication',
    '✅ Use localhost:9092 for external host connections',
    '✅ Ensure KAFKA_ADVERTISED_LISTENERS includes kafka:9092',
    '✅ Remove conflicting port mappings (29092)',
    '✅ Set KAFKA_ENABLED=true in environment'
  ];

  dockerRecommendations.forEach(rec => console.log(`  ${rec}`));
}

// Main validation function
async function main() {
  console.log('🎯 KAFKA CONFIGURATION VALIDATOR\n');
  console.log('='.repeat(50));

  // Step 1: Validate configuration
  const config = validateKafkaConfig();

  // Step 2: Test connectivity
  const connected = await testKafkaConnectivity();

  // Step 3: Docker validation
  validateDockerConfig();

  // Step 4: Summary
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('='.repeat(50));
  
  const hasRequiredVars = config.KAFKA_BROKERS && config.KAFKA_CLIENT_ID;
  const isEnabled = config.KAFKA_ENABLED === 'true';
  
  if (hasRequiredVars && isEnabled && connected) {
    console.log('🎉 ✅ Kafka configuration is VALID and READY!');
    console.log('\nNext steps:');
    console.log('  1. Start Docker services: docker-compose up -d');
    console.log('  2. Test health endpoint: curl http://localhost:3000/api/health');
    console.log('  3. Check Socket.IO logs for Kafka connection');
  } else {
    console.log('⚠️  ❌ Kafka configuration needs attention!');
    console.log('\nIssues found:');
    if (!hasRequiredVars) console.log('  - Missing required environment variables');
    if (!isEnabled) console.log('  - Kafka not enabled (KAFKA_ENABLED=true)');
    if (!connected) console.log('  - Cannot connect to Kafka brokers');
  }

  process.exit(hasRequiredVars && isEnabled && connected ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { validateKafkaConfig, testKafkaConnectivity };
