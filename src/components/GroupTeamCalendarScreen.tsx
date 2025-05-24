import { useState } from "react";
import { Calendar as LucideCalendar, Users, ArrowLeft, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGroupMembers, useMemberAvailability } from '@/hooks/useGroupMembers';
import { GroupCalendarDialog } from "@/components/GroupCalendarDialog";
import { format } from 'date-fns';

// Helper: assign a color to each user
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

export const GroupTeamCalendarScreen = ({ group, onBack }: { group: any, onBack: () => void }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDialog, setShowDialog] = useState(false);
  const { data: members = [] } = useGroupMembers(group?.id);
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const { data: availabilities = [] } = useMemberAvailability(group?.id, selectedDateStr);

  // Assign a color to each user
  const memberColorMap = Object.fromEntries(
    members.map((m, i) => [m.user_id, userColors[i % userColors.length]])
  );

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <div className="flex items-center gap-2 p-4 border-b bg-white/80">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft /></Button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LucideCalendar className="h-6 w-6 text-blue-500" />
          {group.name} Team Calendar
        </h2>
        <div className="flex-1" />
        <Button size="sm" className="ml-2" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Set My Availability
        </Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="w-full max-w-5xl h-full flex flex-col md:flex-row gap-8 items-stretch">
            {/* Calendar for all days, takes most of the space */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-lg border shadow w-full h-full min-h-[500px]"
                modifiers={{
                  hasAvailability: (date) => {
                    const d = format(date, 'yyyy-MM-dd');
                    return availabilities.some(a => a.date === d);
                  }
                }}
                modifiersClassNames={{
                  hasAvailability: "ring-2 ring-blue-400"
                }}
              />
            </div>
            {/* Day view: show all time frames for selected day */}
            <div className="flex-1 min-w-[320px] flex flex-col items-center justify-center">
              {selectedDate ? (
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      {format(selectedDate, 'PPP')}
                    </h3>
                  </div>
                  <div className="relative h-96 border rounded-lg bg-gray-50 overflow-hidden">
                    {/* 24h grid */}
                    <div className="absolute left-0 top-0 w-full h-full grid grid-rows-24 border-r">
                      {[...Array(24)].map((_, h) => (
                        <div key={h} className="border-b border-dashed border-gray-200 text-xs text-gray-400 pl-2 flex items-center h-4">
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
                        const top = (start / 24) * 100;
                        const height = ((end - start) / 24) * 100;
                        return (
                          <div
                            key={i}
                            className={`absolute left-[${idx*8}px] w-[90%] ${color} border rounded-md flex items-center px-2 py-1 text-xs`}
                            style={{ top: `${top}%`, height: `${height}%`, zIndex: 10 + idx, opacity: 0.85 }}
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
              ) : (
                <div className="text-gray-500 text-center mt-16">Select a day to view team availability.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Dialog for setting your own availability */}
      <GroupCalendarDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        group={group}
      />
    </div>
  );
};
