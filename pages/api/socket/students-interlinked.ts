/**
 * ==========================================
 * STUDENTS INTERLINKED - SOCKET.IO INTEGRATION
 * ==========================================
 * Next.js 15+ API route for Socket.IO real-time functionality
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'
import { Server as NetServer } from 'http'
import { Socket } from 'net'
import { SOCKET_EVENTS } from '@/lib/services/student-interlinked/students-interlinked-realtime'
import { auth } from '@/lib/auth'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Extend Socket.IO socket with custom properties
interface ExtendedSocket extends Socket {
  userId?: string
  userEmail?: string
}

interface SocketServer extends NetServer {
  io?: ServerIO
}

interface NextApiResponseServerIO extends NextApiResponse {
  socket: Socket & {
    server: SocketServer
  }
}

const ioHandler = async (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('🔌 Setting up Socket.IO for Students Interlinked...')
    
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket/students-interlinked',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    // ==========================================
    // AUTHENTICATION MIDDLEWARE - Next.js 15+ Pattern
    // ==========================================
    io.use(async (socket: any, next) => {
      try {
        // Get session from socket handshake
        const session = await auth()
        
        if (!session?.user?.id) {
          return next(new Error('Authentication required'))
        }

        // Attach user info to socket
        socket.userId = session.user.id
        socket.userEmail = session.user.email
        
        next()
      } catch (error) {
        console.error('Socket auth error:', error)
        next(new Error('Authentication failed'))
      }
    })

    // ==========================================    // CONNECTION HANDLING
    // ==========================================
    io.on('connection', (socket: any) => {
      console.log(`✅ User connected: ${socket.id}`)
      
      // Join user to their personal room for notifications
      if (socket.userId) {
        socket.join(`user:${socket.userId}`)
        console.log(`👤 User ${socket.userId} joined personal room`)
      }

      // ==========================================
      // POST EVENTS
      // ==========================================
      
      // Join post room for real-time comments
      socket.on('join:post', (postId: string) => {
        socket.join(`post:${postId}`)
        console.log(`📝 User joined post room: ${postId}`)
      })

      // Leave post room
      socket.on('leave:post', (postId: string) => {
        socket.leave(`post:${postId}`)
        console.log(`📝 User left post room: ${postId}`)
      })

      // User is typing a comment
      socket.on('typing:comment', (data: { postId: string; isTyping: boolean }) => {
        socket.to(`post:${data.postId}`).emit(SOCKET_EVENTS.USER_TYPING, {
          userId: socket.userId,
          postId: data.postId,
          isTyping: data.isTyping,
        })
      })

      // ==========================================
      // STORY EVENTS
      // ==========================================
      
      // Join story room for real-time views
      socket.on('join:story', (storyId: string) => {
        socket.join(`story:${storyId}`)
        console.log(`📸 User joined story room: ${storyId}`)
      })

      // Leave story room
      socket.on('leave:story', (storyId: string) => {
        socket.leave(`story:${storyId}`)
        console.log(`📸 User left story room: ${storyId}`)
      })

      // ==========================================
      // USER PRESENCE
      // ==========================================
      
      // Update user online status
      socket.on('user:online', () => {
        if (socket.userId) {
          // Broadcast to friends that user is online
          socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
            userId: socket.userId,
            timestamp: Date.now(),
          })
        }
      })

      // ==========================================
      // FEED EVENTS
      // ==========================================
      
      // Join main feed for real-time updates
      socket.on('join:feed', () => {
        socket.join('main:feed')
        console.log(`📰 User joined main feed`)
      })

      // ==========================================
      // DISCONNECTION
      // ==========================================
      
      socket.on('disconnect', (reason: string) => {
        console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`)
        
        if (socket.userId) {
          // Broadcast to friends that user is offline
          socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
            userId: socket.userId,
            timestamp: Date.now(),
          })
        }
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export default ioHandler

// ==========================================
// HELPER FUNCTIONS FOR EMITTING EVENTS
// ==========================================

/**
 * Emit post created event to main feed
 */
export function emitPostCreated(io: ServerIO, postData: any) {
  io.to('main:feed').emit(SOCKET_EVENTS.POST_CREATED, postData)
}

/**
 * Emit post liked event to post room and author
 */
export function emitPostLiked(io: ServerIO, data: { postId: string; authorId: string; reaction: any }) {
  // To post room (for real-time like updates)
  io.to(`post:${data.postId}`).emit(SOCKET_EVENTS.POST_LIKED, data)
  
  // To post author (for notifications)
  io.to(`user:${data.authorId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
    type: 'post_liked',
    postId: data.postId,
    reaction: data.reaction,
    timestamp: Date.now(),
  })
}

/**
 * Emit new comment to post room and author
 */
export function emitCommentCreated(io: ServerIO, data: { postId: string; authorId: string; comment: any }) {
  // To post room (for real-time comments)
  io.to(`post:${data.postId}`).emit(SOCKET_EVENTS.POST_COMMENTED, data.comment)
  
  // To post author (for notifications)
  io.to(`user:${data.authorId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
    type: 'post_commented',
    postId: data.postId,
    comment: data.comment,
    timestamp: Date.now(),
  })
}

/**
 * Emit comment updated to post room
 */
export function emitCommentUpdated(io: ServerIO, data: { postId: string; comment: any }) {
  // To post room (for real-time comment updates)
  io.to(`post:${data.postId}`).emit(SOCKET_EVENTS.COMMENT_UPDATED, data.comment)
}

/**
 * Emit comment deleted to post room
 */
export function emitCommentDeleted(io: ServerIO, data: { postId: string; commentId: string; userId: string }) {
  // To post room (for real-time comment removal)
  io.to(`post:${data.postId}`).emit(SOCKET_EVENTS.COMMENT_DELETED, {
    commentId: data.commentId,
    userId: data.userId,
    timestamp: Date.now(),
  })
}

/**
 * Emit story created to followers
 */
export function emitStoryCreated(io: ServerIO, storyData: any, followerIds: string[]) {
  // Emit to each follower
  followerIds.forEach(followerId => {
    io.to(`user:${followerId}`).emit(SOCKET_EVENTS.STORY_CREATED, storyData)
  })
}

/**
 * Emit story viewed to story author
 */
export function emitStoryViewed(io: ServerIO, data: { storyId: string; authorId: string; viewerId: string }) {
  io.to(`user:${data.authorId}`).emit(SOCKET_EVENTS.STORY_VIEWED, {
    storyId: data.storyId,
    viewerId: data.viewerId,
    timestamp: Date.now(),
  })
}
