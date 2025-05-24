import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Calendar as LucideCalendar, ArrowLeft, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { FullPageCalendar } from "@/components/ui/fullpage-calendar";
import { Button } from "@/components/ui/button";
import { useGroupMembers, useMemberAvailability } from '@/hooks/useGroupMembers';
import { GroupCalendarDialog } from "@/components/GroupCalendarDialog";
import { useGroups } from '@/hooks/useGroups';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSetAvailability } from '@/hooks/useGroupMembers';
import { useAuth } from '@/hooks/useAuth';

const userColors = [
  "bg-blue-400/60 border-blue-500",
  "bg-purple-400/60 border-purple-500",
  "bg-green-400/60 border-green-500",
  "bg-pink-400/60 border-pink-500",
  "bg-orange-400/60 border-orange-500",
  "bg-yellow-400/60 border-yellow-500",
  "bg-red-400/60 border-red-500",
  "bg-cyan-400/60 border-cyan-500",
];

export default function TeamCalendarPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { groups } = useGroups();
  const group = groups.find(g => g.id === teamId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { data: members = [] } = useGroupMembers(group?.id);
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { data: availabilities = [] } = useMemberAvailability(group?.id, selectedDateStr);
  const memberColorMap = Object.fromEntries(
    members.map((m, i) => [m.user_id, userColors[i % userColors.length]])
  );
  const { user } = useAuth();
  const setAvailability = useSetAvailability();

  // Drag-to-select state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Store confirmed time range separately to avoid state loss during modal open/close
  const [confirmedTimeRange, setConfirmedTimeRange] = useState<{start: number; end: number} | null>(null);

  // Helper to get time string from hour index
  const hourToTime = (h: number): string => {
    const hours = h.toString().padStart(2, '0');
    return `${hours}:00`;
  };

  // Handle mouse events for drag selection
  const handleGridMouseDown = (e: React.MouseEvent, hour: number) => {
    console.log("Mouse down on hour:", hour);
    setDragStart(hour);
    setDragEnd(hour);
  };
  const handleGridMouseEnter = (e: React.MouseEvent, hour: number) => {
    if (dragStart !== null) {
      console.log("Mouse enter on hour:", hour);
      setDragEnd(hour);
    }
  };
  const handleGridMouseUp = () => {
    if (dragStart !== null && dragEnd !== null && dragStart !== dragEnd) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      
      // Store the selected range in a stable state variable
      setConfirmedTimeRange({
        start: start,
        end: end
      });
      
      // Show the modal after storing the time range
      setShowConfirmModal(true);
    }
  };
  const resetDrag = () => {
    setDragStart(null);
    setDragEnd(null);
    // Don't reset confirmedTimeRange here - we want to keep it for the modal
  };

  // Confirm and save new availability
  const handleConfirmAvailability = () => {
    if (!user || !selectedDate || !confirmedTimeRange) return;
    
    const { start, end } = confirmedTimeRange;
    
    setAvailability.mutate({
      group_id: group.id,
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: hourToTime(start),
      end_time: hourToTime(end), // Don't add 1 - save exactly what's shown in the modal
    });
    setShowConfirmModal(false);
    resetDrag();
  };

  // --- Main Render ---
  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <div className="flex items-center gap-2 p-4 border-b bg-white/80">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LucideCalendar className="h-6 w-6 text-blue-500" />
          {group?.name || 'Team'} Calendar
        </h2>
        <div className="flex-1" />
        <Button size="sm" className="ml-2" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Set My Availability
        </Button>
      </div>
      
      {/* Container for calendar content - takes remaining screen height */}
      <div className="flex-1 overflow-hidden">
        {/* Default: Full month calendar */}
        {!selectedDate && (
          <FullPageCalendar
            mode="single"
            selected={undefined}
            onSelect={date => date && setSelectedDate(date)}
            className="w-full h-full"
          />
        )}
        
        {/* Time view for a specific date */}
        {selectedDate && (
          <div className="flex flex-1 h-full">
            {/* Time grid for selected date */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(null)}>
                    &larr; Back to Month
                  </Button>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {format(selectedDate, 'PPP')}
                  </h3>
                  <div className="w-32" />
                </div>
                <div
                  className="relative h-[600px] border rounded-lg bg-white overflow-hidden select-none"
                  onMouseLeave={resetDrag}
                  onMouseUp={handleGridMouseUp}
                >
                  {/* 24h grid with drag handlers */}
                  <div className="absolute left-0 top-0 w-full h-full grid grid-rows-24 border-r">
                    {[...Array(24)].map((_, h) => (
                      <div
                        key={h}
                        className={`border-b border-dashed border-gray-200 text-xs text-gray-400 pl-2 flex items-center h-[25px] cursor-pointer ${
                          dragStart !== null && dragEnd !== null && h >= Math.min(dragStart, dragEnd) && h <= Math.max(dragStart, dragEnd)
                            ? 'bg-blue-100/70'
                            : ''
                        }`}
                        onMouseDown={e => handleGridMouseDown(e, h)}
                        onMouseEnter={e => handleGridMouseEnter(e, h)}
                      >
                        {h}:00
                      </div>
                    ))}
                  </div>
                  {/* Availabilities as colored rectangles */}
                  {members.map((member, idx) => {
                    const color = memberColorMap[member.user_id];
                    return availabilities.filter(a => a.user_id === member.user_id && a.date === selectedDateStr).map((a, i) => {
                      // Calculate top/height in percent
                      const start = parseInt(a.start_time.split(':')[0], 10) + parseInt(a.start_time.split(':')[1], 10) / 60;
                      const end = parseInt(a.end_time.split(':')[0], 10) + parseInt(a.end_time.split(':')[1], 10) / 60;
                      const top = (start / 24) * 600;
                      const height = ((end - start) / 24) * 600;
                      return (
                        <div
                          key={i}
                          className={`absolute left-[${idx*8}px] w-[90%] ${color} border rounded-md flex items-center px-2 py-1 text-xs`}
                          style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 + idx, opacity: 0.85 }}
                        >
                          <span className="truncate">
                            {member.profile?.full_name || member.user_id}: {a.start_time} - {a.end_time}
                          </span>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
            {/* Mini calendar on the right */}
            <div className="w-[320px] flex flex-col items-center pt-8 pr-8">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => date && setSelectedDate(date)}
                className="bg-white rounded-lg shadow p-2 w-full"
              />
            </div>
          </div>
        )}
      </div>
      
      <GroupCalendarDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        group={group}
      />
      {/* Mini confirmation modal for new availability */}
      <Dialog 
        open={showConfirmModal} 
        onOpenChange={open => { 
          setShowConfirmModal(open); 
          if (!open) resetDrag(); 
        }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Availability</DialogTitle>
            <DialogDescription>Please confirm your availability time slot</DialogDescription>
          </DialogHeader>
          <div className="py-2 text-center">
            Add availability for <b>{selectedDate && format(selectedDate, 'PPP')}</b>
            
            <div className="font-semibold text-blue-700 text-lg mt-3 mb-3 border border-gray-200 rounded-md p-2 bg-blue-50">
              {confirmedTimeRange && (
                <>
                  <p>From: <span className="text-black">{hourToTime(confirmedTimeRange.start)}</span></p>
                  <p>To: <span className="text-black">{hourToTime(confirmedTimeRange.end)}</span></p>
                </>
              )}
            </div>
            
            Is this correct?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfirmModal(false); resetDrag(); }}>Cancel</Button>
            <Button onClick={handleConfirmAvailability} disabled={setAvailability.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
