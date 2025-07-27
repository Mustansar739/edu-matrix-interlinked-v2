# 🎯 EDU MATRIX INTERLINKED - KAFKA CONFIGURATION GUIDE

**Clear Port Strategy: NO CONFLICTS, NO CONFUSION**

---

## 📋 PORT STRATEGY OVERVIEW

| Component | Environment | Host/Port | Purpose | Notes |
|-----------|-------------|-----------|---------|-------|
| **Main App** | Host Machine | `localhost:29092` | External client access | From your computer to Docker |
| **Socket.IO Server** | Docker Container | `kafka:19092` | Internal container communication | Container-to-container only |
| **Health APIs** | Host Machine | `localhost:29092` | Health check validation | Same as main app |
| **Kafka Controller** | Docker Internal | `kafka:9093` | Kafka coordination | Internal Kafka management |

---

## 🏗️ MAIN APP CONFIGURATION

### 1. **Environment Variables (.env)**
```env
# MAIN APP - USE THESE VALUES
KAFKA_BROKERS=localhost:29092          # ✅ External access from host
KAFKA_INTERNAL_BROKERS=kafka:19092     # ✅ For Docker services only
KAFKA_CLIENT_ID=edu-matrix-interlinked
KAFKA_ENABLED=true
```

### 2. **Main App Code (Next.js/API Routes)**
```typescript
// In your Next.js API routes or main application
const kafka = new Kafka({
  clientId: 'edu-matrix-main-app',
  brokers: ['localhost:29092'],  // ✅ ALWAYS use localhost:29092 from main app
  connectionTimeout: 5000,
  requestTimeout: 10000
});

// Example usage in API route
export async function POST(request: Request) {
  const producer = kafka.producer();
  await producer.connect();
  
  await producer.send({
    topic: 'user-events',
    messages: [{
      key: 'user-action',
      value: JSON.stringify({ action: 'login', userId: '123' })
    }]
  });
  
  await producer.disconnect();
}
```

### 3. **Health Check API (/api/health/route.ts)**
```typescript
// Health check MUST use external port
const kafka = new Kafka({
  clientId: 'health-check-client',
  brokers: ['localhost:29092'],  // ✅ External port for health checks
  connectionTimeout: 3000,
  requestTimeout: 5000,
});
```

---

## 🐳 DOCKER NETWORK CONFIGURATION

### 1. **Socket.IO Standalone Server**
```javascript
// socketio-standalone-server/utils/kafka.js
const kafka = new Kafka({
  clientId: 'edu-matrix-socketio',
  brokers: ['kafka:19092'],  // ✅ ALWAYS use kafka:19092 from containers
  logLevel: logLevel.WARN,
  connectionTimeout: 30000,
  requestTimeout: 90000
});
```

### 2. **Socket.IO Environment (.env)**
```env
# SOCKET.IO SERVER - DOCKER INTERNAL
KAFKA_BROKERS=localhost:29092          # ✅ Fallback for host testing
KAFKA_INTERNAL_BROKERS=kafka:19092     # ✅ Primary for container use
KAFKA_CLIENT_ID=edu-matrix-socketio
KAFKA_ENABLED=true
```

### 3. **Docker Compose Configuration**
```yaml
services:
  kafka:
    image: apache/kafka:4.0.0
    container_name: edu-matrix-kafka-4
    environment:
      # Separate listeners for internal and external
      KAFKA_LISTENERS: INTERNAL://0.0.0.0:19092,EXTERNAL://0.0.0.0:29092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:19092,EXTERNAL://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
    ports:
      - "29092:29092"  # ✅ External access port
      - "9093:9093"    # ✅ Controller port
    # Note: Port 19092 is NOT exposed - internal only

  socketio:
    environment:
      KAFKA_BROKERS: kafka:19092  # ✅ Use internal port
```

---

## 🔍 TESTING & VALIDATION

### 1. **From Host Machine (Main App)**
```bash
# Test external connectivity
telnet localhost 29092
# Should connect successfully

# Test health endpoint
curl http://localhost:3000/api/health
# Should show Kafka as healthy
```

### 2. **From Docker Container (Socket.IO)**
```bash
# Enter container
docker exec -it edu-matrix-socketio bash

# Test internal connectivity
telnet kafka 19092
# Should connect successfully
```

### 3. **Validation Script**
```bash
# Run comprehensive validation
node scripts/validate-kafka-config-new.js
# Should show all tests passing
```

---

## ⚠️ CRITICAL RULES - NO EXCEPTIONS

### ✅ **DO USE:**
- **Main App/Host**: `localhost:29092` ALWAYS
- **Socket.IO/Docker**: `kafka:19092` ALWAYS
- **Health Checks**: `localhost:29092` ALWAYS
- **Controller**: `kafka:9093` (automatic)

### ❌ **NEVER USE:**
- ~~`localhost:9092`~~ (old port, removed)
- ~~`kafka:9092`~~ (old port, causes conflicts)
- ~~`localhost:19092`~~ (internal port not exposed)
- ~~`kafka:29092`~~ (external port not for containers)

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Starting Services:
- [ ] Environment variables set correctly
- [ ] Docker Compose uses separate listeners
- [ ] Main app configured for localhost:29092
- [ ] Socket.IO configured for kafka:19092
- [ ] Health checks use localhost:29092

### After Starting Services:
- [ ] Run validation script
- [ ] Test main app connectivity
- [ ] Check Socket.IO logs for Kafka connection
- [ ] Verify health endpoints return Kafka as healthy

---

## 📊 PORT MAPPING DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                     HOST MACHINE                            │
│                                                             │
│  ┌─────────────┐                    ┌─────────────────────┐ │
│  │  Main App   │ ──localhost:29092──│  Docker Container   │ │
│  │  (Next.js)  │                    │                     │ │
│  └─────────────┘                    │  ┌─────────────────┐ │ │
│                                     │  │     Kafka       │ │ │
│  ┌─────────────┐                    │  │   Port:29092    │ │ │
│  │ Health APIs │ ──localhost:29092──│  │  (External)     │ │ │
│  └─────────────┘                    │  └─────────────────┘ │ │
│                                     │           │          │ │
│                                     │           │          │ │
│                                     │  ┌─────────────────┐ │ │
│                                     │  │   Socket.IO     │ │ │
│                                     │  │    Server       │ │ │
│                                     │  │                 │ │ │
│                                     │  └─────────────────┘ │ │
│                                     │           │          │ │
│                                     │    kafka:19092      │ │
│                                     │    (Internal)       │ │
│                                     └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 SUMMARY

**SIMPLE RULE: If it's running on your computer → use `localhost:29092`**
**SIMPLE RULE: If it's running in Docker → use `kafka:19092`**

This eliminates ALL conflicts and makes debugging straightforward. No more wasted time figuring out connection issues!

---

**Status: ✅ PRODUCTION READY**
**Last Updated: June 7, 2025**
