import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar as LucideCalendar, 
  Clock, 
  Users, 
  CheckCircle,
  ArrowRight,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateEvent } from "@/hooks/useEvents";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { format, addMinutes, parseISO } from "date-fns";
import { toast } from "sonner";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any;
  initialDate?: Date | null;
}

enum Step {
  EventDetails = 1,
  SelectDateTime = 2,
  SelectParticipants = 3,
  Review = 4,
}

interface EventFormData {
  title: string;
  description: string;
  date: Date | undefined;
  startTime: string;
  endTime: string;
  selectedParticipants: string[];
}

export const CreateEventDialog = ({ open, onOpenChange, group, initialDate }: CreateEventDialogProps) => {
  const [step, setStep] = useState<Step>(Step.EventDetails);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    date: initialDate || undefined,
    startTime: "",
    endTime: "",
    selectedParticipants: [],
  });
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const { data: members = [] } = useGroupMembers(group?.id);

  // Reset form when dialog opens/closes and set current user as default participant
  useEffect(() => {
    if (open) {
      setStep(Step.EventDetails);
      setFormData({
        title: "",
        description: "",
        date: initialDate || undefined,
        startTime: "",
        endTime: "",
        selectedParticipants: user?.id ? [user.id] : [],
      });
      setIsCreating(false);
    }
  }, [open, initialDate, user?.id]);

  // Helper to check if a date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Helper to check if a specific time on a date has passed
  const isPastDateTime = (date: Date, timeStr: string): boolean => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    return selectedDateTime <= now;
  };

  // Helper to get minimum time for today
  const getMinTimeForDate = (date: Date): string => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (!isToday) return "00:00";
    
    // For today, minimum time is current time + 1 hour rounded up
    const minHour = Math.ceil((today.getHours() + today.getMinutes() / 60 + 1));
    return `${Math.min(minHour, 23).toString().padStart(2, '0')}:00`;
  };

  // Disable past dates in calendar
  const isDateDisabled = (date: Date): boolean => {
    return isPastDate(date);
  };

  // Step navigation
  const handleNext = () => {
    if (step === Step.EventDetails && (!formData.title.trim())) {
      toast.error("Please enter an event title");
      return;
    }
    if (step === Step.SelectDateTime && (!formData.date || !formData.startTime || !formData.endTime)) {
      toast.error("Please select date and time");
      return;
    }
    if (step === Step.SelectParticipants && formData.selectedParticipants.length === 0) {
      toast.error("Please select at least one participant");
      return;
    }
    if (step < Step.Review) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > Step.EventDetails) {
      setStep(step - 1);
    }
  };

  // Handle time change and auto-calculate end time
  const handleStartTimeChange = (time: string) => {
    setFormData(prev => {
      const newData = { ...prev, startTime: time };
      
      // If no end time is set or end time is before start time, auto-set end time to 1 hour later
      if (!prev.endTime || prev.endTime <= time) {
        const [hours, minutes] = time.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = addMinutes(startDate, 60);
        newData.endTime = format(endDate, 'HH:mm');
      }
      
      return newData;
    });
  };

  const handleEndTimeChange = (time: string) => {
    setFormData(prev => ({ ...prev, endTime: time }));
  };

  // Handle participant selection
  const handleParticipantToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(userId)
        ? prev.selectedParticipants.filter(id => id !== userId)
        : [...prev.selectedParticipants, userId]
    }));
  };

  // Create the event
  const handleCreateEvent = async () => {
    if (!user || !group || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Missing required information");
      return;
    }

    setIsCreating(true);

    try {
      // Create local datetime objects
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
      
      const startDateTime = new Date(formData.date);
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      
      const endDateTime = new Date(formData.date);
      endDateTime.setHours(endHours, endMinutes, 0, 0);
      
      // Convert to UTC for storage
      const startTimeUTC = startDateTime.toISOString();
      const endTimeUTC = endDateTime.toISOString();

      await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        start_time: startTimeUTC,
        end_time: endTimeUTC,
        group_id: group.id,
      });

      toast.success("Event created successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error("Failed to create event. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Reset dialog state on close
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setStep(Step.EventDetails);
      setFormData({
        title: "",
        description: "",
        date: initialDate || undefined,
        startTime: "",
        endTime: "",
        selectedParticipants: user?.id ? [user.id] : [],
      });
      setIsCreating(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LucideCalendar className="h-5 w-5 text-blue-500" />
            Create Event - {group?.name}
          </DialogTitle>
          <DialogDescription>
            Create a new event for your group members.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 mt-4">
          {/* Stepper UI */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1 ${step === Step.EventDetails ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              1 <span className="hidden sm:inline">Event Details</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 ${step === Step.SelectDateTime ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              2 <span className="hidden sm:inline">Date & Time</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 ${step === Step.SelectParticipants ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              3 <span className="hidden sm:inline">Participants</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 ${step === Step.Review ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              4 <span className="hidden sm:inline">Review</span>
            </div>
          </div>

          {/* Step 1: Event Details */}
          {step === Step.EventDetails && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleDialogChange(false)}>Cancel</Button>
                <Button onClick={handleNext} disabled={!formData.title.trim()}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === Step.SelectDateTime && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                  disabled={isDateDisabled}
                  className="rounded-lg border shadow self-start"
                />
                {formData.date && isPastDate(formData.date) && (
                  <Badge variant="destructive" className="mt-2">
                    Cannot schedule events for past dates
                  </Badge>
                )}
              </div>

              {formData.date && !isPastDate(formData.date) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="mt-1"
                      min={getMinTimeForDate(formData.date)}
                    />
                    {formData.startTime && isPastDateTime(formData.date, formData.startTime) && (
                      <p className="text-xs text-red-500 mt-1">This time has already passed</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="mt-1"
                      min={formData.startTime || getMinTimeForDate(formData.date)}
                    />
                    {formData.endTime && formData.startTime && isPastDateTime(formData.date, formData.startTime) && (
                      <p className="text-xs text-red-500 mt-1">Start time has already passed</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button 
                  onClick={handleNext} 
                  disabled={
                    !formData.date || 
                    isPastDate(formData.date) || 
                    !formData.startTime || 
                    !formData.endTime || 
                    formData.endTime <= formData.startTime ||
                    isPastDateTime(formData.date, formData.startTime)
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Participants */}
          {step === Step.SelectParticipants && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Participants
                </Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {members.map((member) => {
                    const isSelected = formData.selectedParticipants.includes(member.user_id);
                    const isCurrentUser = member.user_id === user?.id;
                    
                    return (
                      <div
                        key={member.user_id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Checkbox
                          id={`participant-${member.user_id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleParticipantToggle(member.user_id)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label 
                          htmlFor={`participant-${member.user_id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          {member.profile?.email && member.profile?.full_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              {member.profile.email}
                            </div>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">
                      {formData.selectedParticipants.length} participant{formData.selectedParticipants.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button 
                  onClick={handleNext} 
                  disabled={formData.selectedParticipants.length === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === Step.Review && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <h4 className="font-medium">Event Summary</h4>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm font-medium">Title:</Label>
                        <p className="text-sm">{formData.title}</p>
                      </div>
                      
                      {formData.description && (
                        <div>
                          <Label className="text-sm font-medium">Description:</Label>
                          <p className="text-sm text-gray-600">{formData.description}</p>
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-sm font-medium">Date:</Label>
                        <p className="text-sm">{formData.date && format(formData.date, 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Time:</Label>
                        <p className="text-sm">{formData.startTime} - {formData.endTime}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Group:</Label>
                        <p className="text-sm">{group?.name}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Participants:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.selectedParticipants.map((participantId) => {
                            const member = members.find(m => m.user_id === participantId);
                            return (
                              <Badge key={participantId} variant="outline" className="text-xs">
                                {member?.profile?.full_name || member?.profile?.email || 'Unknown User'}
                                {participantId === user?.id && ' (You)'}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button 
                  onClick={handleCreateEvent} 
                  disabled={isCreating}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isCreating ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
