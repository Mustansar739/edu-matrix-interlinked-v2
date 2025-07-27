# Tech Stack

## Core Framework
- Next.js 15.3.4
- React
- TypeScript 5.8.2

## Database & ORM
- PostgreSQL 17
- Prisma ORM 6.5.0

## Authentication
- NextAuth.js 5.0 beta latest

## UI & Styling
- shadcn 
- Tailwind CSS 4.0.15

## Real-time & Communication
- Socket.IO 4.8.1
- Apache Kafka 4.0
- Redis 7.2+

## State Management
- Redux Toolkit 2.6.1
- Redux Persist


## Development Tools
- Docker Compose

note that : github copilot >
remember these informations this is mendatry 
0. this project is 1000% complex and don't assume anything about it.
1. you remembers all of these add any  codes or files or methods or or fuctions 100% purly used officially.
2. don't add any customs codes or files or methods or functions use onely officials methods and functions files and codes. 
3. if you see any custom codes or files or methods or functions remove them and replace them with official methods and functions files and codes.
4. if you want to understnd the project then you read this file edu-matrix-interlinked.md
5. please read .env file to understand the environment variables and how to use them.
6. if you want to understand the project then you read this file techstack.md
7. raw data related to the project is in the file /docs 

# load package.json to understand the tech stack  
## Package Manager
- pnpm


we are using next.js 15 use only officials method and functions and files 
 
react 19
TypeScript 5.8.2

shadcn and tailwindcss
Redux Persist
Redux Toolkit
shadcn
Tailwind 

## Authentication
- NextAuth.js 5.0 use only officials method and functions and files 

PostgreSQL 17
Prisma ORM
## Real-time & Communication
- Socket.IO 4.8.1
- Apache Kafka 4.0
- Redis 7.2+

## These are running on docker compose locally
- Socket.IO 4.8.1
- Apache Kafka 4.0
- Redis 7.2+
- PostgreSQL 17




This project is very, very, and very complex.
The requirements demand deep and dive thinking and deep dive analyzations with reasoning.

You must follow these steps strictly, with full focus and justification at each stage:

1. First, analyze this prompt deeply.

2. Then, it again with even more depth and reflection.

3. After that, create a proper and complete plan for how to fix or create  this.

4. Only after fully completing all thinking, analyzation, and planning — then and only then — you may begin implementation.

Every step must be followed with deep reasoning. No step can be skipped.
This is mandatory." 









I'm working on Edu Matrix Interlinked - a complex education platform:

TECH STACK (mandatory to use):
 use official methods and functions and files only, no custom implementations allowed:
- Next.js 15 + React 19 + TypeScript  
- PostgreSQL + Prisma ORM  
- Redis (ioredis package) - for caching and sessions
- Apache Kafka (kafkajs package) - for event streaming
- Socket.IO - for real-time features
- NextAuth.js 5.0 - authentication
- Docker Compose - all services running locally

CRITICAL RULES:
1. Always use OFFICIAL packages and methods only
2. Redis = use ioredis package for caching user data, sessions
3. Kafka = use kafkajs package for events between services  
4. Socket.IO = use for real-time chat, notifications
5. All services run on Docker - check health endpoints first
6. Never create custom implementations - use official patterns

PROJECT STRUCTURE:
- Health endpoints: /api/health/* (all working)
- Services: PostgreSQL:5432, Redis:6379, Kafka:9092, Socket.IO:3001
- Environment: All Docker containers are healthy and running

Use these services:
- Redis for: [caching what?]
- Kafka for: [what events?] 
- Socket.IO for: [what real-time features?]

Follow official Next.js 15 patterns only.


