import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Paperclip, MessageSquare, Clock, CheckCircle, Plus, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SupplierLayout from '../../components/layout/SupplierLayout';
import { getAuthToken } from '@/lib/authUtils';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  createdAt: string;
  isRead: boolean;
  threadId: string;
  category: string;
  subject?: string;
  attachments: MessageAttachment[];
  sender: User;
  receiver: User;
}

interface MessageThread {
  threadId: string;
  subject: string;
  category: string;
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export default function SupplierMessages() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationCategory, setNewConversationCategory] = useState('');
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminUserId = 'admin'; // This will be resolved by the backend

  // Get message threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery<MessageThread[]>({
    queryKey: ['/api/messages/threads'],
    refetchInterval: 5000, // Poll every 5 seconds for new threads
    refetchOnWindowFocus: true,
  });

  // Get messages for selected thread
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages/threads', selectedThread],
    enabled: !!selectedThread,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
    refetchOnWindowFocus: true,
  });

  // Send message to existing thread
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; threadId?: string; category?: string; subject?: string; attachments?: File[] }) => {
      const formData = new FormData();
      formData.append('content', data.content);
      formData.append('receiverId', adminUserId);
      
      if (data.category) {
        formData.append('category', data.category);
      }
      if (data.subject) {
        formData.append('subject', data.subject);
      }
      
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      return fetch('/api/messages/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        return response.json();
      });
    },
    onSuccess: (result) => {
      setNewMessage('');
      setAttachments([]);
      setShowNewConversationDialog(false);
      setNewConversationCategory('');
      setNewConversationSubject('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh threads and messages
      queryClient.invalidateQueries({ queryKey: ['/api/messages/threads'] });
      if (selectedThread) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages/threads', selectedThread] });
      }
      
      setTimeout(scrollToBottom, 100);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-select first thread if none selected
  useEffect(() => {
    if (threads.length > 0 && !selectedThread) {
      setSelectedThread(threads[0].threadId);
    }
  }, [threads, selectedThread]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    if (selectedThread) {
      // Send to existing thread
      sendMessageMutation.mutate({
        content: newMessage,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    }
  };

  const handleCreateNewConversation = () => {
    if (!newMessage.trim() || !newConversationCategory) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      content: newMessage,
      category: newConversationCategory,
      subject: newConversationSubject || `${newConversationCategory.charAt(0).toUpperCase() + newConversationCategory.slice(1)} Discussion`,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const getThreadCategoryBadge = (category: string) => {
    const colors = {
      'general': 'bg-blue-100 text-blue-800',
      'quote-request': 'bg-green-100 text-green-800',
      'order-support': 'bg-purple-100 text-purple-800',
      'technical': 'bg-orange-100 text-orange-800',
      'billing': 'bg-yellow-100 text-yellow-800',
      'urgent': 'bg-red-100 text-red-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const topicCategories = [
    { value: 'general', label: 'General Question' },
    { value: 'quote-request', label: 'Quote Request' },
    { value: 'order-support', label: 'Order Support' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing/Payment' },
    { value: 'urgent', label: 'Urgent Issue' },
  ];

  if (threadsLoading) {
    return (
      <SupplierLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        </div>
      </SupplierLayout>
    );
  }

  return (
    <SupplierLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <div className="flex items-center gap-3">
            <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Conversation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">Topic Category *</Label>
                    <Select value={newConversationCategory} onValueChange={setNewConversationCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a topic category" />
                      </SelectTrigger>
                      <SelectContent>
                        {topicCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject (Optional)</Label>
                    <Input
                      id="subject"
                      value={newConversationSubject}
                      onChange={(e) => setNewConversationSubject(e.target.value)}
                      placeholder="Custom subject for this conversation"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  {/* File attachments for new conversation */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Attachments:</Label>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileAttachment}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach Files
                    </Button>
                    <Button
                      onClick={handleCreateNewConversation}
                      disabled={!newMessage.trim() || !newConversationCategory || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="outline" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Admin Communication
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {threads.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <MessageSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs">Start a new conversation!</p>
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <div
                        key={thread.threadId}
                        onClick={() => setSelectedThread(thread.threadId)}
                        className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${
                          selectedThread === thread.threadId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getThreadCategoryBadge(thread.category)}`}
                          >
                            {thread.category}
                          </Badge>
                          {thread.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {thread.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate">{thread.subject}</h4>
                        <p className="text-xs text-gray-500 truncate">
                          {thread.lastMessage.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(thread.lastMessage.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              {selectedThread ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {threads.find(t => t.threadId === selectedThread)?.subject || 'Conversation'}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col p-0">
                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messagesLoading ? (
                        <div className="text-center py-8">
                          <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-gray-500">Loading messages...</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p className="text-lg font-medium mb-2">No messages in this conversation</p>
                          <p>Send the first message!</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender.email === 'vineeth@stone-flake.com' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.sender.email === 'vineeth@stone-flake.com'
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {message.sender.email === 'vineeth@stone-flake.com' ? 'Admin' : message.sender.name}
                                </span>
                                <span className="text-xs opacity-70">
                                  {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                              
                              {/* Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((attachment) => (
                                    <div key={attachment.id} className="flex items-center gap-2 text-xs">
                                      <Paperclip className="h-3 w-3" />
                                      <a
                                        href={attachment.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline hover:no-underline"
                                      >
                                        {attachment.fileName}
                                      </a>
                                      <span className="opacity-70">
                                        ({formatFileSize(attachment.fileSize)})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {message.sender.email !== 'vineeth@stone-flake.com' && (
                                <div className="flex items-center gap-1 mt-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs opacity-70">
                                    {message.isRead ? 'Read' : 'Sent'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message input area */}
                    <div className="border-t p-4">
                      {/* File attachments preview */}
                      {attachments.length > 0 && (
                        <div className="mb-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Attachments:</p>
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({formatFileSize(file.size)})
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="min-h-[40px] resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileAttachment}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                            id="existing-thread-files"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => document.getElementById('existing-thread-files')?.click()}
                            className="h-10 w-10"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={handleSendMessage}
                            disabled={(!newMessage.trim() && attachments.length === 0) || sendMessageMutation.isPending}
                            className="h-10 w-10"
                            size="icon"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium mb-2">Select a conversation</p>
                    <p>Choose a conversation from the list or start a new one!</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </SupplierLayout>
  );
}