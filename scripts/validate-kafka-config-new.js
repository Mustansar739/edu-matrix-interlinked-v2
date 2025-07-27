#!/usr/bin/env node

// ==========================================
// KAFKA CONFIGURATION VALIDATOR
// ==========================================
// Validates Kafka configuration for the "completely separate ports" strategy

const { Kafka } = require('kafkajs');
const fs = require('fs');
const path = require('path');

console.log('🔍 Kafka Configuration Validator - Separate Ports Strategy');
console.log('=' .repeat(60));

// Load environment variables
const envFile = path.join(process.cwd(), '.env');
const config = {};

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      config[key.trim()] = value.trim();
    }
  });
}

// Set environment variables
Object.keys(config).forEach(key => {
  process.env[key] = config[key];
});

// Validate environment configuration
function validateEnvironment() {
  console.log('\n📋 Environment Configuration:');
  
  const requiredVars = [
    'KAFKA_ENABLED',
    'KAFKA_BROKERS',
    'KAFKA_INTERNAL_BROKERS',
    'KAFKA_CLIENT_ID'
  ];
  
  let allValid = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value}`);
    } else {
      console.log(`  ❌ ${varName}: NOT SET`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Test Kafka connectivity with new port strategy
async function testKafkaConnectivity() {
  console.log('\n🔍 Testing Kafka Connectivity (Separate Ports Strategy)...');
  
  try {
    // Test external connection (host-to-container) - port 29092
    console.log('  📡 Testing external connection (localhost:29092)...');
    const externalKafka = new Kafka({
      clientId: 'external-test-client',
      brokers: ['localhost:29092'],
      connectionTimeout: 5000,
      requestTimeout: 10000,
    });
    
    const externalAdmin = externalKafka.admin();
    await externalAdmin.connect();
    const externalMetadata = await externalAdmin.fetchTopicMetadata();
    await externalAdmin.disconnect();
    console.log('  ✅ External connection (29092) successful');
    console.log(`  📊 Found ${Object.keys(externalMetadata.topics).length} topics`);
    
    // Test if we can reach the old port (should fail now)
    console.log('  🚫 Testing old port (localhost:9092) - should fail...');
    try {
      const oldKafka = new Kafka({
        clientId: 'old-port-test',
        brokers: ['localhost:9092'],
        connectionTimeout: 3000,
        requestTimeout: 5000,
      });
      const oldAdmin = oldKafka.admin();
      await oldAdmin.connect();
      await oldAdmin.disconnect();
      console.log('  ⚠️  WARNING: Old port (9092) still accessible - check Docker config');
    } catch (error) {
      console.log('  ✅ Old port (9092) correctly blocked');
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ Kafka connectivity failed: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('  💡 ENOTFOUND error detected!');
      console.log('  🔧 This should be fixed with the new port strategy');
    }
    
    return false;
  }
}

// Check Docker Compose configuration
function checkDockerConfig() {
  console.log('\n🐳 Docker Compose Configuration Check...');
  
  const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
  
  if (!fs.existsSync(dockerComposePath)) {
    console.log('  ❌ docker-compose.yml not found');
    return false;
  }
  
  const dockerContent = fs.readFileSync(dockerComposePath, 'utf-8');
  
  // Check for new port configuration
  const checks = [
    { pattern: /INTERNAL:\/\/0\.0\.0\.0:19092/, description: 'Internal listener on port 19092' },
    { pattern: /EXTERNAL:\/\/0\.0\.0\.0:29092/, description: 'External listener on port 29092' },
    { pattern: /INTERNAL:\/\/kafka:19092/, description: 'Internal advertised listener' },
    { pattern: /EXTERNAL:\/\/localhost:29092/, description: 'External advertised listener' },
    { pattern: /"29092:29092"/, description: 'External port mapping 29092' },
    { pattern: /"9093:9093"/, description: 'Controller port mapping 9093' },
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (check.pattern.test(dockerContent)) {
      console.log(`  ✅ ${check.description}`);
    } else {
      console.log(`  ❌ ${check.description}`);
      allPassed = false;
    }
  });
  
  // Check for old conflicting configurations
  const conflictChecks = [
    { pattern: /"9092:9092"/, description: 'Old port mapping 9092 (should be removed)' },
    { pattern: /kafka:9092/, description: 'References to kafka:9092 (should use 19092 for internal)' },
  ];
  
  conflictChecks.forEach(check => {
    if (check.pattern.test(dockerContent)) {
      console.log(`  ⚠️  Found: ${check.description}`);
      allPassed = false;
    } else {
      console.log(`  ✅ No conflicts: ${check.description}`);
    }
  });
  
  return allPassed;
}

// Generate recommendations
function generateRecommendations() {
  console.log('\n💡 Recommendations:');
  console.log('  1. External clients (host apps) should use: localhost:29092');
  console.log('  2. Internal services (Docker containers) should use: kafka:19092');
  console.log('  3. Health checks from host should use: localhost:29092');
  console.log('  4. Socket.IO server should use: kafka:19092');
  console.log('  5. Controller communication uses: kafka:9093 (internal only)');
  console.log('');
  console.log('  📝 Configuration Summary:');
  console.log('    - External Port: 29092 (host → container)');
  console.log('    - Internal Port: 19092 (container ↔ container)');
  console.log('    - Controller Port: 9093 (internal coordinator)');
  console.log('');
  console.log('  🚀 To test: docker-compose up -d kafka && node scripts/validate-kafka-config-new.js');
}

// Main validation function
async function main() {
  try {
    const envValid = validateEnvironment();
    const dockerValid = checkDockerConfig();
    const kafkaConnected = await testKafkaConnectivity();
    
    console.log('\n📊 Validation Summary:');
    console.log(`  Environment Config: ${envValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Docker Config: ${dockerValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Kafka Connectivity: ${kafkaConnected ? '✅ PASS' : '❌ FAIL'}`);
    
    if (envValid && dockerValid && kafkaConnected) {
      console.log('\n🎉 All checks passed! Kafka is configured correctly.');
    } else {
      console.log('\n⚠️  Some checks failed. See recommendations below.');
    }
    
    generateRecommendations();
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
main().catch(console.error);
