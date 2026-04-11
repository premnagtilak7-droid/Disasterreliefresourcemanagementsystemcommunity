import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  AlertTriangle,
  MapPin,
  Phone,
  Heart,
  Package,
  Users,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { User as UserType } from './AuthSystem';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  action: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ChatbotProps {
  user: UserType | null;
  onNavigate?: (view: string) => void;
}

const emergencyResponses = {
  emergency: "🚨 For immediate life-threatening emergencies, call 911 now! For non-critical aid requests, I can help you navigate our system.",
  medical: "🏥 For medical emergencies, contact 911. For medical supply requests, I can guide you through our aid request form.",
  food: "🍽️ I can help you request food assistance or find nearby food distribution centers.",
  shelter: "🏠 Need shelter? I can help you find emergency shelters or request temporary housing assistance.",
  volunteer: "👥 Looking to volunteer? I can help you sign up, find tasks, or manage your assignments.",
  donate: "💝 Want to help? I can guide you through our donation process and show you active relief projects."
};

const quickResponses = [
  { text: "Request Emergency Aid", icon: AlertTriangle },
  { text: "Find Shelter", icon: MapPin },
  { text: "Emergency Contacts", icon: Phone },
  { text: "Volunteer Opportunities", icon: Users },
  { text: "Donate Now", icon: Heart },
  { text: "Track My Request", icon: Package }
];

export function Chatbot({ user, onNavigate }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
    }
  }, [isOpen, user]);

  // Auto-scroll to newest message when messages change - more robust implementation
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          // Force scroll to absolute bottom
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    };
    
    // Multiple attempts to ensure scroll happens after all renders
    requestAnimationFrame(scrollToBottom);
    setTimeout(scrollToBottom, 50);
    setTimeout(scrollToBottom, 150);
    setTimeout(scrollToBottom, 300); // Final check after animations complete
  }, [messages, isTyping]);

  const getWelcomeMessage = (): Message => {
    const userRole = user?.role?.toLowerCase() || 'guest';
    const userName = user?.name || 'there';
    
    const roleMessages: Record<string, string> = {
      admin: `Hello ${userName}! I'm your AI assistant for disaster relief management. I can help you monitor operations, manage volunteers, or navigate analytics.`,
      volunteer: `Hi ${userName}! I'm here to help you with rescue missions, finding victims, and coordinating with your team. Check the map view for nearby alerts.`,
      donor: `Welcome ${userName}! I can help you track donations, find relief projects, or show your impact reports.`,
      victim: `Hello ${userName}, I'm here to help you get emergency assistance. I can guide you through aid requests, help find nearby resources, or connect you with volunteers.`,
      guest: "Hi! I'm your disaster relief assistant. I can help with emergency guidance, system navigation, or connecting you with resources."
    };

    // Handle role mapping (ensure consistency)
    const normalizedRole = userRole === 'volunteer' ? 'volunteer' 
      : userRole === 'victim' ? 'victim'
      : userRole === 'admin' ? 'admin'
      : userRole === 'donor' ? 'donor'
      : 'guest';

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: roleMessages[normalizedRole] || roleMessages['guest'],
      timestamp: new Date(),
      actions: getWelcomeActions()
    };
  };

  const getWelcomeActions = (): ChatAction[] => {
    if (!user) return [];

    const commonActions: ChatAction[] = [
      { label: "Emergency Contacts", action: () => handleQuickAction("Emergency Contacts"), icon: Phone },
      { label: "System Help", action: () => handleQuickAction("System Help") }
    ];

    const userRole = user.role?.toLowerCase() || 'guest';

    const roleActions: Record<string, ChatAction[]> = {
      admin: [
        { label: "View Analytics", action: () => onNavigate?.('analytics') },
        { label: "Manage Volunteers", action: () => onNavigate?.('volunteers') }
      ],
      volunteer: [
        { label: "View Map", action: () => onNavigate?.('map'), icon: MapPin },
        { label: "Rescue History", action: () => onNavigate?.('history') },
        { label: "My Tasks", action: () => onNavigate?.('tasks') }
      ],
      donor: [
        { label: "Donate Now", action: () => handleQuickAction("Donate"), icon: Heart },
        { label: "View Impact", action: () => onNavigate?.('impact') }
      ],
      victim: [
        { label: "Request Aid", action: () => onNavigate?.('request'), icon: AlertTriangle },
        { label: "Track My Request", action: () => onNavigate?.('status') },
        { label: "Find Resources", action: () => onNavigate?.('resources') }
      ]
    };

    return [...(roleActions[userRole] || []), ...commonActions];
  };

  const handleQuickAction = (action: string) => {
    const responses = {
      "Emergency Contacts": "🚨 Emergency Contacts:\n• 911 - Life-threatening emergencies\n• 1-800-RELIEF - General assistance\n• 211 - Community services\n• Text HOME to 741741 - Crisis text line",
      "System Help": `I can help you navigate the system! Here are the main features for ${user?.role || 'users'}:\n\n${getSystemHelp()}`,
      "Donate": "💝 Thank you for wanting to help! I can guide you to our donation page where you can contribute to active relief projects.",
      "Volunteer": "👥 Volunteers are the heart of disaster relief! I can help you sign up and find opportunities that match your skills."
    };

    addBotMessage(responses[action as keyof typeof responses] || "I'm here to help! What would you like to know?");
  };

  const getSystemHelp = (): string => {
    const userRole = user?.role?.toLowerCase() || 'guest';
    
    const helpText: Record<string, string> = {
      admin: "- Dashboard - Monitor all operations\n- Analytics - Performance insights\n- Volunteers - Team management\n- Inventory - Supply tracking\n- Map View - Real-time locations",
      volunteer: "- Dashboard - Your overview and stats\n- Map View - See nearby SOS alerts within 2km\n- Start Mission - Navigate to victims using Google Maps\n- Rescue History - View your completed rescues\n- Settings - Manage your profile",
      donor: "- Dashboard - Donation overview\n- My Donations - Contribution history\n- Projects - Active campaigns\n- Impact Report - Your difference",
      victim: "- Dashboard - Personal overview\n- Request Aid - Submit emergency SOS with photo\n- Aid Status - Track your request\n- Resources - Find nearby help centers\n- Emergency SOS - One-tap emergency button"
    };

    return helpText[userRole] || "Navigate using the menu at the top of the screen.";
  };

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Emergency keywords
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('help')) {
      return emergencyResponses.emergency;
    }

    // Medical keywords
    if (lowerMessage.includes('medical') || lowerMessage.includes('doctor') || lowerMessage.includes('hospital')) {
      return emergencyResponses.medical;
    }

    // Food keywords
    if (lowerMessage.includes('food') || lowerMessage.includes('water') || lowerMessage.includes('hungry')) {
      return emergencyResponses.food;
    }

    // Shelter keywords
    if (lowerMessage.includes('shelter') || lowerMessage.includes('housing') || lowerMessage.includes('homeless')) {
      return emergencyResponses.shelter;
    }

    // Volunteer keywords
    if (lowerMessage.includes('volunteer') || lowerMessage.includes('help out')) {
      return emergencyResponses.volunteer;
    }

    // Donation keywords
    if (lowerMessage.includes('donate') || lowerMessage.includes('contribute') || lowerMessage.includes('give')) {
      return emergencyResponses.donate;
    }

    // Location/map keywords
    if (lowerMessage.includes('location') || lowerMessage.includes('map') || lowerMessage.includes('where')) {
      return "📍 I can help you find locations! Use the Map View to see real-time positions of volunteers, requests, and resources.";
    }

    // Status keywords
    if (lowerMessage.includes('status') || lowerMessage.includes('track') || lowerMessage.includes('progress')) {
      return "📊 You can track the status of requests, donations, and operations in your dashboard. Would you like me to guide you to a specific section?";
    }

    // Default response with helpful suggestions
    return `I understand you're looking for help with "${userMessage}". Here are some things I can assist with:

🚨 Emergency assistance and contacts
📍 Finding resources and locations  
📋 Navigating the system features
💝 Donation and volunteer opportunities
📊 Tracking requests and status updates

What specifically would you like help with?`;
  };

  const addBotMessage = (content: string, actions?: ChatAction[]) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      actions
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue);
      addBotMessage(botResponse);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-blue-600 hover:bg-blue-700"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Relief Assistant</CardTitle>
          {user && (
            <Badge variant="outline" className="text-xs">
              {user.role}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-[calc(100%-4rem)]">
          {/* Quick Actions */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {quickResponses.slice(0, 4).map((response, index) => {
                const Icon = response.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 justify-start"
                    onClick={() => handleQuickAction(response.text)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {response.text}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 h-[280px] pr-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === 'bot' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      {message.type === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        {message.actions && message.actions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.actions.map((action, index) => {
                              const ActionIcon = action.icon;
                              return (
                                <Button
                                  key={index}
                                  variant="secondary"
                                  size="sm"
                                  className="w-full text-xs h-8 justify-start"
                                  onClick={action.action}
                                >
                                  {ActionIcon && <ActionIcon className="h-3 w-3 mr-2" />}
                                  {action.label}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="mt-4 flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about disaster relief..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon" disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
