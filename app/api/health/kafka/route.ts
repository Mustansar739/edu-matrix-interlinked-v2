import { NextRequest, NextResponse } from 'next/server';
import { Kafka } from 'kafkajs';

// Official Next.js 15 Kafka health check
const kafka = new Kafka({
  clientId: 'health-check-client',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:29092'],
});

export async function GET(request: NextRequest) {
  let producer;
  let admin;
  
  try {
    const start = Date.now();
    
    // Create admin client for cluster info
    admin = kafka.admin();
    await admin.connect();
    
    // Get cluster metadata
    const metadata = await admin.fetchTopicMetadata();
    const brokers = await admin.describeCluster();
    
    // Test producer connection
    producer = kafka.producer();
    await producer.connect();
    
    const responseTime = Date.now() - start;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'kafka',
      type: 'Apache Kafka',
      responseTime: `${responseTime}ms`,
      cluster: {
        brokers: brokers.brokers.length,
        controllerId: brokers.controller,
        clusterId: brokers.clusterId
      },
      topics: {
        total: metadata.topics.length,
        names: metadata.topics.map(t => t.name)
      },
      connection: {
        producer: 'connected',
        admin: 'connected'
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Kafka health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'kafka',
      type: 'Apache Kafka',
      error: error instanceof Error ? error.message : 'Unknown Kafka error'
    }, { status: 503 });
  } finally {
    // Clean up connections
    try {
      if (producer) await producer.disconnect();
      if (admin) await admin.disconnect();
    } catch (e) {
      console.warn('Kafka cleanup warning:', e);
    }
  }
}
