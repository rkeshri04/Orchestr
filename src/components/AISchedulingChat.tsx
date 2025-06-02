import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, Sparkles, Calendar, Clock, Users, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useCreateEvent } from "@/hooks/useEvents";
import { SchedulingAI, type SchedulingSuggestion as AISchedulingSuggestion, type AvailabilityInfo } from "@/lib/schedulingAI";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: SchedulingSuggestion[];
  availabilityInfo?: AvailabilityInfo[];
}

interface SchedulingSuggestion {
  id: string;
  title: string;
  dateTime: string;
  duration: string;
  participants: string[];
  conflicts: string[];
  confidence: number;
  groupId: string;
  startTime: string;
  endTime: string;
}

export const AISchedulingChat = () => {
  const { user } = useAuth();
  const { groups, isLoading: isLoadingGroups } = useGroups();
  const createEvent = useCreateEvent();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI scheduling assistant. I can help you find the perfect time for any group activity, considering both individual availability and existing events. Just tell me what you need to schedule!",
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch all events for user's groups
  useEffect(() => {
    const fetchAllEvents = async () => {
      if (!groups || groups.length === 0) return;

      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .in('group_id', groups.map(g => g.id))
          .gte('start_time', new Date().toISOString());

        if (error) {
          console.error('Error fetching events:', error);
          return;
        }

        setAllEvents(events || []);
      } catch (error) {
        console.error('Error fetching all events:', error);
      }
    };

    fetchAllEvents();
  }, [groups]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Create AI scheduling context with events
      const schedulingContext = {
        groups: groups || [],
        userGroups: groups || [],
        currentUser: user,
        events: allEvents // Include events in context
      };

      // Initialize AI with context
      const schedulingAI = new SchedulingAI(schedulingContext);

      // Get AI response (handles both scheduling and availability)
      const aiResponse = await schedulingAI.processUserRequest(currentInput);

      // Enhance the response message with event awareness
      let enhancedMessage = aiResponse.message;
      if (aiResponse.type === 'scheduling' && aiResponse.suggestions && aiResponse.suggestions.length > 0) {
        const totalEvents = allEvents.filter(event => 
          aiResponse.suggestions!.some(s => s.groupId === event.group_id)
        ).length;
        
        if (totalEvents > 0) {
          enhancedMessage += `\n\n📅 Note: I've considered ${totalEvents} existing event${totalEvents > 1 ? 's' : ''} and added 30-minute buffer periods to avoid scheduling conflicts. My suggestions are spaced 60 minutes apart.`;
        } else {
          enhancedMessage += `\n\n💡 My suggestions are spaced 60 minutes apart to give you flexibility in your schedule.`;
        }
      }

      const chatResponse: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: enhancedMessage,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions,
        availabilityInfo: aiResponse.availabilityInfo
      };

      setMessages(prev => [...prev, chatResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorResponse: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: "I'm sorry, I encountered an error while processing your request. Please try again or make sure you have groups set up with availability data.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSuggestion = async (suggestion: SchedulingSuggestion) => {
    try {
      // Create the event in the database
      await createEvent.mutateAsync({
        title: suggestion.title,
        description: `Scheduled by AI Assistant - ${suggestion.participants.length} participants\n\nThis event was intelligently scheduled considering existing events and individual availability.`,
        start_time: suggestion.startTime,
        end_time: suggestion.endTime,
        group_id: suggestion.groupId
      });

      // Update local events state
      const newEvent = {
        id: Date.now().toString(),
        title: suggestion.title,
        start_time: suggestion.startTime,
        end_time: suggestion.endTime,
        group_id: suggestion.groupId,
        created_by: user?.id
      };
      setAllEvents(prev => [...prev, newEvent]);

      const confirmMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Perfect! I've successfully created "${suggestion.title}" for ${suggestion.dateTime}. The event has been added to your group calendar and all ${suggestion.participants.length} participants can see it. 🎉\n\nParticipants: ${suggestion.participants.join(', ')}\n\n✅ Event Details:\n• Start: ${format(new Date(suggestion.startTime), 'PPP p')}\n• End: ${format(new Date(suggestion.endTime), 'PPP p')}\n• Duration: ${suggestion.duration}\n• Confidence: ${suggestion.confidence}%\n\nYou can view and manage this event in your group calendar. Future scheduling will automatically consider this new event!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMessage]);
    } catch (error) {
      console.error('Error creating event:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I'm sorry, there was an error creating the event "${suggestion.title}". Please try again or create the event manually from your group calendar.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error('Failed to create event');
    }
  };

  const quickPrompts = [
    "Schedule family dinner this evening",
    "When is everyone free in family this week?",
    "Plan book club gathering weekend morning",
    "Show me availability for team meetings",
    "Schedule 2-hour workshop next Tuesday",
    "Find time for coffee chat tomorrow"
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header Card */}
      <div className="flex-shrink-0 p-6 pb-3">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <CardTitle>AI Scheduling Assistant</CardTitle>
            </div>
            <CardDescription>
              Tell me what you'd like to schedule in plain English. I'll consider both individual availability and existing events with smart buffer periods.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Chat Container */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chat</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col p-0">
            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>
                        {message.type === 'user' ? 'You' : <Sparkles className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-4 ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Enhanced AI Suggestions */}
              {messages[messages.length - 1]?.suggestions && (
                <div className="space-y-3">
                  {messages[messages.length - 1].suggestions!.map((suggestion) => (
                    <Card key={suggestion.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <h4 className="font-medium">{suggestion.title}</h4>
                              <Badge variant={suggestion.confidence > 90 ? "default" : suggestion.confidence > 70 ? "secondary" : "outline"}>
                                {suggestion.confidence}% match
                              </Badge>
                              {suggestion.conflicts.length === 0 && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  No conflicts
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap gap-2">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{suggestion.dateTime}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{suggestion.participants.length} people</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.duration}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.participants.map((participant, index) => (
                                <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {participant}
                                </Badge>
                              ))}
                            </div>
                            {suggestion.conflicts.length > 0 && (
                              <div className="flex items-start space-x-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-medium">Minor conflicts detected:</span>
                                  <div className="mt-1">
                                    {suggestion.conflicts.map((conflict, idx) => (
                                      <div key={idx} className="text-xs">{conflict}</div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                              <span className="font-medium">💡 Smart scheduling:</span> This time slot includes 30-minute buffers after busy periods and around existing events. Suggestions are spaced 60 minutes apart.
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleConfirmSuggestion(suggestion)}
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirm & Create
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Enhanced Availability Information */}
              {messages[messages.length - 1]?.availabilityInfo && (
                <div className="space-y-4">
                  {messages[messages.length - 1].availabilityInfo!.map((info) => (
                    <Card key={info.groupId} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Info className="h-4 w-4 text-green-500" />
                              <h4 className="font-medium">{info.groupName}</h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {info.totalMembers} member{info.totalMembers > 1 ? 's' : ''}
                              </Badge>
                              {allEvents.filter(e => e.group_id === info.groupId).length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {allEvents.filter(e => e.group_id === info.groupId).length} events
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {info.availableSlots.length === 0 ? (
                            <div className="text-sm text-gray-600 text-center py-4 bg-gray-50 rounded-lg">
                              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p>No common availability found for this group.</p>
                              <p className="text-xs mt-1">Try a different time period or check member schedules and events.</p>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {info.availableSlots.map((slot, index) => {
                                const dateObj = new Date(slot.date + 'T00:00:00');
                                const formattedDate = dateObj.toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                });
                                
                                return (
                                  <div key={index} className="border rounded-lg p-3 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <Calendar className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-sm">{formattedDate}</span>
                                      </div>
                                      <Badge variant="secondary" className="text-xs">
                                        {slot.availableMembers.length}/{info.totalMembers} available
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <div className="flex items-start space-x-2">
                                        <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <div className="flex flex-wrap gap-1">
                                            {slot.timeSlots.map((timeSlot, timeIndex) => (
                                              <Badge key={timeIndex} variant="outline" className="text-xs bg-white">
                                                {timeSlot}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start space-x-2">
                                        <Users className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <div className="flex flex-wrap gap-1">
                                            {slot.availableMembers.map((member, memberIndex) => (
                                              <Badge key={memberIndex} variant="secondary" className="text-xs">
                                                {member}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-gray-500 mt-2 p-2 bg-white/70 rounded border">
                                      <span className="font-medium">📅 Event-aware:</span> Times consider existing events with 30-min buffers and 30-min buffers after busy periods
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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

            {/* Enhanced Quick Prompts */}
            <div className="flex-shrink-0 p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Quick prompts:</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue(prompt)}
                    className="text-xs hover:bg-blue-50 hover:border-blue-200"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Enhanced Input Area */}
            <div className="flex-shrink-0 p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me to schedule something or check availability..."
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
    </div>
  );
};
