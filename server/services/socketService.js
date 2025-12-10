// Socket.IO Service for Real-time Messaging
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

class SocketService {
  constructor() {
    this.io = null;
    this.users = new Map(); // userId -> { socketId, socket, lastSeen }
    this.typingUsers = new Map(); // conversationId -> Set of userIds
    this.onlineUsers = new Set(); // Set of online userIds
  }

  initialize(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupConnectionHandlers();
    console.log('✅ Socket.IO service initialized');
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId || decoded.id;
        socket.userRole = decoded.role;
        
        // Update user online status in database
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: true,
          lastSeen: new Date()
        });

        next();
      } catch (err) {
        console.error('Socket authentication error:', err.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupConnectionHandlers() {
    this.io.on('connection', async (socket) => {
      const userId = socket.userId;
      console.log(`🔌 User ${userId} connected (${socket.userRole})`);

      // Store user connection
      this.users.set(userId, {
        socketId: socket.id,
        socket: socket,
        lastSeen: new Date()
      });
      this.onlineUsers.add(userId);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Broadcast user online status
      this.broadcastUserStatus(userId, true);

      // Send queued notifications
      const notificationService = require('./notificationService');
      notificationService.sendQueuedNotifications(userId);

      // Handle joining conversations
      socket.on('join_conversation', async (conversationId) => {
        try {
          socket.join(`conversation:${conversationId}`);
          console.log(`User ${userId} joined conversation ${conversationId}`);
          
          // Notify others in conversation
          socket.to(`conversation:${conversationId}`).emit('user_joined_conversation', {
            userId,
            conversationId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversations
      socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${userId} left conversation ${conversationId}`);
        
        // Stop typing if user was typing
        this.handleTypingStop(userId, conversationId);
        
        // Notify others
        socket.to(`conversation:${conversationId}`).emit('user_left_conversation', {
          userId,
          conversationId,
          timestamp: new Date().toISOString()
        });
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          const { conversationId, recipientId, content, attachments } = data;

          if (!conversationId || !recipientId || !content?.trim()) {
            return socket.emit('message_error', { error: 'Invalid message data' });
          }

          // Verify user is part of conversation
          const userIds = conversationId.split('_');
          if (!userIds.includes(userId)) {
            return socket.emit('message_error', { error: 'Unauthorized' });
          }

          // Get existing message to extract property reference
          const existingMessage = await Message.findOne({ conversationId }).select('property');

          // Create message in database
          const messageData = {
            conversationId,
            sender: userId,
            recipient: recipientId,
            message: content.trim(),
            read: false
          };

          if (existingMessage?.property) {
            messageData.property = existingMessage.property;
          }

          if (attachments?.length > 0) {
            messageData.attachments = attachments;
          }

          const newMessage = await Message.create(messageData);
          await newMessage.populate([
            { path: 'sender', select: 'profile.firstName profile.lastName email role isOnline lastSeen' },
            { path: 'recipient', select: 'profile.firstName profile.lastName email role isOnline lastSeen' },
            { path: 'property', select: 'title price address city state images' }
          ]);

          // Stop typing indicator
          this.handleTypingStop(userId, conversationId);

          // Emit to conversation
          this.io.to(`conversation:${conversationId}`).emit('new_message', {
            message: newMessage,
            conversationId
          });

          // Send notification to recipient (check preferences first)
          const notificationService = require('./notificationService');
          const shouldNotify = await notificationService.checkUserNotificationPreferences(recipientId, 'new_message');

          if (shouldNotify) {
            this.io.to(`user:${recipientId}`).emit('message_notification', {
              conversationId,
              message: newMessage,
              senderId: userId,
              senderName: `${newMessage.sender.profile?.firstName} ${newMessage.sender.profile?.lastName}`.trim()
            });
          }

          // Confirm to sender
          socket.emit('message_sent', {
            tempId: data.tempId,
            message: newMessage
          });

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('message_error', {
            error: error.message || 'Failed to send message',
            tempId: data.tempId
          });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        const { conversationId } = data;
        if (!conversationId) return;

        this.handleTypingStart(userId, conversationId);
        
        // Notify others in conversation
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          userId,
          conversationId,
          isTyping: true,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('typing_stop', (data) => {
        const { conversationId } = data;
        if (!conversationId) return;

        this.handleTypingStop(userId, conversationId);
        
        // Notify others in conversation
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          userId,
          conversationId,
          isTyping: false,
          timestamp: new Date().toISOString()
        });
      });

      // Handle message read receipts
      socket.on('message_read', async (data) => {
        try {
          const { messageId, conversationId } = data;

          if (!messageId) return;

          // Update message in database
          const message = await Message.findByIdAndUpdate(
            messageId,
            {
              read: true,
              readAt: new Date()
            },
            { new: true }
          );

          if (message && message.recipient.toString() === userId) {
            // Notify sender
            this.io.to(`user:${message.sender.toString()}`).emit('message_read_receipt', {
              messageId,
              conversationId,
              readAt: message.readAt,
              readBy: userId
            });

            // Also emit to conversation
            if (conversationId) {
              socket.to(`conversation:${conversationId}`).emit('message_read_receipt', {
                messageId,
                conversationId,
                readAt: message.readAt,
                readBy: userId
              });
            }
          }
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

      // Handle conversation read (bulk read)
      socket.on('conversation_read', async (data) => {
        try {
          const { conversationId } = data;

          if (!conversationId) return;

          // Update all unread messages in conversation
          const result = await Message.updateMany(
            {
              conversationId,
              recipient: userId,
              read: false
            },
            {
              read: true,
              readAt: new Date()
            }
          );

          if (result.modifiedCount > 0) {
            // Get the other user in conversation
            const userIds = conversationId.split('_');
            const otherUserId = userIds.find(id => id !== userId);

            // Notify sender
            if (otherUserId) {
              this.io.to(`user:${otherUserId}`).emit('conversation_read', {
                conversationId,
                readBy: userId,
                readAt: new Date(),
                messageCount: result.modifiedCount
              });
            }
          }
        } catch (error) {
          console.error('Error marking conversation as read:', error);
        }
      });

      // Handle notification read/opened
      socket.on('notification_read', async (data) => {
        try {
          const { notificationTimestamp, notificationTitle } = data;
          const UserNotification = require('../models/UserNotification');

          console.log(`📖 Marking notification as read for user ${userId}:`, notificationTitle);

          // Mark user notification as read in UserNotification collection
          const updated = await UserNotification.findOneAndUpdate(
            {
              user: userId,
              title: notificationTitle,
              read: false
            },
            {
              $set: {
                read: true,
                readAt: new Date()
              }
            },
            { new: true }
          );

          if (updated) {
            console.log(`✅ UserNotification marked as read:`, { user: userId, title: updated.title });
          } else {
            console.log(`ℹ️ UserNotification already read or not found for user ${userId}`);
          }
        } catch (error) {
          console.error('❌ Error marking notification as read:', error);
        }
      });

      // Handle user activity updates
      socket.on('user_activity', async (data) => {
        try {
          await User.findByIdAndUpdate(userId, {
            lastSeen: new Date()
          });

          // Update stored user data
          const userData = this.users.get(userId);
          if (userData) {
            userData.lastSeen = new Date();
          }
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`🔌 User ${userId} disconnected`);

        try {
          // Update user offline status
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          // Remove from online users
          this.users.delete(userId);
          this.onlineUsers.delete(userId);

          // Clear typing indicators
          for (const [conversationId, typingSet] of this.typingUsers.entries()) {
            if (typingSet.has(userId)) {
              typingSet.delete(userId);
              this.io.to(`conversation:${conversationId}`).emit('user_typing', {
                userId,
                conversationId,
                isTyping: false,
                timestamp: new Date().toISOString()
              });
            }
          }

          // Broadcast user offline status
          this.broadcastUserStatus(userId, false);

        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });

      // Handle explicit online/offline status updates
      socket.on('update_online_status', async (data) => {
        try {
          const { status } = data; // 'online' | 'offline' | 'away'
          
          const isOnline = status === 'online';
          
          await User.findByIdAndUpdate(userId, {
            isOnline,
            lastSeen: new Date()
          });

          if (isOnline) {
            this.onlineUsers.add(userId);
          } else {
            this.onlineUsers.delete(userId);
          }

          this.broadcastUserStatus(userId, isOnline);
        } catch (error) {
          console.error('Error updating online status:', error);
        }
      });

      // Handle get online users
      socket.on('get_online_users', (data) => {
        const { userIds } = data;
        
        const onlineStatus = {};
        if (userIds && Array.isArray(userIds)) {
          userIds.forEach(id => {
            onlineStatus[id] = this.onlineUsers.has(id);
          });
        }
        
        socket.emit('online_users_status', onlineStatus);
      });
    });
  }

  handleTypingStart(userId, conversationId) {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId).add(userId);

    // Auto-clear typing after 5 seconds
    setTimeout(() => {
      this.handleTypingStop(userId, conversationId);
    }, 5000);
  }

  handleTypingStop(userId, conversationId) {
    const typingSet = this.typingUsers.get(conversationId);
    if (typingSet) {
      typingSet.delete(userId);
      if (typingSet.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  broadcastUserStatus(userId, isOnline) {
    this.io.emit('user_status_changed', {
      userId,
      isOnline,
      lastSeen: new Date().toISOString()
    });
  }

  // Utility method to send message to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Utility method to send to conversation
  sendToConversation(conversationId, event, data) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.onlineUsers.size;
  }
}

// Singleton instance
const socketService = new SocketService();

module.exports = socketService;
