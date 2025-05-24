
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, Sparkles, Calendar, Clock, Users, CheckCircle, XCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: SchedulingSuggestion[];
}

interface SchedulingSuggestion {
  id: string;
  title: string;
  dateTime: string;
  duration: string;
  participants: string[];
  conflicts: string[];
  confidence: number;
}

export const AISchedulingChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI scheduling assistant. I can help you find the perfect time for any group activity. Just tell me what you need to schedule!",
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const mockAIResponse = (userMessage: string): ChatMessage => {
    const responses = [
      {
        content: "I found several great options for your family dinner! Here are my top suggestions based on everyone's calendars:",
        suggestions: [
          {
            id: '1',
            title: 'Family Dinner',
            dateTime: 'Tomorrow, 7:00 PM',
            duration: '2 hours',
            participants: ['You', 'Sarah', 'Mike', 'Emma'],
            conflicts: [],
            confidence: 95
          },
          {
            id: '2',
            title: 'Family Dinner',
            dateTime: 'Sunday, 6:30 PM',
            duration: '2 hours',
            participants: ['You', 'Sarah', 'Mike', 'Emma'],
            conflicts: ['Mike has a late meeting'],
            confidence: 78
          }
        ]
      },
      {
        content: "Let me check everyone's availability for your book club meeting. I found some perfect windows when all members are free:",
        suggestions: [
          {
            id: '3',
            title: 'Book Club Meeting',
            dateTime: 'Saturday, 2:00 PM',
            duration: '2 hours',
            participants: ['You', 'Jessica', 'David', 'Lisa', 'Tom', 'Amy'],
            conflicts: [],
            confidence: 92
          }
        ]
      },
      {
        content: "I can help you schedule that team meeting! Based on your team's calendars, here are the best available slots:",
        suggestions: [
          {
            id: '4',
            title: 'Team Meeting',
            dateTime: 'Wednesday, 10:00 AM',
            duration: '1 hour',
            participants: ['You', 'John', 'Alice', 'Bob', 'Carol'],
            conflicts: ['Alice has back-to-back meetings'],
            confidence: 85
          }
        ]
      }
    ];

    return {
      id: Date.now().toString(),
      type: 'ai',
      content: responses[Math.floor(Math.random() * responses.length)].content,
      timestamp: new Date(),
      suggestions: responses[Math.floor(Math.random() * responses.length)].suggestions
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      const aiResponse = mockAIResponse(inputValue);
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleConfirmSuggestion = (suggestion: SchedulingSuggestion) => {
    const confirmMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Perfect! I've scheduled "${suggestion.title}" for ${suggestion.dateTime}. Calendar invites have been sent to all participants. Everyone's calendars have been updated automatically.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const quickPrompts = [
    "Schedule family dinner this week",
    "Find time for team meeting next Tuesday",
    "Plan book club gathering",
    "Coffee with friends this weekend"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Scheduling Assistant</CardTitle>
          </div>
          <CardDescription>
            Tell me what you'd like to schedule in plain English, and I'll find the perfect time for everyone.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-lg">Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.type === 'user' ? 'You' : <Sparkles className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg p-4 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* AI Suggestions */}
            {messages[messages.length - 1]?.suggestions && (
              <div className="space-y-3">
                {messages[messages.length - 1].suggestions!.map((suggestion) => (
                  <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <h4 className="font-medium">{suggestion.title}</h4>
                            <Badge variant={suggestion.confidence > 90 ? "default" : "secondary"}>
                              {suggestion.confidence}% match
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{suggestion.dateTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{suggestion.participants.length} people</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {suggestion.participants.map((participant, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {participant}
                              </Badge>
                            ))}
                          </div>
                          {suggestion.conflicts.length > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-orange-600">
                              <XCircle className="h-3 w-3" />
                              <span>Minor conflicts: {suggestion.conflicts.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleConfirmSuggestion(suggestion)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirm
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Sparkles className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <Separator />

          {/* Quick Prompts */}
          <div className="p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Quick prompts:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your scheduling request here..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
