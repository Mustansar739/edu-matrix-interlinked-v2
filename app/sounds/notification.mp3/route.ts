/**
 * Notification Sound API Route
 * Handles the notification.mp3 file requests with proper HTTP headers
 * Fixes 416 Range Request errors
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'sounds', 'notification.mp3');
    
    // Check if file exists and has content
    if (!fs.existsSync(filePath)) {
      console.warn('Notification sound file not found, returning 204 No Content');
      return new NextResponse(null, { status: 204 });
    }

    const stats = fs.statSync(filePath);
    
    // If file is empty, return 204 No Content instead of 416
    if (stats.size === 0) {
      console.warn('Notification sound file is empty, returning 204 No Content');
      return new NextResponse(null, { status: 204 });
    }

    // Handle range requests properly
    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      
      // Validate range
      if (start >= stats.size || end >= stats.size) {
        return new NextResponse('Range Not Satisfiable', { 
          status: 416,
          headers: {
            'Content-Range': `bytes */${stats.size}`,
          }
        });
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      
      return new NextResponse(file as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } else {
      // Serve full file
      const file = fs.createReadStream(filePath);
      
      return new NextResponse(file as any, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': stats.size.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  } catch (error) {
    console.error('Error serving notification sound:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
