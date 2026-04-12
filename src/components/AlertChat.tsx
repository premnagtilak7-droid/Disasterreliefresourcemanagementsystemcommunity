import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'volunteer' | 'victim';
  message: string;
  timestamp: Timestamp;
}

interface AlertChatProps {
  alertId: string;
  userId: string;
  userName: string;
  userRole: 'volunteer' | 'victim';
  compact?: boolean;
}

export function AlertChat({ alertId, userId, userName, userRole, compact = false }: AlertChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    const chatRef = collection(db, 'alerts', alertId, 'messages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [alertId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    try {
      const chatRef = collection(db, 'alerts', alertId, 'messages');
      await addDoc(chatRef, {
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.senderId === userId;

  if (compact) {
    return (
      <div className="border rounded-lg bg-muted/30">
        <ScrollArea className="h-32 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <p className="text-xs">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg px-2 py-1 ${
                    isMyMessage(msg) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-slate-800 border'
                  }`}>
                    <p className="text-xs opacity-70">{msg.senderName}</p>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isSending}
            className="h-8 text-sm"
          />
          <Button 
            size="icon" 
            className="h-8 w-8"
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Chat with {userRole === 'victim' ? 'Volunteer' : 'Victim'}
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time communication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg bg-muted/30">
          <ScrollArea className="h-48 p-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Send a message to start communicating</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isMyMessage(msg) 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white dark:bg-slate-800 border'
                    }`}>
                      <p className="text-xs opacity-70 mb-1">{msg.senderName}</p>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isSending}
            />
            <Button 
              size="icon" 
              onClick={handleSend}
              disabled={isSending || !newMessage.trim()}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
