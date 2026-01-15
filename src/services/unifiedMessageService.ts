/**
 * Unified Message Service
 * Consolidates messaging functionality across customer, vendor, and admin roles
 */

import { messageService, type Message, type Conversation, type MessageFilters, type UserStatus } from './messageService';
import { socketService } from './socketService';
import { toast } from '@/hooks/use-toast';

type UserRole = 'customer' | 'vendor' | 'admin' | 'subadmin';

interface UnifiedMessageConfig {
  role: UserRole;
  userId: string;
}

class UnifiedMessageService {
  private config: UnifiedMessageConfig | null = null;

  /**
   * Initialize the service with user configuration
   */
  initialize(config: UnifiedMessageConfig) {
    this.config = config;
    console.log('🔧 UnifiedMessageService initialized:', config);
  }

  /**
   * Get conversations based on user role
   */
  async getConversations(filters: MessageFilters = {}): Promise<{
    conversations: Conversation[];
    pagination: any;
  }> {
    if (!this.config) {
      throw new Error('UnifiedMessageService not initialized');
    }

    // Add role-specific filters if needed
    const roleFilters = this.getRoleSpecificFilters(filters);

    return await messageService.getConversations(roleFilters);
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
    markAsRead: boolean = true
  ): Promise<{
    messages: Message[];
    pagination: any;
  }> {
    const result = await messageService.getConversationMessages(
      conversationId,
      page,
      limit,
      markAsRead
    );

    // Normalize all messages to use content field consistently
    result.messages = result.messages.map(msg => messageService.normalizeMessage(msg));

    return result;
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    recipientId?: string,
    attachments?: Array<{ type: 'image' | 'document'; url: string; name: string; size?: number }>
  ): Promise<Message> {
    const message = await messageService.sendMessage(
      conversationId,
      content,
      recipientId,
      attachments
    );

    return messageService.normalizeMessage(message);
  }

  /**
   * Upload attachment
   */
  async uploadAttachment(file: File): Promise<{
    type: 'image' | 'document';
    url: string;
    name: string;
    size: number;
  }> {
    return await messageService.uploadAttachment(file);
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    await messageService.markMessageAsRead(messageId);
  }

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    await messageService.markConversationAsRead(conversationId);
  }

  /**
   * Delete message (role-based permissions)
   */
  async deleteMessage(messageId: string): Promise<void> {
    if (!this.canDeleteMessages()) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to delete messages',
        variant: 'destructive'
      });
      throw new Error('Permission denied');
    }

    await messageService.deleteMessage(messageId);
  }

  /**
   * Delete conversation (role-based permissions)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.canDeleteConversations()) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to delete conversations',
        variant: 'destructive'
      });
      throw new Error('Permission denied');
    }

    await messageService.deleteConversation(conversationId);
  }

  /**
   * Update conversation status (archive/unarchive)
   */
  async updateConversationStatus(conversationId: string, status: string): Promise<void> {
    await messageService.updateConversationStatus(conversationId, status);
  }

  /**
   * Get user status
   */
  async getUserStatus(userId: string): Promise<UserStatus> {
    return await messageService.getUserStatus(userId);
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    return await messageService.getUnreadCount();
  }

  /**
   * Socket.IO Methods - Real-time communication
   */

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string) {
    socketService.joinConversation(conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    socketService.leaveConversation(conversationId);
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string) {
    socketService.startTyping(conversationId);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string) {
    socketService.stopTyping(conversationId);
  }

  /**
   * Mark message as read via socket
   */
  markMessageAsReadSocket(messageId: string, conversationId: string) {
    socketService.markMessageAsRead(messageId, conversationId);
  }

  /**
   * Mark conversation as read via socket
   */
  markConversationAsReadSocket(conversationId: string) {
    socketService.markConversationAsRead(conversationId);
  }

  /**
   * Update online status
   */
  updateOnlineStatus(status: 'online' | 'offline' | 'away') {
    socketService.updateOnlineStatus(status);
  }

  /**
   * Utility Methods
   */

  /**
   * Format message timestamp
   */
  formatTime(dateString: string): string {
    return messageService.formatTime(dateString);
  }

  /**
   * Get message content (handles both content and message fields)
   */
  getMessageContent(message: Message): string {
    return messageService.getMessageContent(message);
  }

  /**
   * Check if message is auto-response
   */
  isAutoResponse(message: Message): boolean {
    return messageService.isAutoResponse(message);
  }

  /**
   * Format price for display
   */
  formatPrice(price: number, listingType: 'sale' | 'rent'): string {
    return messageService.formatPrice(price, listingType);
  }

  /**
   * Get priority badge color
   */
  getPriorityColor(priority?: 'low' | 'medium' | 'high' | 'urgent'): string {
    return messageService.getPriorityColor(priority);
  }

  /**
   * Get status badge color
   */
  getStatusColor(status?: 'unread' | 'read' | 'responded' | 'archived'): string {
    return messageService.getStatusColor(status);
  }

  /**
   * Role-based Permission Checks
   */

  private canDeleteMessages(): boolean {
    if (!this.config) return false;
    // Admins and subadmins can delete any message
    // Customers and vendors can delete their own messages
    return ['admin', 'subadmin', 'customer', 'vendor'].includes(this.config.role);
  }

  private canDeleteConversations(): boolean {
    if (!this.config) return false;
    // Admins and subadmins can delete any conversation
    // Customers and vendors can delete their own conversations
    return ['admin', 'subadmin', 'customer', 'vendor'].includes(this.config.role);
  }

  private canAccessAdminFeatures(): boolean {
    if (!this.config) return false;
    return ['admin', 'subadmin'].includes(this.config.role);
  }

  /**
   * Get role-specific filters
   */
  private getRoleSpecificFilters(filters: MessageFilters): MessageFilters {
    if (!this.config) return filters;

    const roleFilters = { ...filters };

    // Add role-specific filtering logic here
    switch (this.config.role) {
      case 'admin':
      case 'subadmin':
        // Admins can see all messages
        break;
      case 'vendor':
        // Vendors only see their property-related messages
        break;
      case 'customer':
        // Customers only see their own messages
        break;
    }

    return roleFilters;
  }

  /**
   * Get role-specific conversation list title
   */
  getConversationListTitle(): string {
    if (!this.config) return 'Conversations';

    switch (this.config.role) {
      case 'admin':
      case 'subadmin':
        return 'All Conversations';
      case 'vendor':
        return 'Property Inquiries';
      case 'customer':
        return 'My Messages';
      default:
        return 'Conversations';
    }
  }

  /**
   * Check if Socket.IO is connected
   */
  isSocketConnected(): boolean {
    return socketService.isConnected();
  }
}

// Export singleton instance
export const unifiedMessageService = new UnifiedMessageService();
export default unifiedMessageService;
