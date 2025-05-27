import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Calendar as LucideCalendar, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { FullPageCalendar } from "@/components/ui/fullpage-calendar";
import { Button } from "@/components/ui/button";
import { useGroupMembers, useMemberUnavailability } from '@/hooks/useGroupMembers';
import { GroupCalendarDialog } from "@/components/GroupCalendarDialog";
import { useGroups } from '@/hooks/useGroups';
import { useEvents } from '@/hooks/useEvents';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSetUnavailability, useDeleteUnavailability } from '@/hooks/useGroupMembers';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  
  // All hooks must be called at the top level
  const { groups, isLoading: isLoadingGroups } = useGroups();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { user } = useAuth();
  const setUnavailability = useSetUnavailability();
  const deleteUnavailability = useDeleteUnavailability();
  const queryClient = useQueryClient();

  // Drag-to-select state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmedTimeRange, setConfirmedTimeRange] = useState<{start: number; end: number; visualEnd?: number} | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    unavailability: any;
  } | null>(null);
  
  // Edit unavailability state
  const [editingUnavailability, setEditingUnavailability] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTimeRange, setEditTimeRange] = useState<{start: number; end: number} | null>(null);

  // Find group after hooks are initialized
  const group = groups?.find(g => g.id === teamId);
  
  // Data hooks that depend on group
  const { data: members = [] } = useGroupMembers(group?.id);
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { data: availabilities = [] } = useMemberUnavailability(group?.id, selectedDateStr);
  const { data: events = [] } = useEvents(group?.id);
  
  console.log('Current members:', members);
  console.log('Current availabilities:', availabilities);
  console.log('Current events:', events);
  console.log('Selected date:', selectedDateStr);
  
  const memberColorMap = Object.fromEntries(
    members.map((m, i) => [m.user_id, userColors[i % userColors.length]])
  );

  // Show loading while groups are being fetched
  if (isLoadingGroups) {
    return (
      <div className="w-full h-screen flex flex-col bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-white/80">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LucideCalendar className="h-6 w-6 text-blue-500" />
            Loading Team Calendar...
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading team information...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error if group not found after loading
  if (!group) {
    return (
      <div className="w-full h-screen flex flex-col bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-white/80">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LucideCalendar className="h-6 w-6 text-blue-500" />
            Team Not Found
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="p-8">
              <LucideCalendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Team Not Found</h3>
              <p className="text-gray-500 mb-4">
                The team you're looking for doesn't exist or you don't have access to it.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Go Back
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

  // Helper to check if a date is in the past
  const isPastDate = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Helper to check if a time slot already has unavailability for current user
  const hasUnavailabilityAtHour = (hour: number): boolean => {
    if (!user?.id) return false;
    
    return availabilities.some(unavailability => {
      if (unavailability.user_id !== user.id) return false;
      
      const startHour = Math.floor(timeToDecimal(unavailability.start_time));
      const endHour = Math.floor(timeToDecimal(unavailability.end_time)); // changed from Math.ceil to Math.floor
      
      return hour >= startHour && hour < endHour; // only block up to but not including endHour
    });
  };

  // Handle mouse events for drag selection - only allow for future dates and free time slots
  const handleGridMouseDown = (e: React.MouseEvent, hour: number) => {
    if (isPastDate(selectedDate)) return; // Prevent dragging on past dates
    if (hasUnavailabilityAtHour(hour)) return; // Prevent dragging over existing unavailability
    
    console.log("Mouse down on hour:", hour);
    setDragStart(hour);
    setDragEnd(hour);
  };
  
  const handleGridMouseEnter = (e: React.MouseEvent, hour: number) => {
    if (isPastDate(selectedDate)) return; // Prevent dragging on past dates
    if (hasUnavailabilityAtHour(hour)) return; // Prevent dragging over existing unavailability
    
    if (dragStart !== null) {
      console.log("Mouse enter on hour:", hour);
      setDragEnd(hour);
    }
  };
  
  const handleGridMouseUp = () => {
    if (isPastDate(selectedDate)) return; // Prevent dragging on past dates
    
    if (dragStart !== null && dragEnd !== null && dragStart !== dragEnd) {
      const start = Math.min(dragStart, dragEnd);
      const visualEnd = Math.max(dragStart, dragEnd); // This is what user sees and expects
      
      // Store the visual range (what user expects to be saved)
      setConfirmedTimeRange({
        start: start,
        end: visualEnd, // Store the visual end for saving
        visualEnd: visualEnd // Store visual end for display (same value)
      });
      
      // Show the modal after storing the time range
      setShowConfirmModal(true);
    }
  };
  const resetDrag = () => {
    setDragStart(null);
    setDragEnd(null);
  };

  // Confirm and save new unavailability
  const handleConfirmUnavailability = () => {
    if (!user || !selectedDate || !confirmedTimeRange) return;
    
    const { start, end } = confirmedTimeRange;
    
    setUnavailability.mutate({
      group_id: group.id,
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: hourToTime(start),
      end_time: hourToTime(end), // This now saves the visual end time user expects
    });
    setShowConfirmModal(false);
    resetDrag();
  };

  // Handle right-click on unavailability rectangle
  const handleUnavailabilityRightClick = (e: React.MouseEvent, unavailability: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only show context menu for current user's unavailability
    if (unavailability.user_id === user?.id) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        unavailability
      });
    }
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle edit unavailability
  const handleEditUnavailability = () => {
    if (!contextMenu) return;
    
    const unavailability = contextMenu.unavailability;
    setEditingUnavailability(unavailability);
    
    // Convert time to hours for editing
    const startHour = Math.floor(timeToDecimal(unavailability.start_time));
    const endHour = Math.ceil(timeToDecimal(unavailability.end_time));
    
    setEditTimeRange({ start: startHour, end: endHour });
    setShowEditModal(true);
    closeContextMenu();
  };

  // Handle delete unavailability
  const handleDeleteUnavailability = () => {
    if (!contextMenu) return;
    
    const unavailability = contextMenu.unavailability;
    deleteUnavailability.mutate(unavailability.id);
    closeContextMenu();
  };

  // Handle update unavailability
  const handleUpdateUnavailability = () => {
    if (!editingUnavailability || !editTimeRange) return;
    
    setUnavailability.mutate({
      group_id: group.id,
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: hourToTime(editTimeRange.start),
      end_time: hourToTime(editTimeRange.end),
    });
    
    // Delete the old unavailability record
    supabase
      .from('busy')
      .delete()
      .eq('id', editingUnavailability.id)
      .then(() => {
        console.log('Old unavailability deleted');
      });
    
    setShowEditModal(false);
    setEditingUnavailability(null);
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
        {/* Only show the button for future dates */}
        {!isPastDate(selectedDate) && (
          <Button size="sm" className="ml-2" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Set Unavailability
          </Button>
        )}
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
          <div className="flex flex-1 h-full gap-4">
            {/* Time grid for selected date - 80% width */}
            <div className="w-4/5 flex flex-col py-4 px-4">
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(null)}>
                    &larr; Back to Month
                  </Button>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {format(selectedDate, 'PPP')}
                    {isPastDate(selectedDate) && (
                      <Badge variant="secondary" className="text-xs">Past Date</Badge>
                    )}
                  </h3>
                  <div className="w-32" />
                </div>

                {/* Scrollable time container with increased height */}
                <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
                  <div
                    className={`relative h-[1200px] select-none ${
                      isPastDate(selectedDate) ? 'opacity-75' : ''
                    }`}
                    onMouseLeave={resetDrag}
                    onMouseUp={handleGridMouseUp}
                  >
                    {/* 24h grid with drag handlers */}
                    <div className="absolute left-0 top-0 w-full h-full grid grid-rows-24 border-r">
                      {[...Array(24)].map((_, h) => {
                        const hasCurrentUserUnavailability = hasUnavailabilityAtHour(h);
                        
                        return (
                          <div
                            key={h}
                            className={`border-b border-dashed border-gray-200 text-xs text-gray-400 pl-2 flex items-center h-[50px] ${
                              isPastDate(selectedDate) || hasCurrentUserUnavailability
                                ? 'cursor-not-allowed' 
                                : 'cursor-pointer'
                            } ${
                              hasCurrentUserUnavailability
                                ? 'bg-gray-100/50'
                                : ''
                            } ${
                              !isPastDate(selectedDate) && !hasCurrentUserUnavailability && dragStart !== null && dragEnd !== null && h >= Math.min(dragStart, dragEnd) && h <= Math.max(dragStart, dragEnd)
                                ? 'bg-blue-100/70'
                                : ''
                            }`}
                            onMouseDown={e => handleGridMouseDown(e, h)}
                            onMouseEnter={e => handleGridMouseEnter(e, h)}
                          >
                            {h}:00
                          </div>
                        );
                      })}
                    </div>

                    {/* Show overlay message for past dates */}
                    {isPastDate(selectedDate) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 backdrop-blur-sm z-50">
                        <div className="text-center p-4 bg-white rounded-lg shadow border">
                          <LucideCalendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 font-medium">Cannot edit past dates</p>
                          <p className="text-gray-500 text-sm">You can view existing unavailability but cannot create new slots</p>
                        </div>
                      </div>
                    )}

                    {/* Unavailability rectangles for all team members */}
                    {availabilities.map((unavailability, availIndex) => {
                      const memberIndex = members.findIndex(m => m.user_id === unavailability.user_id);
                      const color = memberColorMap[unavailability.user_id] || userColors[0];
                      const isCurrentUser = unavailability.user_id === user?.id;
                      
                      // Calculate position based on time with increased height
                      const startDecimal = timeToDecimal(unavailability.start_time);
                      const endDecimal = timeToDecimal(unavailability.end_time);
                      let height = ((endDecimal - startDecimal) / 24) * 1200;
                      // Ensure at least 1 hour block is shown
                      if (height < 50) height = 50;
                      const top = (startDecimal / 24) * 1200;
                      
                      // Get member info for display
                      const member = members.find(m => m.user_id === unavailability.user_id);
                      const memberName = member?.profile?.full_name || member?.profile?.email || 'Unknown';
                      
                      return (
                        <div
                          key={`${unavailability.id}-${availIndex}`}
                          className={`${color} absolute border rounded-md flex items-center px-2 py-1 text-xs font-medium ${
                            isCurrentUser ? 'cursor-context-menu hover:opacity-90' : 'pointer-events-none'
                          }`}
                          style={{
                            left: '60px',
                            width: 'calc(100% - 80px)',
                            top: `${top}px`,
                            height: `${height}px`,
                            zIndex: 10 + memberIndex,
                            opacity: 0.85,
                          }}
                          onContextMenu={e => handleUnavailabilityRightClick(e, unavailability)}
                        >
                          <span className="truncate">
                            {memberName}: {unavailability.start_time} - {unavailability.end_time}
                          </span>
                        </div>
                      );
                    })}

                    {/* Event rectangles for scheduled events */}
                    {events
                      .filter(event => {
                        // Only show events for the selected date
                        const eventDate = format(new Date(event.start_time), 'yyyy-MM-dd');
                        return eventDate === selectedDateStr;
                      })
                      .map((event, eventIndex) => {
                        const eventStartTime = new Date(event.start_time);
                        const eventEndTime = new Date(event.end_time);
                        
                        // Calculate position based on time with same logic as unavailability rectangles
                        const startDecimal = eventStartTime.getHours() + (eventStartTime.getMinutes() / 60);
                        const endDecimal = eventEndTime.getHours() + (eventEndTime.getMinutes() / 60) + 1; // Add 1 hour for proper rectangle display
                        const top = (startDecimal / 24) * 1200;
                        const height = ((endDecimal - startDecimal) / 24) * 1200;
                        
                        return (
                          <div
                            key={`event-${event.id}-${eventIndex}`}
                            className="absolute border-2 border-green-600 bg-green-100/90 rounded-md flex items-center px-2 py-1 text-xs font-bold text-green-800"
                            style={{
                              // Uniform left and width for all rectangles
                              left: '60px',
                              width: 'calc(100% - 80px)',
                              top: `${top}px`,
                              height: `${Math.max(height, 40)}px`,
                              zIndex: 50, // Higher z-index to appear above unavailability
                            }}
                            title={`${event.title}\n${event.description || ''}`}
                          >
                            <span className="truncate">
                              📅 {event.title} ({format(eventStartTime, 'HH:mm')} - {format(eventEndTime, 'HH:mm')})
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right sidebar - 20% width */}
            <div className="w-1/5 flex flex-col py-4 pr-4 space-y-6">
              {/* Mini calendar on top */}
              <div className="flex flex-col">
                <h4 className="text-sm font-medium mb-2 text-gray-700">Calendar</h4>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => date && setSelectedDate(date)}
                  className="bg-white rounded-lg shadow p-2 w-full"
                />
              </div>

              {/* Team members below calendar */}
              {members.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-3 text-gray-700">Team Members</h4>
                  <div className="space-y-2">
                    {members.map((member, idx) => (
                      <div key={member.user_id} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${memberColorMap[member.user_id]}`}></div>
                        <span className="text-xs truncate">
                          {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events section */}
              {selectedDate && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-3 text-gray-700 flex items-center gap-1">
                    📅 Events for {format(selectedDate, 'MMM d')}
                  </h4>
                  <div className="space-y-2">
                    {events
                      .filter(event => {
                        const eventDate = format(new Date(event.start_time), 'yyyy-MM-dd');
                        return eventDate === selectedDateStr;
                      })
                      .length === 0 ? (
                      <div className="text-xs text-gray-500 italic">
                        No events scheduled
                      </div>
                    ) : (
                      events
                        .filter(event => {
                          const eventDate = format(new Date(event.start_time), 'yyyy-MM-dd');
                          return eventDate === selectedDateStr;
                        })
                        .map((event, idx) => {
                          const startTime = new Date(event.start_time);
                          const endTime = new Date(event.end_time);
                          return (
                            <div key={event.id} className="bg-green-100 border border-green-200 rounded p-2">
                              <div className="font-medium text-xs text-green-800 truncate">
                                {event.title}
                              </div>
                              <div className="text-xs text-green-600">
                                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                              </div>
                              {event.description && (
                                <div className="text-xs text-green-600 truncate">
                                  {event.description}
                                </div>
                              )}
                            </div>
                        );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <GroupCalendarDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        group={group}
      />

      {/* Confirmation modal for new unavailability */}
      <Dialog 
        open={showConfirmModal} 
        onOpenChange={open => { 
          setShowConfirmModal(open); 
          if (!open) resetDrag(); 
        }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Unavailability</DialogTitle>
            <DialogDescription>Please confirm your unavailability time slot</DialogDescription>
          </DialogHeader>
          <div className="py-2 text-center">
            Add unavailability for <b>{selectedDate && format(selectedDate, 'PPP')}</b>
            
            <div className="font-semibold text-blue-700 text-lg mt-3 mb-3 border border-gray-200 rounded-md p-2 bg-blue-50">
              {confirmedTimeRange && (
                <>
                  <p>From: <span className="text-black">{hourToTime(confirmedTimeRange.start)}</span></p>
                  <p>To: <span className="text-black">{hourToTime(confirmedTimeRange.visualEnd ?? confirmedTimeRange.end)}</span></p>
                </>
              )}
            </div>
            
            Is this correct?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfirmModal(false); resetDrag(); }}>Cancel</Button>
            <Button 
              onClick={handleConfirmUnavailability} 
              disabled={setUnavailability.isPending}
            >
              {setUnavailability.isPending ? 'Saving...' : 'Confirm'}
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
            onClick={handleEditUnavailability}
          >
            <Edit className="h-4 w-4" />
            Edit Time
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
            onClick={handleDeleteUnavailability}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {/* Edit Unavailability Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Unavailability</DialogTitle>
            <DialogDescription>Modify your unavailability time slot</DialogDescription>
          </DialogHeader>
          <div className="py-2 text-center">
            <p className="mb-4">Edit unavailability for <b>{selectedDate && format(selectedDate, 'PPP')}</b></p>
            
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
              onClick={handleUpdateUnavailability} 
              disabled={setUnavailability.isPending}
            >
              {setUnavailability.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
