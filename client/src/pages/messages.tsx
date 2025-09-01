import { useState } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Clock,
  User,
  Building2,
  Mail,
  Search,
  Filter,
  Download,
  Paperclip,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedAt: string;
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

interface MessageThread {
  threadId?: string; // Legacy field for backward compatibility 
  id: string;
  subject: string;
  lastMessage: {
    id: string;
    subject: string;
    content: string;
    fromUser: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
    toUser: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
    isRead: boolean;
    priority: 'low' | 'normal' | 'high';
    category: 'general' | 'rfq' | 'order' | 'support' | 'billing';
    createdAt: string;
    updatedAt: string;
  };
  messageCount: number;
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  isRead: boolean;
  updatedAt: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "normal":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "rfq":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "order":
      return "bg-green-100 text-green-800 border-green-200";
    case "support":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "billing":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const [newConversationCategory, setNewConversationCategory] = useState('general');
  const [newConversationContent, setNewConversationContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newConversationAttachments, setNewConversationAttachments] = useState<File[]>([]);

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

  // Handle send message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage);
    }
  };

  // Get all message threads
  const { data: messageThreads = [], isLoading, error } = useQuery<MessageThread[]>({
    queryKey: ['/api/messages/threads'],
    queryFn: async () => {
      console.log('Fetching message threads data...');
      const response = await apiRequest('GET', '/api/messages/threads');
      const data = await response.json();
      console.log('Threads data:', data);
      
      // Ensure data structure is valid
      if (Array.isArray(data)) {
        return data.map((thread: any) => ({
          ...thread,
          lastMessage: thread.lastMessage ? {
            ...thread.lastMessage,
            fromUser: thread.lastMessage.fromUser || { firstName: 'Unknown', lastName: '', email: '', role: 'admin' },
            category: thread.lastMessage.category || 'general',
            content: thread.lastMessage.content || 'No message content'
          } : null
        }));
      }
      return [];
    },
    retry: 1,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Get messages for selected thread
  const { data: threadMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages/threads', selectedThread?.threadId || selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return [];
      const threadId = selectedThread.threadId || selectedThread.id;
      const response = await apiRequest('GET', `/api/messages/threads/${threadId}`);
      return await response.json();
    },
    enabled: !!selectedThread,
    retry: 1,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Send message to existing conversation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      if (!selectedThread) throw new Error("No thread selected");
      
      const formData = new FormData();
      formData.append('receiverId', 'admin');
      formData.append('content', messageContent);
      formData.append('category', selectedThread.lastMessage.category);
      formData.append('subject', selectedThread.subject);
      
      // Add attachments if any
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      setAttachments([]);
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/threads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/threads', selectedThread?.threadId || selectedThread?.id] });
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mark thread as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      return apiRequest('PUT', `/api/messages/threads/${threadId}/read`);
    },
    onSuccess: () => {
      // Invalidate both unread count and threads to update the notification dot and thread list
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/threads'] });
    },
    onError: (error: any) => {
      console.error('Failed to mark thread as read:', error);
    }
  });

  // Create new conversation mutation (send message to admin)
  const createConversationMutation = useMutation({
    mutationFn: async (data: { subject: string; category: string; content: string }) => {
      const formData = new FormData();
      formData.append('receiverId', 'admin');
      formData.append('subject', data.subject);
      formData.append('category', data.category);
      formData.append('content', data.content);
      
      // Add attachments if any
      newConversationAttachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stoneflake_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      return response.json();
    },
    onSuccess: () => {
      setShowNewConversationDialog(false);
      setNewConversationSubject('');
      setNewConversationCategory('general');
      setNewConversationContent('');
      setNewConversationAttachments([]);
      toast({
        title: "Message Sent",
        description: "Your message has been sent to admin successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/threads'] });
    },
    onError: (error: any) => {
      console.error('Message send error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add error logging
  if (error) {
    console.error('Messages query error:', error);
  }

  // Handle thread selection
  const handleThreadSelect = (thread: MessageThread) => {
    console.log('Selected thread:', thread);
    console.log('Thread ID:', thread.threadId || thread.id);
    setSelectedThread(thread);
    
    // Mark thread as read when selected
    const threadId = thread.threadId || thread.id;
    if (threadId && !thread.isRead) {
      markAsReadMutation.mutate(threadId);
    }
  };

  // Filter threads based on search term and category
  const filteredThreads = messageThreads.filter(thread => {
    const matchesSearch = !searchTerm || 
      thread.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.lastMessage?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.lastMessage?.fromUser?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.lastMessage?.fromUser?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || thread.lastMessage?.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-600 mt-1">Communicate with the Stoneflake team</p>
            </div>
            <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Message to Admin</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Question about Order #SORD-25001"
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
                        <SelectItem value="billing">Billing</SelectItem>
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

                  {/* File Attachments */}
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
                    
                    {/* Attachment Preview */}
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
                        if (newConversationSubject && newConversationContent) {
                          createConversationMutation.mutate({
                            subject: newConversationSubject,
                            category: newConversationCategory,
                            content: newConversationContent
                          });
                        }
                      }}
                      disabled={!newConversationSubject || !newConversationContent || createConversationMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {createConversationMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <MessageSquare className="h-5 w-5 mr-2 text-teal-600" />
                Conversations ({filteredThreads.length})
              </h2>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="rfq">RFQ</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm">{messageThreads.length === 0 ? 'No conversations yet' : 'No conversations match your search'}</p>
                  <p className="text-xs text-gray-400 mt-1">{messageThreads.length === 0 ? 'Start a new conversation with admin' : 'Try adjusting your search or filters'}</p>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <div
                    key={thread.threadId || thread.id}
                    onClick={() => handleThreadSelect(thread)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedThread && (
                        (selectedThread.threadId && selectedThread.threadId === thread.threadId) ||
                        (selectedThread.id && selectedThread.id === thread.id) ||
                        (selectedThread.threadId === thread.id) ||
                        (selectedThread.id === thread.threadId)
                      )
                        ? "bg-teal-50 border-l-4 border-l-teal-500 shadow-sm" 
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                            AD
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {thread.subject}
                          </h4>
                          <p className="text-xs text-gray-500">Admin Team</p>
                        </div>
                      </div>
                      {!thread.isRead && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-sm">
                                •
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Unread message</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getCategoryColor(thread.lastMessage?.category || 'general')}>
                        {thread.lastMessage?.category || 'general'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {thread.lastMessage?.content || 'No message content'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {thread.lastMessage.fromUser?.firstName || 'Unknown'} {thread.lastMessage.fromUser?.lastName || ''}
                      </span>
                      <span>
                        {format(new Date(thread.lastMessage.createdAt), "MMM dd")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Conversation Content */}
          <div className="flex-1 bg-white flex flex-col">
            {selectedThread ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                          AD
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedThread.subject}
                        </h3>
                        <p className="text-sm text-gray-500">Admin Team</p>
                      </div>
                    </div>
                    <Badge className={getCategoryColor(selectedThread.lastMessage.category)}>
                      {selectedThread.lastMessage.category}
                    </Badge>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {threadMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No messages in this conversation yet</p>
                    </div>
                  ) : (
                    threadMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${message.sender.role === 'customer' ? 'order-2' : 'order-1'}`}>
                          <div className={`rounded-lg p-3 ${
                            message.sender.role === 'customer'
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            
                            {/* Message Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment) => (
                                  <div 
                                    key={attachment.id}
                                    className={`flex items-center space-x-2 p-2 rounded border text-xs ${
                                      message.sender.role === 'customer'
                                        ? 'bg-teal-700 border-teal-500 text-teal-100'
                                        : 'bg-white border-gray-200 text-gray-600'
                                    }`}
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="flex-1 truncate">{attachment.originalName}</span>
                                    <span className="text-xs opacity-75">
                                      {(attachment.fileSize / 1024).toFixed(1)} KB
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className={`h-6 w-6 p-0 ${
                                        message.sender.role === 'customer'
                                          ? 'text-teal-100 hover:bg-teal-600'
                                          : 'text-gray-500 hover:bg-gray-100'
                                      }`}
                                      onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`mt-1 text-xs text-gray-500 ${
                            message.sender.role === 'customer' ? 'text-right' : 'text-left'
                          }`}>
                            {message.sender.name} • {format(new Date(message.createdAt), 'MMM dd, h:mm a')}
                          </div>
                        </div>
                        <Avatar className={`h-8 w-8 ${message.sender.role === 'customer' ? 'order-1 ml-3' : 'order-2 mr-3'}`}>
                          <AvatarFallback className={`text-xs ${
                            message.sender.role === 'customer' 
                              ? 'bg-teal-100 text-teal-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {message.sender.role === 'customer' ? 'CU' : 'AD'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  {/* Attachment Preview */}
                  {attachments.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Attachments:</h4>
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
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex space-x-1">
                      <label>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleFileAttachment(e.target.files)}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.step,.stp,.iges,.igs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </label>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Messages</h3>
                  <p className="text-sm mb-4">Select a conversation to start chatting with our admin team</p>
                  <p className="text-xs text-gray-400">or create a new message to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}