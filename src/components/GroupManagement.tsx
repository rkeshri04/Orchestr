import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Settings, Calendar } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { useState } from "react";
import { GroupCalendarDialog } from "@/components/GroupCalendarDialog";
import { GroupTeamCalendarScreen } from "@/components/GroupTeamCalendarScreen";
import { useNavigate } from "react-router-dom";

export const GroupManagement = () => {
  const { groups, isLoading, createGroup, isCreating } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showTeamCalendar, setShowTeamCalendar] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Groups</h2>
            <p className="text-gray-600">Manage your scheduling groups</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-4 h-4 rounded-full bg-gray-300" />
                  <div className="w-8 h-8 bg-gray-300 rounded" />
                </div>
                <div className="h-5 bg-gray-300 rounded w-3/4" />
                <div className="h-4 bg-gray-300 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-300 rounded w-16" />
                  <div className="h-6 bg-gray-300 rounded w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (showTeamCalendar && selectedGroup) {
    return (
      <GroupTeamCalendarScreen
        group={selectedGroup}
        onBack={() => { setShowTeamCalendar(false); setSelectedGroup(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Groups</h2>
          <p className="text-gray-600">Manage your scheduling groups</p>
        </div>
        <CreateGroupDialog onCreateGroup={createGroup} isCreating={isCreating} />
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first group to start scheduling events with others.
            </p>
            <CreateGroupDialog onCreateGroup={createGroup} isCreating={isCreating} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/team/${group.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-4 h-4 rounded-full ${group.color}`} />
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                {group.description && (
                  <CardDescription className="text-sm">
                    {group.description}
                  </CardDescription>
                )}
                <CardDescription className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="secondary">Active</Badge>
                  {group.upcoming_events && group.upcoming_events > 0 ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {group.upcoming_events} upcoming
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      No events
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selectedGroup && (
        <GroupCalendarDialog
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
          group={selectedGroup}
        />
      )}
    </div>
  );
};
