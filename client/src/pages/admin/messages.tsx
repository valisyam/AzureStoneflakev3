import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  MessageSquare, 
  Send, 
  Users, 
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  User,
  Building2,
  Plus,
  Search,
  Paperclip,
  Download,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface MessageAttachment {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  isRead: boolean;
  attachments?: MessageAttachment[];
  sender: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'supplier' | 'admin';
    company?: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'supplier' | 'admin';
  };
}

interface Conversation {
  threadId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'customer' | 'supplier';
  userCompany?: string;
  customerNumber?: string;
  supplierNumber?: string;
  subject: string;
  category: string;
  lastMessage?: Message;
  unreadCount: number;
}

export default function AdminMessages() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationUserId, setNewConversationUserId] = useState('');
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const [newConversationCategory, setNewConversationCategory] = useState('general');
  const [newConversationContent, setNewConversationContent] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newConversationAttachments, setNewConversationAttachments] = useState<File[]>([]);
  const queryClient = useQueryClient();
  const conversationsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle page visibility to reduce polling when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden && document.visibilityState === 'visible';
      console.log('Visibility changed:', { hidden: document.hidden, visibilityState: document.visibilityState, isVisible });
      setIsPageVisible(isVisible);
    };

    // Set initial state
    const initialVisible = !document.hidden && document.visibilityState === 'visible';
    console.log('Initial visibility:', { hidden: document.hidden, visibilityState: document.visibilityState, initialVisible });
    setIsPageVisible(initialVisible);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Manual polling for conversations that respects page visibility
  useEffect(() => {
    const startConversationsPolling = () => {
      if (conversationsIntervalRef.current) {
        clearInterval(conversationsIntervalRef.current);
      }
      
      if (isPageVisible && !document.hidden && document.visibilityState === 'visible') {
        console.log('Starting conversations polling - page is visible');
        conversationsIntervalRef.current = setInterval(() => {
          console.log('Polling conversations - page visible check:', { isPageVisible, hidden: document.hidden, visibilityState: document.visibilityState });
          if (isPageVisible && !document.hidden && document.visibilityState === 'visible') {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/conversations'] });
          }
        }, 5000);
      } else {
        console.log('Stopping conversations polling - page not visible');
      }
    };

    startConversationsPolling();

    return () => {
      if (conversationsIntervalRef.current) {
        clearInterval(conversationsIntervalRef.current);
      }
    };
  }, [isPageVisible, queryClient]);

  // Manual polling for messages that respects page visibility  
  useEffect(() => {
    const startMessagesPolling = () => {
      if (messagesIntervalRef.current) {
        clearInterval(messagesIntervalRef.current);
      }
      
      if (isPageVisible && !document.hidden && document.visibilityState === 'visible' && selectedConversation) {
        console.log('Starting messages polling - page is visible and conversation selected');
        messagesIntervalRef.current = setInterval(() => {
          console.log('Polling messages - page visible check:', { isPageVisible, hidden: document.hidden, visibilityState: document.visibilityState, hasConversation: !!selectedConversation });
          if (isPageVisible && !document.hidden && document.visibilityState === 'visible' && selectedConversation) {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/thread', selectedConversation.threadId] });
          }
        }, 2000);
      } else {
        console.log('Stopping messages polling - page not visible or no conversation');
      }
    };

    startMessagesPolling();

    return () => {
      if (messagesIntervalRef.current) {
        clearInterval(messagesIntervalRef.current);
      }
    };
  }, [isPageVisible, selectedConversation, queryClient]);

  // Handle file attachment
  const handleFileAttachment = (files: FileList | null, isNewConversation = false) => {
    if (files) {
      const newFiles = Array.from(files);
      if (isNewConversation) {
        setNewConversationAttachments(prev => [...prev, ...newFiles]);
      } else {
        setAttachments(prev => [...prev, ...newFiles]);
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number, isNewConversation = false) => {
    if (isNewConversation) {
      setNewConversationAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handle file downloads
  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      // Get token for authentication
      const token = localStorage.getItem('stoneflake_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the attachment.",
        variant: "destructive",
      });
    }
  };

  // Get all conversations (messages grouped by user)
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/admin/messages/conversations'],
    // Remove automatic refetchInterval, use manual polling instead
  });

  // Get all users for creating new conversations
  const { data: allUsers = [] } = useQuery<Array<{
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'supplier';
    customerNumber?: string;
    supplierNumber?: string;
    company?: string;
  }>>({
    queryKey: ['/api/admin/all-users'],
    enabled: showNewConversationDialog,
  });

  // Get messages for selected thread
  const { data: conversationMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/admin/messages/thread', selectedConversation?.threadId],
    enabled: !!selectedConversation,
    // Remove automatic refetchInterval, use manual polling instead
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { threadId: string; userId: string; content: string; category: string }) => {
      // If there are attachments, use FormData
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('threadId', data.threadId);
        formData.append('userId', data.userId);
        formData.append('content', data.content);
        formData.append('category', data.category);
        
        // Add attachments
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        const token = localStorage.getItem('stoneflake_token');
        const response = await fetch('/api/admin/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      } else {
        // No attachments, use regular JSON request
        return apiRequest('POST', '/api/admin/messages/send', data);
      }
    },
    onSuccess: () => {
      setNewMessage('');
      setAttachments([]); // Clear attachments
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/conversations'] });
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/thread', selectedConversation.threadId] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { userId: string; subject: string; category: string; content: string }) => {
      // If there are attachments, use FormData
      if (newConversationAttachments.length > 0) {
        const formData = new FormData();
        formData.append('userId', data.userId);
        formData.append('subject', data.subject);
        formData.append('category', data.category);
        formData.append('content', data.content);
        
        // Add attachments
        newConversationAttachments.forEach((file) => {
          formData.append('attachments', file);
        });

        const token = localStorage.getItem('stoneflake_token');
        const response = await fetch('/api/admin/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      } else {
        // No attachments, use regular JSON request
        return apiRequest('POST', '/api/admin/messages/send', data);
      }
    },
    onSuccess: () => {
      setShowNewConversationDialog(false);
      setNewConversationUserId('');
      setNewConversationSubject('');
      setNewConversationCategory('general');
      setNewConversationContent('');
      setNewConversationAttachments([]); // Clear attachments
      setUserSearchTerm('');
      toast({
        title: "Conversation Started",
        description: "New conversation has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/conversations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mark thread as read
  const markAsReadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      return apiRequest('PUT', `/api/admin/messages/thread/${threadId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/conversations'] });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      threadId: selectedConversation.threadId,
      userId: selectedConversation.userId,
      content: newMessage,
      category: selectedConversation.category
    });
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (conversation.unreadCount > 0) {
      markAsReadMutation.mutate(conversation.threadId);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conv.userCompany && conv.userCompany.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || conv.userRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'customer': return <User className="h-4 w-4" />;
      case 'supplier': return <Building2 className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'customer': return 'bg-teal-100 text-teal-800';
      case 'supplier': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <main className="px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Messages</h2>
              <p className="text-gray-600 mt-2">Manage conversations with customers and suppliers</p>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Conversation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* User Selection */}
                    <div className="space-y-3">
                      <Label>Select User</Label>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search users by name, email, or number..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto border rounded-md">
                          {allUsers
                            .filter(user => 
                              user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                              (user.customerNumber && user.customerNumber.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                              (user.supplierNumber && user.supplierNumber.toLowerCase().includes(userSearchTerm.toLowerCase()))
                            )
                            .map(user => (
                              <div
                                key={user.id}
                                onClick={() => setNewConversationUserId(user.id)}
                                className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                                  newConversationUserId === user.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">
                                      {user.name}
                                      {user.role === 'customer' && user.customerNumber && (
                                        <span className="ml-2 text-sm text-blue-600">({user.customerNumber})</span>
                                      )}
                                      {user.role === 'supplier' && user.supplierNumber && (
                                        <span className="ml-2 text-sm text-purple-600">({user.supplierNumber})</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                    {user.company && (
                                      <div className="text-sm text-gray-400">{user.company}</div>
                                    )}
                                  </div>
                                  <Badge className={`text-xs ${user.role === 'customer' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'}`}>
                                    {user.role}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="e.g., Order #SORD-25001 Discussion"
                        value={newConversationSubject}
                        onChange={(e) => setNewConversationSubject(e.target.value)}
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newConversationCategory} onValueChange={setNewConversationCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="order">Order</SelectItem>
                          <SelectItem value="quote">Quote</SelectItem>
                          <SelectItem value="rfq">RFQ</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="quality">Quality</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Message Content */}
                    <div className="space-y-2">
                      <Label htmlFor="content">Message</Label>
                      <Textarea
                        id="content"
                        placeholder="Type your message here..."
                        value={newConversationContent}
                        onChange={(e) => setNewConversationContent(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Attachments for new conversation */}
                    <div className="space-y-2">
                      <Label>Attachments</Label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => handleFileAttachment(e.target.files, true)}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.step,.stp,.iges,.igs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                          >
                            <Paperclip className="h-4 w-4 mr-2" />
                            Choose Files
                          </Button>
                        </label>
                      </div>
                      
                      {/* Attachment Preview for new conversation */}
                      {newConversationAttachments.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {newConversationAttachments.map((file, index) => (
                            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                                onClick={() => removeAttachment(index, true)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowNewConversationDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (newConversationUserId && newConversationSubject && newConversationContent) {
                            createConversationMutation.mutate({
                              userId: newConversationUserId,
                              subject: newConversationSubject,
                              category: newConversationCategory,
                              content: newConversationContent
                            });
                          }
                        }}
                        disabled={!newConversationUserId || !newConversationSubject || !newConversationContent || createConversationMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {createConversationMutation.isPending ? 'Sending...' : 'Start Conversation'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All Users</option>
                <option value="customer">Customers</option>
                <option value="supplier">Suppliers</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                  Conversations ({filteredConversations.length})
                </CardTitle>
                
                {/* Search */}
                <div className="relative">
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.threadId}
                        onClick={() => handleConversationSelect(conversation)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedConversation?.threadId === conversation.threadId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gray-200">
                              {conversation.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {conversation.userName}
                                {conversation.userRole === 'customer' && conversation.customerNumber && (
                                  <span className="ml-2 text-xs text-blue-600 font-medium">({conversation.customerNumber})</span>
                                )}
                                {conversation.userRole === 'supplier' && conversation.supplierNumber && (
                                  <span className="ml-2 text-xs text-purple-600 font-medium">({conversation.supplierNumber})</span>
                                )}
                              </h3>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="bg-red-500 text-white text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Thread Subject */}
                            <p className="text-sm font-medium text-gray-700 mb-1 truncate">
                              {conversation.subject}
                            </p>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={`text-xs ${getRoleColor(conversation.userRole)}`}>
                                {getRoleIcon(conversation.userRole)}
                                <span className="ml-1 capitalize">{conversation.userRole}</span>
                              </Badge>
                              
                              {/* Category Badge */}
                              <Badge variant="outline" className="text-xs">
                                {conversation.category.charAt(0).toUpperCase() + conversation.category.slice(1)}
                              </Badge>
                            </div>
                            
                            {conversation.userCompany && (
                              <p className="text-xs text-gray-500 mb-1">{conversation.userCompany}</p>
                            )}
                            
                            {conversation.lastMessage && (
                              <div className="text-xs text-gray-600">
                                <p className="truncate">{conversation.lastMessage.content}</p>
                                <p className="text-gray-400 mt-1">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {format(new Date(conversation.lastMessage.createdAt), "MMM dd, h:mm a")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-200">
                          {selectedConversation.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {selectedConversation.userName}
                          {selectedConversation.userRole === 'customer' && selectedConversation.customerNumber && (
                            <span className="ml-2 text-sm text-blue-600 font-medium">({selectedConversation.customerNumber})</span>
                          )}
                          {selectedConversation.userRole === 'supplier' && selectedConversation.supplierNumber && (
                            <span className="ml-2 text-sm text-purple-600 font-medium">({selectedConversation.supplierNumber})</span>
                          )}
                        </CardTitle>
                        <p className="text-sm font-medium text-gray-700 mb-1">{selectedConversation.subject}</p>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getRoleColor(selectedConversation.userRole)}`}>
                            {getRoleIcon(selectedConversation.userRole)}
                            <span className="ml-1 capitalize">{selectedConversation.userRole}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedConversation.category.charAt(0).toUpperCase() + selectedConversation.category.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-500">{selectedConversation.userEmail}</span>
                        </div>
                        {selectedConversation.userCompany && (
                          <p className="text-sm text-gray-500">{selectedConversation.userCompany}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                      {conversationMessages.map((message) => {
                        const isFromAdmin = message.sender.role === 'admin';
                        return (
                          <div key={message.id} className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isFromAdmin 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-medium">
                                  {isFromAdmin ? 'You' : message.sender.name}
                                </span>
                                <span className={`text-xs ${isFromAdmin ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {format(new Date(message.createdAt), "h:mm a")}
                                </span>
                                {message.isRead && isFromAdmin && (
                                  <CheckCircle className="h-3 w-3 text-blue-200" />
                                )}
                              </div>
                              <p className="text-sm">{message.content}</p>
                              
                              {/* Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {message.attachments.map((attachment) => (
                                    <div 
                                      key={attachment.id} 
                                      className={`flex items-center justify-between p-2 rounded border ${
                                        isFromAdmin ? 'bg-blue-600 border-blue-400' : 'bg-white border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <Paperclip className={`h-4 w-4 ${isFromAdmin ? 'text-blue-200' : 'text-gray-500'}`} />
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-xs font-medium truncate ${
                                            isFromAdmin ? 'text-blue-100' : 'text-gray-700'
                                          }`}>
                                            {attachment.originalName}
                                          </p>
                                          <p className={`text-xs ${isFromAdmin ? 'text-blue-200' : 'text-gray-500'}`}>
                                            {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                                        className={`h-6 w-6 p-0 ${
                                          isFromAdmin 
                                            ? 'hover:bg-blue-400 text-blue-200 hover:text-white' 
                                            : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                        }`}
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    {/* Attachment preview for replies */}
                    {attachments.length > 0 && (
                      <div className="mb-3 space-y-2 max-h-32 overflow-y-auto">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => removeAttachment(index, false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="resize-none"
                          rows={2}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        
                        {/* Attachment upload for replies */}
                        <div className="flex items-center space-x-2">
                          <label className="flex-1">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => handleFileAttachment(e.target.files, false)}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.step,.stp,.iges,.igs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                            >
                              <Paperclip className="h-3 w-3 mr-1" />
                              Attach Files
                            </Button>
                          </label>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm mt-2">Choose a conversation from the left to view and send messages</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}