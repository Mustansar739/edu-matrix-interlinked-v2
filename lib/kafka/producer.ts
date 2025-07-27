/**
 * ==========================================
 * EDU MATRIX INTERLINKED - KAFKA PRODUCER
 * ==========================================
 * Kafka producer for publishing events
 * Used specifically for posts and real-time features
 */

import { Kafka, Partitioners } from 'kafkajs';

// ==========================================
// KAFKA PRODUCER SETUP
// ==========================================

const kafka = new Kafka({
  clientId: 'edu-matrix-producer',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:29092'],
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 5,
    maxRetryTime: 30000,
    factor: 2
  }
});

const producer = kafka.producer({
  // ==========================================
  // PRODUCTION-READY KAFKA PRODUCER CONFIG
  // ==========================================
  
  // Remove conflicting idempotent settings to fix EoS warnings
  maxInFlightRequests: 5, // Increase for better throughput
  idempotent: true,
  
  // Remove retries conflict with idempotent producer
  // Kafka handles retries automatically with idempotent producer
  
  // Timeout settings
  transactionTimeout: 30000,
  
  // Partitioner for better distribution
  createPartitioner: Partitioners.DefaultPartitioner,
  
  // Topic creation
  allowAutoTopicCreation: false // Disable auto-creation for production
});

let isProducerConnected = false;

// ==========================================
// PRODUCER FUNCTIONS
// ==========================================

/**
 * Initialize Kafka producer
 */
async function initProducer(): Promise<boolean> {
  try {
    if (!isProducerConnected) {
      await producer.connect();
      isProducerConnected = true;
      console.log('✅ Kafka producer connected');
    }
    return true;
  } catch (error) {
    console.error('❌ Kafka producer connection failed:', error);
    return false;
  }
}

/**
 * Publish event to Kafka topic (non-blocking for better performance)
 */
export async function publishToKafka(
  topic: string, 
  data: any, 
  key?: string
): Promise<boolean> {
  // Make this non-blocking by using setImmediate to not block the response
  setImmediate(async () => {
    try {
      // Ensure producer is connected
      if (!isProducerConnected) {
        const connected = await initProducer();
        if (!connected) {
          console.error('Failed to connect Kafka producer');
          return false;
        }
      }

      // Prepare message
      const message = {
        key: key || data.id || Date.now().toString(),
        value: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: 'edu-matrix-posts'
        })
      };

      // Send message with timeout
      await Promise.race([
        producer.send({
          topic,
          messages: [message]
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Kafka send timeout')), 5000)
        )
      ]);

      console.log(`📤 Published event to topic: ${topic}`);
    } catch (error) {
      console.error(`❌ Failed to publish to topic ${topic}:`, error);
      // Don't fail the main request even if Kafka fails
    }
  });

  // Return immediately for better performance
  return true;
}

/**
 * Publish multiple events to Kafka topic
 */
export async function publishMultipleToKafka(
  topic: string, 
  events: any[]
): Promise<boolean> {
  try {
    // Ensure producer is connected
    if (!isProducerConnected) {
      const connected = await initProducer();
      if (!connected) {
        console.error('Failed to connect Kafka producer');
        return false;
      }
    }

    // Prepare messages
    const messages = events.map((data, index) => ({
      key: data.id || `${Date.now()}-${index}`,
      value: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'edu-matrix-posts'
      })
    }));

    // Send messages
    await producer.send({
      topic,
      messages
    });

    console.log(`📤 Published ${events.length} events to topic: ${topic}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish multiple events to topic ${topic}:`, error);
    return false;
  }
}

/**
 * Gracefully disconnect producer
 */
export async function disconnectProducer(): Promise<void> {
  try {
    if (isProducerConnected) {
      await producer.disconnect();
      isProducerConnected = false;
      console.log('✅ Kafka producer disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting Kafka producer:', error);
  }
}

// ==========================================
// TOPIC CONSTANTS
// ==========================================

export const KAFKA_TOPICS = {
  POSTS: 'students-interlinked-posts',
  STORIES: 'students-interlinked-stories',
  COMMENTS: 'students-interlinked-comments',
  LIKES: 'students-interlinked-likes',
  NOTIFICATIONS: 'realtime-notifications',
  USER_ACTIVITY: 'user-activity',
  ANALYTICS: 'analytics-events'
} as const;

// Export producer for advanced usage
export { producer, kafka };
