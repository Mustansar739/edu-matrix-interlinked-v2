import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const locationSchema = z.object({
  conversationId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().optional(),
  address: z.string().optional(),
  isLive: z.boolean().default(false),
  content: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const data = locationSchema.parse(await request.json());

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: data.conversationId,
        userId: session.user.id,
        isHidden: false,
      }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Create location message
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: session.user.id,
        content: data.content || `Shared ${data.isLive ? 'live location' : 'location'}`,
        messageType: 'LOCATION',
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        mediaMetadata: {
          address: data.address,
          isLive: data.isLive,
          sharedAt: new Date().toISOString(),
          accuracy: null // Could be sent from client
        }
      },
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
            type: true,
            participants: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    // Update conversation last activity
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastActivity: new Date() }
    });

    // Emit real-time event via Socket.IO
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToRoom(`conversation:${data.conversationId}`, 'message:location_shared', {
        messageId: message.id,
        conversationId: data.conversationId,
        senderId: session.user.id,
        senderName: session.user.name || 'Someone',
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        address: data.address,
        isLive: data.isLive,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
      });

      // If live location, notify participants
      if (data.isLive) {
        await socketEmitter.emitToRoom(`conversation:${data.conversationId}`, 'location:live_started', {
          userId: session.user.id,
          userName: session.user.name || 'Someone',
          conversationId: data.conversationId,
          messageId: message.id,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (realtimeError) {
      console.warn('Failed to emit location update:', realtimeError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        messageType: message.messageType,
        latitude: message.latitude,
        longitude: message.longitude,
        locationName: message.locationName,
        address: data.address,
        isLive: data.isLive,
        createdAt: message.createdAt,
        senderId: message.senderId
      }
    });

  } catch (error) {
    console.error('Location sharing API Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to share location' },
      { status: 500 }
    );
  }
}

// PATCH /api/messages/location - Update live location
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { messageId, latitude, longitude, address } = await request.json();

    if (!messageId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, latitude, longitude' },
        { status: 400 }
      );
    }

    // Verify message exists and user owns it
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: session.user.id,
        messageType: 'LOCATION',
      },
      include: {
        conversation: {
          select: {
            id: true,
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Location message not found or access denied' },
        { status: 404 }
      );
    }

    // Check if this is a live location
    const metadata = message.mediaMetadata as any;
    if (!metadata?.isLive) {
      return NextResponse.json(
        { error: 'This is not a live location message' },
        { status: 400 }
      );
    }

    // Update location coordinates
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        latitude,
        longitude,
        mediaMetadata: {
          ...metadata,
          address,
          lastUpdate: new Date().toISOString()
        }
      }
    });

    // Emit real-time location update
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToRoom(`conversation:${message.conversationId}`, 'location:live_updated', {
        messageId,
        userId: session.user.id,
        userName: session.user.name || 'Someone',
        conversationId: message.conversationId,
        latitude,
        longitude,
        address,
        timestamp: new Date().toISOString(),
      });
    } catch (realtimeError) {
      console.warn('Failed to emit live location update:', realtimeError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: updatedMessage.id,
        latitude: updatedMessage.latitude,
        longitude: updatedMessage.longitude,
        address,
        updatedAt: updatedMessage.updatedAt
      }
    });

  } catch (error) {
    console.error('Live location update API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update live location' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/location - Stop live location sharing
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing required field: messageId' },
        { status: 400 }
      );
    }

    // Verify message exists and user owns it
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: session.user.id,
        messageType: 'LOCATION',
      }
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Location message not found or access denied' },
        { status: 404 }
      );
    }

    // Update metadata to stop live sharing
    const metadata = message.mediaMetadata as any;
    await prisma.message.update({
      where: { id: messageId },
      data: {
        mediaMetadata: {
          ...metadata,
          isLive: false,
          stoppedAt: new Date().toISOString()
        }
      }
    });

    // Emit real-time event
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToRoom(`conversation:${message.conversationId}`, 'location:live_stopped', {
        messageId,
        userId: session.user.id,
        userName: session.user.name || 'Someone',
        conversationId: message.conversationId,
        timestamp: new Date().toISOString(),
      });
    } catch (realtimeError) {
      console.warn('Failed to emit live location stop:', realtimeError);
    }

    return NextResponse.json({
      success: true,
      message: 'Live location sharing stopped'
    });

  } catch (error) {
    console.error('Stop live location API Error:', error);
    return NextResponse.json(
      { error: 'Failed to stop live location sharing' },
      { status: 500 }
    );
  }
}
