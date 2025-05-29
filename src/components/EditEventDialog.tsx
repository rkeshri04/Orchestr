import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useUpdateEvent } from '@/hooks/useEvents';

enum Step {
  EditBasicInfo = 1,
  EditParticipants = 2,
}

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  groupId: string;
}

interface EventFormData {
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  selectedParticipants: string[];
}

export const EditEventDialog = ({ open, onOpenChange, event, groupId }: EditEventDialogProps) => {
  const [step, setStep] = useState<Step>(Step.EditBasicInfo);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    selectedParticipants: [],
  });

  const { data: members = [] } = useGroupMembers(groupId);
  const updateEvent = useUpdateEvent();

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      const eventStartTime = new Date(event.start_time);
      const eventEndTime = new Date(event.end_time);
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: eventStartTime,
        startTime: format(eventStartTime, 'HH:mm'),
        endTime: format(eventEndTime, 'HH:mm'),
        selectedParticipants: [],
      });
    }
  }, [event]);

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
    
    const minHour = Math.ceil((today.getHours() + today.getMinutes() / 60 + 1));
    return `${Math.min(minHour, 23).toString().padStart(2, '0')}:00`;
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep(Step.EditBasicInfo);
    }
  }, [open]);

  const handleNext = () => {
    if (step === Step.EditBasicInfo) {
      setStep(Step.EditParticipants);
    }
  };

  const handleBack = () => {
    if (step === Step.EditParticipants) {
      setStep(Step.EditBasicInfo);
    }
  };

  const handleParticipantToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(userId)
        ? prev.selectedParticipants.filter(id => id !== userId)
        : [...prev.selectedParticipants, userId]
    }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !event) return;

    // Create UTC datetime strings properly
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Create Date objects with proper timezone handling
    const [startHour, startMinute] = formData.startTime.split(':').map(Number);
    const [endHour, endMinute] = formData.endTime.split(':').map(Number);
    
    const startDateTime = new Date(formData.date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(formData.date);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    updateEvent.mutate({
      id: event.id,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
    });

    onOpenChange(false);
  };

  const canProceed = formData.title.trim().length > 0;
  const canSubmit = canProceed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Edit Event
          </DialogTitle>
          <DialogDescription>
            Modify your event details and participants.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-4">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1 ${step === Step.EditBasicInfo ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              1 <span className="hidden sm:inline">Event Details</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 ${step === Step.EditParticipants ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
              2 <span className="hidden sm:inline">Participants</span>
            </div>
          </div>

          {/* Step 1: Edit Basic Info */}
          {step === Step.EditBasicInfo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Event Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={format(formData.date, 'yyyy-MM-dd')}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-start-time">Start Time</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    min={getMinTimeForDate(formData.date)}
                  />
                  {formData.startTime && isPastDateTime(formData.date, formData.startTime) && (
                    <p className="text-xs text-red-500">This time has already passed</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end-time">End Time</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    min={formData.startTime || getMinTimeForDate(formData.date)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={
                    !canProceed || 
                    isPastDate(formData.date) ||
                    isPastDateTime(formData.date, formData.startTime)
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Edit Participants */}
          {step === Step.EditParticipants && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <h3 className="font-semibold">Select Participants</h3>
                  <Badge variant="secondary">{formData.selectedParticipants.length} selected</Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {members.map((member) => (
                    <div key={member.user_id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`edit-participant-${member.user_id}`}
                        checked={formData.selectedParticipants.includes(member.user_id)}
                        onCheckedChange={() => handleParticipantToggle(member.user_id)}
                      />
                      <label 
                        htmlFor={`edit-participant-${member.user_id}`}
                        className="flex-1 flex items-center gap-3 cursor-pointer"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                          {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {member.profile?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">{member.profile?.email}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!canSubmit || updateEvent.isPending}
                  >
                    {updateEvent.isPending ? 'Updating...' : 'Update Event'}
                    <Clock className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
