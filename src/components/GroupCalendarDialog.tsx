import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar as LucideCalendar, Users, Clock, Plus, Trash2, ArrowRight, CheckCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGroupMembers, useMemberUnavailability, useSetUnavailability } from '@/hooks/useGroupMembers';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface GroupCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: any;
}

type TimeFrame = { start: string; end: string };

enum Step {
  SelectDate = 1,
  AddTimeFrames = 2,
  Review = 3,
}

export function GroupCalendarDialog({ open, onOpenChange, group }: GroupCalendarDialogProps) {
  const [step, setStep] = useState<Step>(Step.SelectDate);
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const { user } = useAuth();
  const { data: members = [], isLoading: loadingMembers } = useGroupMembers(group?.id);
  const selectedDate = selected ? format(selected, 'yyyy-MM-dd') : undefined;
  const { data: availabilities = [] } = useMemberUnavailability(group?.id, selectedDate);
  const setUnavailability = useSetUnavailability();
  const [timeFrames, setTimeFrames] = useState<TimeFrame[]>([{ start: '', end: '' }]);
  const [saved, setSaved] = useState(false);

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

  // Helper function to disable past dates
  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Step 1: Select date - only allow future dates
  const handleDateNext = () => {
    if (selected && isPastDate(selected)) {
      return; // Prevent proceeding with past dates
    }
    setStep(Step.AddTimeFrames);
    setSaved(false);
  };

  // Step 2: Add time frames
  const handleAddTimeFrame = () => {
    setTimeFrames([...timeFrames, { start: '', end: '' }]);
  };
  const handleRemoveTimeFrame = (idx: number) => {
    setTimeFrames(timeFrames.filter((_, i) => i !== idx));
  };
  const handleTimeChange = (idx: number, field: 'start' | 'end', value: string) => {
    setTimeFrames(timeFrames.map((tf, i) => i === idx ? { ...tf, [field]: value } : tf));
  };
  const handleTimeFramesNext = () => {
    setStep(Step.Review);
  };

  // Step 3: Review & Save
  const handleSave = () => {
    if (!user || !selectedDate) return;
    setUnavailability.mutate(
      timeFrames
        .filter(tf => tf.start && tf.end)
        .map(tf => ({
          group_id: group.id,
          user_id: user.id,
          date: selectedDate,
          start_time: tf.start,
          end_time: tf.end,
        }))
    , {
      onSuccess: () => setSaved(true)
    });
  };

  const handleBack = () => {
    setStep(step === Step.AddTimeFrames ? Step.SelectDate : Step.AddTimeFrames);
    setSaved(false);
  };

  // Reset dialog state on close
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setStep(Step.SelectDate);
      setSelected(undefined);
      setTimeFrames([{ start: '', end: '' }]);
      setSaved(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LucideCalendar className="h-5 w-5 text-blue-500" />
            {group.name} Calendar
          </DialogTitle>
          <DialogDescription>
            Schedule when you are unavilable for this group.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-8 mt-4">
          {/* Stepper UI */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex items-center gap-1 ${step === Step.SelectDate ? 'font-bold text-blue-600' : 'text-gray-400'}`}>1 <span className="hidden sm:inline">Select Date</span></div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 ${step === Step.AddTimeFrames ? 'font-bold text-blue-600' : 'text-gray-400'}`}>2 <span className="hidden sm:inline">Add Time Frames</span></div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center gap-1 ${step === Step.Review ? 'font-bold text-blue-600' : 'text-gray-400'}`}>3 <span className="hidden sm:inline">Review & Save</span></div>
          </div>

          {/* Step 1: Select Date */}
          {step === Step.SelectDate && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={setSelected}
                  disabled={isDateDisabled}
                  className="rounded-lg border shadow self-center"
                />
                {selected && isPastDate(selected) && (
                  <Badge variant="destructive" className="mt-2">
                    Cannot schedule unavailability for past dates
                  </Badge>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => handleDialogChange(false)} variant="outline">Cancel</Button>
                <Button 
                  onClick={handleDateNext} 
                  disabled={!selected || isPastDate(selected)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Add Time Frames */}
          {step === Step.AddTimeFrames && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  When are you busy on {selectedDate}?
                </h4>
                {timeFrames.map((tf, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <input
                      type="time"
                      value={tf.start}
                      onChange={e => handleTimeChange(idx, 'start', e.target.value)}
                      className="border rounded px-2 py-1"
                      min={selected ? getMinTimeForDate(selected) : "00:00"}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={tf.end}
                      onChange={e => handleTimeChange(idx, 'end', e.target.value)}
                      className="border rounded px-2 py-1"
                      min={tf.start || (selected ? getMinTimeForDate(selected) : "00:00")}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleRemoveTimeFrame(idx)} disabled={timeFrames.length === 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    {tf.start && selected && isPastDateTime(selected, tf.start) && (
                      <p className="text-xs text-red-500 col-span-3">This time has already passed</p>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={handleAddTimeFrame} className="mt-2">
                  <Plus className="h-4 w-4 mr-1" /> Add Time Frame
                </Button>
              </div>
              <div className="flex justify-between gap-2">
                <Button onClick={handleBack} variant="outline">Back</Button>
                <Button 
                  onClick={handleTimeFramesNext} 
                  disabled={
                    timeFrames.some(tf => !tf.start || !tf.end) ||
                    (selected && timeFrames.some(tf => tf.start && isPastDateTime(selected, tf.start)))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Save */}
          {step === Step.Review && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Review your unavailability for {selectedDate}
                </h4>
                <ul className="list-disc ml-6">
                  {timeFrames.map((tf, idx) => (
                    <li key={idx} className="mb-1">{tf.start} - {tf.end}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between gap-2">
                <Button onClick={handleBack} variant="outline">Back</Button>
                <Button onClick={handleSave} disabled={setUnavailability.isPending || saved}>
                  {saved ? 'Saved!' : 'Save'}
                </Button>
              </div>
              {saved && <div className="text-green-600 text-sm mt-2 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Unavailability saved!</div>}
            </div>
          )}

          {/* Group unavailability for the selected date */}
          {selectedDate && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-1">
                <Users className="h-4 w-4 text-purple-500" />
                Group Unavailability for {selectedDate}
                {selected && isPastDate(selected) && (
                  <Badge variant="secondary" className="ml-2 text-xs">Past Date</Badge>
                )}
              </h4>
              <div className="space-y-1">
                {availabilities.length === 0 ? (
                  <span className="text-gray-400 text-xs">No unavailability set for this day.</span>
                ) : (
                  availabilities.map((a, i) => {
                    const member = members.find(m => m.user_id === a.user_id);
                    return (
                      <div key={i} className="flex gap-2 items-center text-xs">
                        <Badge className="bg-gray-100 text-gray-800">{member?.profile?.full_name || a.user_id}</Badge>
                        <span>{a.start_time} - {a.end_time}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
