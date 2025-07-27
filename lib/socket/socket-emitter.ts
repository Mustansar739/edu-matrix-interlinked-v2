/**
 * Server-side Socket.IO Emitter
 * Utility for emitting Socket.IO events from API routes to the standalone Socket.IO server
 * This enables real-time communication from Next.js API routes
 */

import { io, Socket } from 'socket.io-client';

interface EmitterConfig {
  url: string;
  connectionTimeout: number;
  maxRetries: number;
}

class SocketIOEmitter {
  private static instance: SocketIOEmitter | null = null;
  private socket: Socket | null = null;
  private config: EmitterConfig;
  private connectionPromise: Promise<Socket> | null = null;
  private retryCount = 0;

  private constructor() {
    // Production-ready URL configuration for Socket.IO server
    // Uses internal Docker service name for container-to-container communication
    // Falls back to localhost for development outside Docker
    const socketUrl = process.env.SOCKET_IO_INTERNAL_URL || 
                     process.env.SOCKET_IO_SERVER_URL || 
                     'http://localhost:3001';
                     
    this.config = {
      url: socketUrl,
      connectionTimeout: 10000, // Increased timeout to 10 seconds
      maxRetries: 5 // Increased retries
    };

    console.log('🔧 SocketIOEmitter initialized with config:', {
      url: this.config.url,
      timeout: this.config.connectionTimeout,
      maxRetries: this.config.maxRetries,
      source: 'API server emitter'
    });
  }

  /**
   * Get singleton instance of SocketIOEmitter
   */
  public static getInstance(): SocketIOEmitter {
    if (!SocketIOEmitter.instance) {
      SocketIOEmitter.instance = new SocketIOEmitter();
    }
    return SocketIOEmitter.instance;
  }

  /**
   * Connect to the Socket.IO server
   */
  private async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.url, {
          timeout: this.config.connectionTimeout,
          forceNew: true,
          transports: ['websocket', 'polling'],
          auth: {
            source: 'api-server',
            timestamp: Date.now(),
            internalApiKey: process.env.INTERNAL_API_KEY
          },
          // Enhanced connection options for Docker networking
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: this.config.maxRetries,
          // Force WebSocket first, then polling
          upgrade: true,
          rememberUpgrade: false
        });

        const timeoutId = setTimeout(() => {
          this.socket?.disconnect();
          reject(new Error(`Connection timeout after ${this.config.connectionTimeout}ms`));
        }, this.config.connectionTimeout);

        this.socket.on('connect', () => {
          clearTimeout(timeoutId);
          this.retryCount = 0;
          console.log('🔗 API Socket.IO emitter connected to server');
          resolve(this.socket!);
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeoutId);
          console.error('❌ Socket.IO emitter connection error:', error);
          
          if (this.retryCount < this.config.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
              this.connectionPromise = null;
              this.connect().then(resolve).catch(reject);
            }, 1000 * this.retryCount);
          } else {
            reject(error);
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Socket.IO emitter disconnected:', reason);
          this.connectionPromise = null;
        });

      } catch (error) {
        console.error('❌ Failed to create socket connection:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Emit event to a specific user
   */
  public async emitToUser(userId: string, event: string, data: any): Promise<void> {
    try {
      const socket = await this.connect();
      
      // Use the same pattern as the standalone server: emit to user room
      socket.emit('server:emit', {
        target: `user:${userId}`,
        event,
        data
      });

      console.log(`📤 Emitted '${event}' to user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to emit '${event}' to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Emit event to a specific room/conversation
   */
  public async emitToRoom(roomId: string, event: string, data: any): Promise<void> {
    try {
      const socket = await this.connect();
      
      socket.emit('server:emit', {
        target: roomId,
        event,
        data
      });

      console.log(`📤 Emitted '${event}' to room ${roomId}`);
    } catch (error) {
      console.error(`❌ Failed to emit '${event}' to room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Emit event to all connected clients
   */
  public async emitToAll(event: string, data: any): Promise<void> {
    try {
      const socket = await this.connect();
      
      socket.emit('server:emit', {
        target: 'broadcast',
        event,
        data
      });

      console.log(`📤 Broadcasted '${event}' to all clients`);
    } catch (error) {
      console.error(`❌ Failed to broadcast '${event}':`, error);
      throw error;
    }
  }

  /**
   * Disconnect from the Socket.IO server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
      console.log('🔌 Socket.IO emitter disconnected');
    }
  }

  /**
   * Check if connected to the Socket.IO server
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export { SocketIOEmitter };
export default SocketIOEmitter;
