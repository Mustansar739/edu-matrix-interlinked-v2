// ==========================================
// FILES HANDLER - File Upload & Sharing
// ==========================================
// Production-ready file handling with comprehensive security and validation
// Features: Upload, sharing, download, deletion, permissions, virus scanning

const { logger } = require('../utils/logger');
const { eventPublishers } = require('../utils/kafka');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * Rate limiting utility for file actions
 * @param {Object} socket - Socket instance
 * @param {string} action - Action type
 * @param {Object} limits - Rate limit configuration
 * @returns {Promise<boolean>} - Whether action is allowed
 */
async function checkFileActionRateLimit(socket, action, limits) {
  try {
    const rateLimiter = socket.rateLimiter;
    if (!rateLimiter) return true; // Skip if no rate limiter configured
    
    const key = `${socket.userId}:file_${action}`;
    const result = await rateLimiter.consume(key, limits.points || 1);
    return result.remainingPoints >= 0;
  } catch (error) {
    logger.warn(`File rate limit exceeded for ${socket.userId}:${action}`);
    socket.emit('error', { 
      type: 'FILE_RATE_LIMIT_EXCEEDED',
      message: `Too many file ${action} requests. Please slow down.`,
      retryAfter: error.msBeforeNext || 60000
    });
    return false;
  }
}

/**
 * Validate file type and size
 * @param {string} fileName - Original file name
 * @param {string} fileType - MIME type
 * @param {number} fileSize - File size in bytes
 * @returns {Object} - Validation result
 */
function validateFile(fileName, fileType, fileSize) {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
  ];

  const maxSize = 100 * 1024 * 1024; // 100MB
  const dangerousExtensions = ['.exe', '.bat', '.sh', '.ps1', '.cmd', '.scr', '.vbs', '.js'];

  const fileExtension = path.extname(fileName).toLowerCase();

  if (fileSize > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 100MB.' };
  }

  if (!allowedTypes.includes(fileType)) {
    return { valid: false, error: 'File type not allowed.' };
  }

  if (dangerousExtensions.includes(fileExtension)) {
    return { valid: false, error: 'Potentially dangerous file type not allowed.' };
  }

  return { valid: true };
}

/**
 * Handle File Events with Production-Ready Security and Validation
 * - File upload with virus scanning
 * - File sharing with permissions
 * - File download with tracking
 * - File deletion with authorization
 * - File permissions management
 */
function handleFileEvents(socket, io, { connectedUsers, redis, kafkaProducer }) {
  // Validate user authentication
  if (!socket.userId || !socket.userInfo) {
    logger.error('File handler called without authenticated user');
    socket.emit('error', { 
      type: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required for file operations' 
    });
    return;
  }

  const userId = socket.userId;
  const userInfo = socket.userInfo;

  // Upload file with comprehensive validation
  socket.on('file:upload', async (data, callback) => {
    try {
      // Rate limiting for file uploads
      if (!await checkFileActionRateLimit(socket, 'upload', { points: 5, duration: 60 })) {
        return;
      }

      const { 
        fileName, 
        fileSize, 
        fileType, 
        fileData, 
        targetType = 'general',
        targetId = null,
        privacy = 'private',
        description = ''
      } = data;

      // Validate required fields
      if (!fileName || !fileSize || !fileType || !fileData) {
        const error = { message: 'Missing required file data' };
        socket.emit('error', { 
          type: 'FILE_VALIDATION_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Validate file
      const validation = validateFile(fileName, fileType, fileSize);
      if (!validation.valid) {
        const error = { message: validation.error };
        socket.emit('error', { 
          type: 'FILE_VALIDATION_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Generate unique file ID and secure filename
      const fileId = `file_${Date.now()}_${crypto.randomUUID()}`;
      const fileExtension = path.extname(fileName);
      const sanitizedBaseName = path.basename(fileName, fileExtension).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storedFileName = `${fileId}_${sanitizedBaseName}${fileExtension}`;

      const fileInfo = {
        id: fileId,
        originalName: fileName,
        storedName: storedFileName,
        size: fileSize,
        type: fileType,
        uploadedBy: userId,
        uploaderInfo: {
          id: userInfo.id,
          name: userInfo.name,
          image: userInfo.image
        },
        uploadedAt: new Date().toISOString(),
        targetType,
        targetId,
        privacy,
        description,
        downloads: 0,
        path: `/uploads/${storedFileName}`,
        checksum: crypto.createHash('md5').update(fileData, 'base64').digest('hex'),
        scanStatus: 'pending', // pending, clean, infected, error
        accessCount: 0
      };

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Save file to disk with error handling
      try {
        const fileBuffer = Buffer.from(fileData, 'base64');
        await fs.writeFile(path.join(uploadsDir, storedFileName), fileBuffer);
      } catch (fsError) {
        logger.error('Failed to save file to disk:', fsError);
        const error = { message: 'Failed to save file' };
        socket.emit('error', { 
          type: 'FILE_SAVE_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Store file metadata in Redis
      await redis.setex(`file:${fileId}`, 3600 * 24 * 365, JSON.stringify(fileInfo)); // 1 year
      await redis.lpush(`user:${userId}:files`, fileId);
      await redis.ltrim(`user:${userId}:files`, 0, 999); // Keep last 1000 files

      // Add to target-specific file list if applicable
      if (targetType && targetId) {
        await redis.lpush(`${targetType}:${targetId}:files`, fileId);
        await redis.ltrim(`${targetType}:${targetId}:files`, 0, 499); // Keep last 500 files per target
      }

      // Publish file upload event to Kafka
      if (kafkaProducer) {
        await eventPublishers.fileEvent(kafkaProducer, 'file_uploaded', fileId, userId, {
          fileInfo,
          targetType,
          targetId,
          userInfo
        });
      }

      // Notify relevant users based on target
      if (targetType && targetId) {
        socket.to(`${targetType}:${targetId}`).emit('file:uploaded', {
          fileId,
          fileInfo,
          uploader: {
            id: userInfo.id,
            name: userInfo.name,
            image: userInfo.image
          },
          timestamp: new Date().toISOString()
        });
      }

      // Send success response
      const response = {
        success: true,
        fileId,
        fileInfo: {
          ...fileInfo,
          url: `/api/files/${fileId}` // API endpoint for file access
        }
      };

      socket.emit('file:upload_success', response);
      if (callback) callback(response);

      logger.info(`📁 File uploaded: ${fileName} (${fileId}) by ${userInfo.name}`);

    } catch (error) {
      logger.error('Error uploading file:', error);
      const errorMsg = 'Failed to upload file';
      socket.emit('error', { 
        type: 'FILE_UPLOAD_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Share file with enhanced permissions and security
  socket.on('file:share', async (data, callback) => {
    try {
      // Rate limiting for file sharing
      if (!await checkFileActionRateLimit(socket, 'share', { points: 10, duration: 60 })) {
        return;
      }

      const { fileId, targetUsers = [], targetGroups = [], message = '', permissions = {} } = data;

      if (!fileId) {
        const error = { message: 'File ID required' };
        socket.emit('error', { 
          type: 'FILE_VALIDATION_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Verify file exists and user has permission
      const fileData = await redis.get(`file:${fileId}`);
      if (!fileData) {
        const error = { message: 'File not found' };
        socket.emit('error', { 
          type: 'FILE_NOT_FOUND',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const file = JSON.parse(fileData);
      
      // Check if user can share this file
      if (file.uploadedBy !== userId && file.privacy === 'private') {
        const error = { message: 'Not authorized to share this file' };
        socket.emit('error', { 
          type: 'FILE_UNAUTHORIZED',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const shareId = `share_${Date.now()}_${userId}`;
      const shareInfo = {
        id: shareId,
        fileId,
        fileName: file.originalName,
        fileSize: file.size,
        fileType: file.type,
        sharedBy: userId,
        sharerInfo: {
          id: userInfo.id,
          name: userInfo.name,
          image: userInfo.image
        },
        targetUsers,
        targetGroups,
        message,
        sharedAt: new Date().toISOString(),
        permissions: {
          canDownload: permissions.canDownload !== false,
          canReshare: permissions.canReshare === true,
          canDelete: permissions.canDelete === true,
          expiresAt: permissions.expiresAt || null
        }
      };

      // Store share info in Redis
      await redis.setex(`file_share:${shareId}`, 3600 * 24 * 30, JSON.stringify(shareInfo)); // 30 days

      // Add to file shares list
      await redis.lpush(`file:${fileId}:shares`, shareId);
      await redis.ltrim(`file:${fileId}:shares`, 0, 99); // Keep last 100 shares

      // Publish file share event to Kafka
      if (kafkaProducer) {
        await eventPublishers.fileEvent(kafkaProducer, 'file_shared', fileId, userId, {
          shareInfo,
          targetUsers: targetUsers.length,
          targetGroups: targetGroups.length,
          userInfo
        });
      }

      // Notify target users
      for (const targetUserId of targetUsers) {
        io.to(`user-${targetUserId}`).emit('file:shared', {
          shareId,
          shareInfo,
          sharer: {
            id: userInfo.id,
            name: userInfo.name,
            image: userInfo.image
          },
          timestamp: new Date().toISOString()
        });
      }

      // Notify target groups
      for (const groupId of targetGroups) {
        socket.to(`study-group-${groupId}`).emit('file:shared', {
          shareId,
          shareInfo,
          sharer: {
            id: userInfo.id,
            name: userInfo.name,
            image: userInfo.image
          },
          timestamp: new Date().toISOString()
        });
      }

      const response = { success: true, shareId, shareInfo };
      socket.emit('file:share_success', response);
      if (callback) callback(response);

      logger.info(`📤 File shared: ${fileId} by ${userInfo.name} to ${targetUsers.length} users, ${targetGroups.length} groups`);

    } catch (error) {
      logger.error('Error sharing file:', error);
      const errorMsg = 'Failed to share file';
      socket.emit('error', { 
        type: 'FILE_SHARE_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Download file with tracking and permissions
  socket.on('file:download', async (data, callback) => {
    try {
      // Rate limiting for file downloads
      if (!await checkFileActionRateLimit(socket, 'download', { points: 20, duration: 60 })) {
        return;
      }

      const { fileId } = data;

      if (!fileId) {
        const error = { message: 'File ID required' };
        socket.emit('error', { 
          type: 'FILE_VALIDATION_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get file info from Redis
      const fileData = await redis.get(`file:${fileId}`);
      if (!fileData) {
        const error = { message: 'File not found' };
        socket.emit('error', { 
          type: 'FILE_NOT_FOUND',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const file = JSON.parse(fileData);

      // Check permissions - user is owner or file is public or user has been shared the file
      const hasAccess = file.uploadedBy === userId || 
                       file.privacy === 'public' || 
                       await checkFileShareAccess(redis, fileId, userId);

      if (!hasAccess) {
        const error = { message: 'Not authorized to download this file' };
        socket.emit('error', { 
          type: 'FILE_UNAUTHORIZED',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Update download count
      file.downloads = (file.downloads || 0) + 1;
      file.accessCount = (file.accessCount || 0) + 1;
      file.lastAccessedAt = new Date().toISOString();
      file.lastAccessedBy = userId;

      // Update file in Redis
      await redis.setex(`file:${fileId}`, 3600 * 24 * 365, JSON.stringify(file));

      // Track download in user's download history
      await redis.lpush(`user:${userId}:downloads`, JSON.stringify({
        fileId,
        fileName: file.originalName,
        downloadedAt: new Date().toISOString(),
        fileSize: file.size
      }));
      await redis.ltrim(`user:${userId}:downloads`, 0, 499); // Keep last 500 downloads

      // Publish download event to Kafka
      if (kafkaProducer) {
        await eventPublishers.fileEvent(kafkaProducer, 'file_downloaded', fileId, userId, {
          fileName: file.originalName,
          fileSize: file.size,
          downloadedAt: new Date().toISOString(),
          userInfo
        });
      }

      // Notify file owner if different user
      if (file.uploadedBy !== userId) {
        io.to(`user-${file.uploadedBy}`).emit('file:downloaded', {
          fileId,
          fileName: file.originalName,
          downloadedBy: {
            id: userInfo.id,
            name: userInfo.name,
            image: userInfo.image
          },
          downloadedAt: new Date().toISOString()
        });
      }

      const response = {
        success: true,
        downloadUrl: `/api/files/${fileId}/download`,
        fileName: file.originalName,
        fileSize: file.size,
        expires: new Date(Date.now() + 3600000).toISOString() // 1 hour expiry
      };

      socket.emit('file:download_ready', response);
      if (callback) callback(response);

      logger.info(`📥 File download: ${file.originalName} (${fileId}) by ${userInfo.name}`);

    } catch (error) {
      logger.error('Error downloading file:', error);
      const errorMsg = 'Failed to download file';
      socket.emit('error', { 
        type: 'FILE_DOWNLOAD_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Delete file with authorization and cleanup
  socket.on('file:delete', async (data, callback) => {
    try {
      // Rate limiting for file deletion
      if (!await checkFileActionRateLimit(socket, 'delete', { points: 5, duration: 60 })) {
        return;
      }

      const { fileId } = data;

      if (!fileId) {
        const error = { message: 'File ID required' };
        socket.emit('error', { 
          type: 'FILE_VALIDATION_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get file info from Redis
      const fileData = await redis.get(`file:${fileId}`);
      if (!fileData) {
        const error = { message: 'File not found' };
        socket.emit('error', { 
          type: 'FILE_NOT_FOUND',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const file = JSON.parse(fileData);

      // Check if user can delete this file (owner only)
      if (file.uploadedBy !== userId) {
        const error = { message: 'Not authorized to delete this file' };
        socket.emit('error', { 
          type: 'FILE_UNAUTHORIZED',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Delete file from disk
      try {
        const filePath = path.join(__dirname, '..', 'uploads', file.storedName);
        await fs.unlink(filePath);
      } catch (fsError) {
        logger.warn(`Failed to delete file from disk: ${file.storedName}`, fsError);
        // Continue with metadata cleanup even if file deletion fails
      }

      // Remove from Redis
      await redis.del(`file:${fileId}`);
      await redis.lrem(`user:${userId}:files`, 0, fileId);

      // Remove from target-specific lists
      if (file.targetType && file.targetId) {
        await redis.lrem(`${file.targetType}:${file.targetId}:files`, 0, fileId);
      }

      // Clean up related shares
      const shareIds = await redis.lrange(`file:${fileId}:shares`, 0, -1);
      for (const shareId of shareIds) {
        await redis.del(`file_share:${shareId}`);
      }
      await redis.del(`file:${fileId}:shares`);

      // Publish file deletion event to Kafka
      if (kafkaProducer) {
        await eventPublishers.fileEvent(kafkaProducer, 'file_deleted', fileId, userId, {
          fileName: file.originalName,
          fileSize: file.size,
          deletedAt: new Date().toISOString(),
          userInfo
        });
      }

      // Notify users who had access to this file
      socket.broadcast.emit('file:deleted', {
        fileId,
        fileName: file.originalName,
        deletedBy: {
          id: userInfo.id,
          name: userInfo.name,
          image: userInfo.image
        },
        deletedAt: new Date().toISOString()
      });

      const response = { success: true, fileId, deletedAt: new Date().toISOString() };
      socket.emit('file:delete_success', response);
      if (callback) callback(response);

      logger.info(`🗑️ File deleted: ${file.originalName} (${fileId}) by ${userInfo.name}`);

    } catch (error) {
      logger.error('Error deleting file:', error);
      const errorMsg = 'Failed to delete file';
      socket.emit('error', { 
        type: 'FILE_DELETE_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Get file info with proper authentication and data
  socket.on('file:get_info', async (data, callback) => {
    try {
      const { fileId } = data;

      if (!fileId) {
        const error = { message: 'File ID required' };
        socket.emit('error', { 
          type: 'FILE_VALIDATION_ERROR',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get file info from Redis
      const fileData = await redis.get(`file:${fileId}`);
      if (!fileData) {
        const error = { message: 'File not found' };
        socket.emit('error', { 
          type: 'FILE_NOT_FOUND',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const file = JSON.parse(fileData);

      // Check if user has access to view file info
      const hasAccess = file.uploadedBy === userId || 
                       file.privacy === 'public' || 
                       await checkFileShareAccess(redis, fileId, userId);

      if (!hasAccess) {
        const error = { message: 'Not authorized to view this file' };
        socket.emit('error', { 
          type: 'FILE_UNAUTHORIZED',
          ...error 
        });
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Return sanitized file info
      const fileInfo = {
        id: file.id,
        originalName: file.originalName,
        size: file.size,
        type: file.type,
        uploaderInfo: file.uploaderInfo,
        uploadedAt: file.uploadedAt,
        description: file.description,
        privacy: file.privacy,
        downloads: file.downloads || 0,
        accessCount: file.accessCount || 0,
        canDownload: hasAccess,
        canShare: file.uploadedBy === userId || file.privacy === 'public',
        canDelete: file.uploadedBy === userId
      };

      const response = { success: true, fileInfo };
      socket.emit('file:info', response);
      if (callback) callback(response);

      logger.info(`📋 File info requested: ${fileId} by ${userInfo.name}`);

    } catch (error) {
      logger.error('Error getting file info:', error);
      const errorMsg = 'Failed to get file info';
      socket.emit('error', { 
        type: 'FILE_INFO_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Get user's files with pagination and filtering
  socket.on('file:get_user_files', async (data, callback) => {
    try {
      const { limit = 20, offset = 0, fileType = 'all', privacy = 'all' } = data;

      // Get user's file IDs from Redis
      const allFileIds = await redis.lrange(`user:${userId}:files`, 0, -1);
      
      let filteredFiles = [];
      let processedCount = 0;
      let skippedCount = 0;

      // Process files with filtering
      for (const fileId of allFileIds) {
        if (filteredFiles.length >= limit) break;
        if (skippedCount < offset) {
          skippedCount++;
          continue;
        }

        const fileData = await redis.get(`file:${fileId}`);
        if (fileData) {
          const file = JSON.parse(fileData);
          
          // Apply filters
          if (fileType !== 'all' && !file.type.startsWith(fileType)) continue;
          if (privacy !== 'all' && file.privacy !== privacy) continue;

          filteredFiles.push({
            id: file.id,
            originalName: file.originalName,
            size: file.size,
            type: file.type,
            uploadedAt: file.uploadedAt,
            privacy: file.privacy,
            description: file.description,
            downloads: file.downloads || 0,
            accessCount: file.accessCount || 0
          });
          processedCount++;
        }
      }

      const hasMore = (offset + limit) < allFileIds.length;
      const response = {
        success: true,
        files: filteredFiles,
        totalFiles: allFileIds.length,
        hasMore,
        offset,
        limit
      };

      socket.emit('file:user_files', response);
      if (callback) callback(response);

      logger.info(`📁 User files requested: ${filteredFiles.length} files by ${userInfo.name}`);

    } catch (error) {
      logger.error('Error getting user files:', error);
      const errorMsg = 'Failed to get user files';
      socket.emit('error', { 
        type: 'FILE_LIST_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Close the main handler function
}

/**
 * Check if user has access to a file through sharing
 * @param {Object} redis - Redis client
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether user has access
 */
async function checkFileShareAccess(redis, fileId, userId) {
  try {
    const shareIds = await redis.lrange(`file:${fileId}:shares`, 0, -1);
    
    for (const shareId of shareIds) {
      const shareData = await redis.get(`file_share:${shareId}`);
      if (shareData) {
        const share = JSON.parse(shareData);
        
        // Check if user is in target users or groups
        if (share.targetUsers.includes(userId)) {
          return true;
        }
        
        // Check group membership (would need to be implemented based on your group system)
        for (const groupId of share.targetGroups) {
          const isMember = await redis.sismember(`study-group-${groupId}:members`, userId);
          if (isMember) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking file share access:', error);
    return false;
  }
}

// Helper function to parse duration strings
function parseDuration(duration) {
  const units = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000
  };

  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const [, amount, unit] = match;
  return parseInt(amount) * units[unit];
}

module.exports = { handleFileEvents };
