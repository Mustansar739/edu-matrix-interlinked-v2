import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Session Test Debug ===');
    console.log('Request URL:', request.url);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const session = await auth();
    console.log('Session result:', session);
    
    // Get cookies directly from request
    const cookieHeader = request.headers.get('cookie');
    console.log('Cookie header:', cookieHeader);
    
    // Parse cookies manually
    const cookies = cookieHeader ? Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [name, ...rest] = c.split('=');
        return [name, rest.join('=')];
      })
    ) : {};
    console.log('Parsed cookies:', cookies);
    
    return NextResponse.json({
      hasSession: !!session,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      sessionData: session,
      cookieHeader,
      parsedCookies: cookies,
      headers: Object.fromEntries(request.headers.entries())
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json({ 
      error: 'Session test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
