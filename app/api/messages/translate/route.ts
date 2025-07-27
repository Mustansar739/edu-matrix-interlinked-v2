import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const translateSchema = z.object({
  messageId: z.string().uuid(),
  targetLanguage: z.string().min(2).max(5), // Language codes like 'en', 'es', 'fr', etc.
  conversationId: z.string().uuid().optional(), // For verification
});

// Simple translation map for demo - in production, use Google Translate API, Azure Translator, etc.
const DEMO_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en': {
    'es': 'This is a demo translation to Spanish',
    'fr': 'Ceci est une traduction de démonstration en français',
    'de': 'Dies ist eine Demo-Übersetzung ins Deutsche',
    'it': 'Questa è una traduzione demo in italiano',
    'pt': 'Esta é uma tradução de demonstração para o português',
    'zh': '这是中文演示翻译',
    'ja': 'これは日本語のデモ翻訳です',
    'ko': '이것은 한국어 데모 번역입니다',
    'ar': 'هذه ترجمة تجريبية باللغة العربية',
    'hi': 'यह हिंदी में एक डेमो अनुवाद है'
  }
};

// Simulate translation API call
async function translateText(text: string, targetLanguage: string): Promise<string> {
  // In production, replace with actual translation service
  // For now, return a demo translation or the original text
  
  if (DEMO_TRANSLATIONS['en'][targetLanguage]) {
    return `${DEMO_TRANSLATIONS['en'][targetLanguage]} (Original: "${text}")`;
  }
  
  // Return original text if no translation available
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const data = translateSchema.parse(await request.json());

    // Get the message and verify access
    const message = await prisma.message.findFirst({
      where: {
        id: data.messageId,
        isDeleted: false,
      },
      include: {
        conversation: {
          include: {
            participants: {
              where: {
                userId: session.user.id,
                isHidden: false,
              }
            }
          }
        }
      }
    });

    if (!message || message.conversation.participants.length === 0) {
      return NextResponse.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      );
    }

    // Verify conversation ID if provided
    if (data.conversationId && message.conversationId !== data.conversationId) {
      return NextResponse.json(
        { error: 'Message does not belong to specified conversation' },
        { status: 400 }
      );
    }

    // Check if message has translatable content
    if (!message.content || message.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message has no translatable content' },
        { status: 400 }
      );
    }

    // Check if we already have a translation for this language
    const existingTranslation = await prisma.messageTranslation.findFirst({
      where: {
        messageId: data.messageId,
        targetLanguage: data.targetLanguage,
      }
    });

    if (existingTranslation) {
      return NextResponse.json({
        success: true,
        translation: {
          id: existingTranslation.id,
          messageId: existingTranslation.messageId,
          originalText: message.content,
          translatedText: existingTranslation.translatedText,
          targetLanguage: existingTranslation.targetLanguage,
          sourceLanguage: existingTranslation.sourceLanguage,
          translatedAt: existingTranslation.createdAt,
          confidence: existingTranslation.confidence,
        }
      });
    }

    // Perform translation
    const translatedText = await translateText(message.content, data.targetLanguage);

    // Store translation in database
    const translation = await prisma.messageTranslation.create({
      data: {
        messageId: data.messageId,
        originalText: message.content,
        translatedText,
        sourceLanguage: 'auto', // Auto-detect in production
        targetLanguage: data.targetLanguage,
        confidence: 0.95, // Demo confidence score
        translatedBy: session.user.id,
      }
    });

    // Emit real-time event if needed
    try {
      const { SocketIOEmitter } = await import('../../../../lib/socket/socket-emitter');
      const socketEmitter = SocketIOEmitter.getInstance();
      
      await socketEmitter.emitToUser(session.user.id, 'message:translated', {
        messageId: data.messageId,
        translationId: translation.id,
        targetLanguage: data.targetLanguage,
        translatedText,
        timestamp: new Date().toISOString(),
      });
    } catch (realtimeError) {
      console.warn('Failed to emit translation event:', realtimeError);
    }

    return NextResponse.json({
      success: true,
      translation: {
        id: translation.id,
        messageId: translation.messageId,
        originalText: message.content,
        translatedText: translation.translatedText,
        targetLanguage: translation.targetLanguage,
        sourceLanguage: translation.sourceLanguage,
        translatedAt: translation.createdAt,
        confidence: translation.confidence,
      }
    });

  } catch (error) {
    console.error('Translation API Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to translate message' },
      { status: 500 }
    );
  }
}

// GET /api/messages/translate - Get existing translations for a message
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId parameter' },
        { status: 400 }
      );
    }

    // Verify access to message
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        isDeleted: false,
      },
      include: {
        conversation: {
          include: {
            participants: {
              where: {
                userId: session.user.id,
                isHidden: false,
              }
            }
          }
        }
      }
    });

    if (!message || message.conversation.participants.length === 0) {
      return NextResponse.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      );
    }

    // Get all translations for this message
    const translations = await prisma.messageTranslation.findMany({
      where: {
        messageId,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      originalText: message.content,
      translations: translations.map(t => ({
        id: t.id,
        translatedText: t.translatedText,
        targetLanguage: t.targetLanguage,
        sourceLanguage: t.sourceLanguage,
        confidence: t.confidence,
        translatedAt: t.createdAt,
      }))
    });

  } catch (error) {
    console.error('Get translations API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get translations' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/translate - Delete a translation
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { translationId } = await request.json();

    if (!translationId) {
      return NextResponse.json(
        { error: 'Missing translationId' },
        { status: 400 }
      );
    }

    // Verify translation exists and user has access
    const translation = await prisma.messageTranslation.findFirst({
      where: {
        id: translationId,
        translatedBy: session.user.id, // Only allow deletion by user who created it
      }
    });

    if (!translation) {
      return NextResponse.json(
        { error: 'Translation not found or access denied' },
        { status: 404 }
      );
    }

    // Delete translation
    await prisma.messageTranslation.delete({
      where: { id: translationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Translation deleted successfully'
    });

  } catch (error) {
    console.error('Delete translation API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete translation' },
      { status: 500 }
    );
  }
}
