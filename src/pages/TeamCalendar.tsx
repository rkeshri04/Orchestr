import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Calendar as LucideCalendar, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { FullPageCalendar } from "@/components/ui/fullpage-calendar";
import { Button } from "@/components/ui/button";
import { useGroupMembers, useMemberAvailability } from '@/hooks/useGroupMembers';
import { GroupCalendarDialog } from "@/components/GroupCalendarDialog";
import { useGroups } from '@/hooks/useGroups';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSetAvailability, useDeleteAvailability } from '@/hooks/useGroupMembers';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

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
  
  console.log('Current members:', members);
  console.log('Current availabilities:', availabilities);
  console.log('Selected date:', selectedDateStr);
  
  const memberColorMap = Object.fromEntries(
    members.map((m, i) => [m.user_id, userColors[i % userColors.length]])
  );
  const { user } = useAuth();
  const setAvailability = useSetAvailability();
  const deleteAvailability = useDeleteAvailability();
  const queryClient = useQueryClient();

  // Drag-to-select state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Store confirmed time range separately to avoid state loss during modal open/close
  const [confirmedTimeRange, setConfirmedTimeRange] = useState<{start: number; end: number} | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    availability: any;
  } | null>(null);
  
  // Edit availability state
  const [editingAvailability, setEditingAvailability] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTimeRange, setEditTimeRange] = useState<{start: number; end: number} | null>(null);

  // Helper to convert time string to decimal hours
  const timeToDecimal = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

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
      end_time: hourToTime(end),
    });
    setShowConfirmModal(false);
    resetDrag();
  };

  // Handle right-click on availability rectangle
  const handleAvailabilityRightClick = (e: React.MouseEvent, availability: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show context menu for current user's availability
    if (availability.user_id === user?.id) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        availability
      });
    }
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle edit availability
  const handleEditAvailability = () => {
    if (!contextMenu) return;
    
    const availability = contextMenu.availability;
    setEditingAvailability(availability);
    
    // Convert time to hours for editing
    const startHour = Math.floor(timeToDecimal(availability.start_time));
    const endHour = Math.ceil(timeToDecimal(availability.end_time));
    
    setEditTimeRange({ start: startHour, end: endHour });
    setShowEditModal(true);
    closeContextMenu();
  };

  // Handle delete availability
  const handleDeleteAvailability = () => {
    if (!contextMenu) return;
    
    const availability = contextMenu.availability;
    deleteAvailability.mutate(availability.id);
    closeContextMenu();
  };

  // Handle update availability
  const handleUpdateAvailability = () => {
    if (!editingAvailability || !editTimeRange) return;
    
    setAvailability.mutate({
      group_id: group.id,
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: hourToTime(editTimeRange.start),
      end_time: hourToTime(editTimeRange.end),
    });
    
    // Delete the old availability record
    supabase
      .from('availability')
      .delete()
      .eq('id', editingAvailability.id)
      .then(() => {
        console.log('Old availability deleted');
      });
    
    setShowEditModal(false);
    setEditingAvailability(null);
    setEditTimeRange(null);
  };

  // --- Main Render ---
  return (
    <div className="w-full h-screen flex flex-col bg-background" onClick={closeContextMenu}>
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

                {/* Members legend */}
                {members.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Team Members:</h4>
                    <div className="flex flex-wrap gap-2">
                      {members.map((member, idx) => (
                        <div key={member.user_id} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-sm ${memberColorMap[member.user_id]}`}></div>
                          <span className="text-sm">
                            {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                  {/* Availability rectangles for all team members */}
                  {availabilities.map((availability, availIndex) => {
                    const memberIndex = members.findIndex(m => m.user_id === availability.user_id);
                    const color = memberColorMap[availability.user_id] || userColors[0];
                    const isCurrentUser = availability.user_id === user?.id;
                    
                    // Calculate position based on time
                    const startDecimal = timeToDecimal(availability.start_time);
                    const endDecimal = timeToDecimal(availability.end_time);
                    const top = (startDecimal / 24) * 600;
                    const height = ((endDecimal - startDecimal) / 24) * 600;
                    
                    // Get member info for display
                    const member = members.find(m => m.user_id === availability.user_id);
                    const memberName = member?.profile?.full_name || member?.profile?.email || 'Unknown';
                    
                    return (
                      <div
                        key={`${availability.id}-${availIndex}`}
                        className={`${color} absolute border rounded-md flex items-center px-2 py-1 text-xs font-medium ${
                          isCurrentUser ? 'cursor-context-menu hover:opacity-90' : 'pointer-events-none'
                        }`}
                        style={{
                          left: `${60 + (memberIndex * 10)}px`,
                          width: 'calc(100% - 80px)',
                          top: `${top}px`,
                          height: `${Math.max(height, 20)}px`,
                          zIndex: 10 + memberIndex,
                          opacity: 0.85,
                        }}
                        onContextMenu={e => handleAvailabilityRightClick(e, availability)}
                      >
                        <span className="truncate">
                          {memberName}: {availability.start_time} - {availability.end_time}
                        </span>
                      </div>
                    );
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

      {/* Confirmation modal for new availability */}
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
            <Button 
              onClick={handleConfirmAvailability} 
              disabled={setAvailability.isPending}
            >
              {setAvailability.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleEditAvailability}
          >
            <Edit className="h-4 w-4" />
            Edit Time
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
            onClick={handleDeleteAvailability}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {/* Edit Availability Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Availability</DialogTitle>
            <DialogDescription>Modify your availability time slot</DialogDescription>
          </DialogHeader>
          <div className="py-2 text-center">
            <p className="mb-4">Edit availability for <b>{selectedDate && format(selectedDate, 'PPP')}</b></p>
            
            {editTimeRange && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <select 
                    value={editTimeRange.start} 
                    onChange={e => setEditTimeRange({...editTimeRange, start: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded"
                  >
                    {[...Array(24)].map((_, h) => (
                      <option key={h} value={h}>{hourToTime(h)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <select 
                    value={editTimeRange.end} 
                    onChange={e => setEditTimeRange({...editTimeRange, end: parseInt(e.target.value)})}
                    className="w-full p-2 border rounded"
                  >
                    {[...Array(24)].map((_, h) => (
                      <option key={h + 1} value={h + 1}>{hourToTime(h + 1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateAvailability} 
              disabled={setAvailability.isPending}
            >
              {setAvailability.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
