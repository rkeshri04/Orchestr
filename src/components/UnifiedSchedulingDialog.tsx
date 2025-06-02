import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar as LucideCalendar, 
  Clock, 
  Users, 
  Plus,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEvent } from '@/hooks/useEvents';
import { useGroupMembers, useSetUnavailability } from '@/hooks/useGroupMembers';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UnifiedSchedulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any;
  selectedDate: Date;
  timeRange: {
    start: number;
    end: number;
    visualEnd?: number;
  };
  onReset: () => void;
}

type TabValue = 'event' | 'unavailability';

interface EventFormData {
  title: string;
  description: string;
  selectedParticipants: string[];
}

export const UnifiedSchedulingDialog = ({ 
  open, 
  onOpenChange, 
  group, 
  selectedDate, 
  timeRange, 
  onReset 
}: UnifiedSchedulingDialogProps) => {
  const [activeTab, setActiveTab] = useState<TabValue>('unavailability');
  const [eventForm, setEventForm] = useState<EventFormData>({
    title: '',
    description: '',
    selectedParticipants: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Add state for editable time and date
  const [editableDate, setEditableDate] = useState<Date>(selectedDate);
  const [editableStartTime, setEditableStartTime] = useState<string>('');
  const [editableEndTime, setEditableEndTime] = useState<string>('');
  const [isTimeEditing, setIsTimeEditing] = useState(false);

  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const setUnavailability = useSetUnavailability();
  const { data: members = [] } = useGroupMembers(group?.id);

  // Helper functions
  const timeToString = (hour: number, minute: number = 0): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const hourToTime = (h: number): string => {
    const hours = h.toString().padStart(2, '0');
    return `${hours}:00`;
  };

  const getCurrentMinuteInHour = (date: Date | null, hour: number): number | null => {
    if (!date) return null;
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(date);
    selectedDay.setHours(0, 0, 0, 0);
    
    if (selectedDay.getTime() === today.getTime() && now.getHours() === hour) {
      return now.getMinutes();
    }
    
    return null;
  };

  const getEffectiveStartTime = (hour: number): { hour: number; minute: number } => {
    const currentMinute = getCurrentMinuteInHour(selectedDate, hour);
    if (currentMinute !== null) {
      const nextMinute = currentMinute + 1;
      if (nextMinute >= 60) {
        return { hour: hour + 1, minute: 0 };
      }
      return { hour, minute: nextMinute };
    }
    return { hour, minute: 0 };
  };

  // Reset form when dialog opens/closes or tab changes
  useEffect(() => {
    if (open) {
      setEventForm({
        title: '',
        description: '',
        selectedParticipants: user?.id ? [user.id] : [],
      });
      setIsProcessing(false);
      
      // Initialize editable time values
      const startTime = getEffectiveStartTime(timeRange.start);
      const startTimeStr = timeToString(startTime.hour, startTime.minute);
      const endTimeStr = hourToTime(timeRange.end);
      
      setEditableDate(selectedDate);
      setEditableStartTime(startTimeStr);
      setEditableEndTime(endTimeStr);
      setIsTimeEditing(false);
    }
  }, [open, user?.id, selectedDate, timeRange]);

  // Helper to check if a date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Helper to get minimum time for a date
  const getMinTimeForDate = (date: Date): string => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (!isToday) return "00:00";
    
    // For today, minimum time is current time + 1 hour rounded up
    const minHour = Math.ceil((today.getHours() + today.getMinutes() / 60 + 1));
    return `${Math.min(minHour, 23).toString().padStart(2, '0')}:00`;
  };

  const handleParticipantToggle = (userId: string) => {
    setEventForm(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(userId)
        ? prev.selectedParticipants.filter(id => id !== userId)
        : [...prev.selectedParticipants, userId]
    }));
  };

  // Handle time editing
  const handleStartTimeChange = (time: string) => {
    setEditableStartTime(time);
    
    // Auto-adjust end time if it's before or equal to start time
    if (editableEndTime <= time) {
      const [hours, minutes] = time.split(':').map(Number);
      const nextHour = hours + 1;
      if (nextHour <= 23) {
        setEditableEndTime(`${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      }
    }
  };

  const handleEndTimeChange = (time: string) => {
    setEditableEndTime(time);
  };

  // Handle date change - fix timezone offset issue
  const handleDateChange = (dateString: string) => {
    // Create date in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const newDate = new Date(year, month - 1, day); // month is 0-indexed
    setEditableDate(newDate);
  };

  // Get the current effective time range (either original or edited)
  const getCurrentTimeRange = () => {
    if (isTimeEditing) {
      return {
        startTimeStr: editableStartTime,
        endTimeStr: editableEndTime,
        date: editableDate
      };
    } else {
      const startTime = getEffectiveStartTime(timeRange.start);
      const startTimeStr = timeToString(startTime.hour, startTime.minute);
      const endTimeStr = hourToTime(timeRange.visualEnd ?? timeRange.end);
      return {
        startTimeStr,
        endTimeStr,
        date: selectedDate
      };
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !group || !eventForm.title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);

    try {
      const { startTimeStr, endTimeStr, date } = getCurrentTimeRange();

      // Create datetime objects
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
      
      const startDateTime = new Date(date);
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      await createEvent.mutateAsync({
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        group_id: group.id,
      });

      toast.success("Event created successfully!");
      handleDialogClose();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error("Failed to create event. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateUnavailability = async () => {
    if (!user) return;

    setIsProcessing(true);

    try {
      const { startTimeStr, endTimeStr, date } = getCurrentTimeRange();

      await setUnavailability.mutateAsync({
        group_id: group.id,
        user_id: user.id,
        date: format(date, 'yyyy-MM-dd'),
        start_time: startTimeStr,
        end_time: endTimeStr,
      });

      toast.success("Unavailability set successfully!");
      handleDialogClose();
    } catch (error) {
      console.error('Error setting unavailability:', error);
      toast.error("Failed to set unavailability. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDialogClose = () => {
    onOpenChange(false);
    onReset();
  };

  const getTimeRangeDisplay = () => {
    const startTime = getEffectiveStartTime(timeRange.start);
    const startTimeStr = timeToString(startTime.hour, startTime.minute);
    const endTimeStr = hourToTime(timeRange.visualEnd ?? timeRange.end);
    return { startTimeStr, endTimeStr };
  };

  const { startTimeStr, endTimeStr, date } = getCurrentTimeRange();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <LucideCalendar className="h-5 w-5 text-blue-500" />
            Schedule for {format(date, 'PPP')}
          </DialogTitle>
          <DialogDescription>
            Create an event or set unavailability for the selected time slot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Time Range Display with Edit Controls */}
          <Card className="bg-blue-50 border-blue-200 flex-shrink-0">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900 text-sm">Selected Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white text-xs">
                    {startTimeStr} - {endTimeStr}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTimeEditing(!isTimeEditing)}
                    className="h-6 px-2 text-xs"
                  >
                    {isTimeEditing ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </div>
              
              {/* Editable Time Controls */}
              {isTimeEditing && (
                <div className="space-y-3 pt-2 border-t border-blue-200">
                  <div>
                    <Label className="text-xs text-blue-800 mb-1 block">Date</Label>
                    <Input
                      type="date"
                      value={format(editableDate, 'yyyy-MM-dd')}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="h-7 text-xs"
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-blue-800 mb-1 block">Start Time</Label>
                      <Input
                        type="time"
                        value={editableStartTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="h-7 text-xs"
                        min={isPastDate(editableDate) ? undefined : getMinTimeForDate(editableDate)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-blue-800 mb-1 block">End Time</Label>
                      <Input
                        type="time"
                        value={editableEndTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="h-7 text-xs"
                        min={editableStartTime}
                      />
                    </div>
                  </div>
                  
                  {/* Validation Messages */}
                  {isPastDate(editableDate) && (
                    <p className="text-xs text-red-600">Warning: Selected date is in the past</p>
                  )}
                  {editableEndTime <= editableStartTime && (
                    <p className="text-xs text-red-600">End time must be after start time</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Event vs Unavailability */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="unavailability" className="flex items-center gap-2 text-xs">
                <X className="h-3 w-3" />
                Set Unavailability
              </TabsTrigger>
              <TabsTrigger value="event" className="flex items-center gap-2 text-xs">
                <Plus className="h-3 w-3" />
                Create Event
              </TabsTrigger>
            </TabsList>

            {/* Unavailability Tab */}
            <TabsContent value="unavailability" className="space-y-3 mt-4 flex-1">
              <Card>
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <div className="space-y-2 text-xs text-gray-600">
                      <p>This will mark you as unavailable during this time slot.</p>
                      <p>Other group members will see this when scheduling events.</p>
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">Date:</span>
                          <span>{format(date, 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Time:</span>
                          <span>{startTimeStr} - {endTimeStr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Group:</span>
                          <span className="truncate ml-2">{group?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCreateUnavailability}
                  disabled={isProcessing || (isTimeEditing && (editableEndTime <= editableStartTime))}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {isProcessing ? 'Setting...' : 'Set Unavailability'}
                </Button>
              </div>
            </TabsContent>

            {/* Event Tab */}
            <TabsContent value="event" className="space-y-3 mt-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3">
                {/* Event Details */}
                <Card className="flex-shrink-0">
                  <CardContent className="p-3 space-y-3">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="event-title" className="text-xs">Event Title *</Label>
                        <Input
                          id="event-title"
                          value={eventForm.title}
                          onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter event title..."
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="event-description" className="text-xs">Description (Optional)</Label>
                        <Textarea
                          id="event-description"
                          value={eventForm.description}
                          onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter event description..."
                          className="mt-1 text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Participants */}
                <Card className="flex-shrink-0">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      <h4 className="font-medium text-sm">Participants</h4>
                      <Badge variant="secondary" className="text-xs">
                        {eventForm.selectedParticipants.length} selected
                      </Badge>
                    </div>
                    
                    <Separator />

                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                      {members.map((member) => {
                        const isSelected = eventForm.selectedParticipants.includes(member.user_id);
                        const isCurrentUser = member.user_id === user?.id;
                        
                        return (
                          <div
                            key={member.user_id}
                            className={`flex items-center space-x-2 p-1.5 rounded border transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              id={`participant-${member.user_id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleParticipantToggle(member.user_id)}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-3 w-3"
                            />
                            <Label 
                              htmlFor={`participant-${member.user_id}`}
                              className="flex-1 cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-1">
                                <span className="font-medium truncate">
                                  {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                                </span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    You
                                  </Badge>
                                )}
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Event Summary */}
                <Card className="bg-green-50 border-green-200 flex-shrink-0">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-900 text-xs">Event Summary</span>
                      </div>
                      <div className="text-xs text-green-800 space-y-0.5">
                        <div>Date: {format(date, 'MMM d, yyyy')}</div>
                        <div>Time: {startTimeStr} - {endTimeStr}</div>
                        <div>Group: {group?.name}</div>
                        {eventForm.title && <div>Title: {eventForm.title}</div>}
                        <div>Participants: {eventForm.selectedParticipants.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2 flex-shrink-0 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCreateEvent}
                  disabled={
                    isProcessing || 
                    !eventForm.title.trim() || 
                    eventForm.selectedParticipants.length === 0 ||
                    (isTimeEditing && (editableEndTime <= editableStartTime))
                  }
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isProcessing ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
