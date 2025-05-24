
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Users, 
  Plus, 
  Settings, 
  Clock, 
  Sparkles,
  MessageSquare,
  ChevronRight,
  Bell
} from "lucide-react";
import { AISchedulingChat } from "@/components/AISchedulingChat";
import { GroupManagement } from "@/components/GroupManagement";

const Dashboard = () => {
  const [activeView, setActiveView] = useState<'overview' | 'chat' | 'groups'>('overview');

  const recentActivities = [
    {
      id: 1,
      type: "scheduled",
      title: "Family Dinner",
      time: "Tomorrow, 7:00 PM",
      group: "Family",
      participants: 4
    },
    {
      id: 2,
      type: "suggested",
      title: "Book Club Meeting",
      time: "Friday, 2:00 PM",
      group: "Book Club",
      participants: 6
    },
    {
      id: 3,
      type: "reminder",
      title: "Team Standup",
      time: "Today, 10:00 AM",
      group: "Work Team",
      participants: 5
    }
  ];

  const upcomingEvents = [
    { title: "Family Dinner", time: "Today, 7:00 PM", group: "Family" },
    { title: "Coffee with Sarah", time: "Tomorrow, 2:00 PM", group: "Friends" },
    { title: "Project Review", time: "Wednesday, 10:00 AM", group: "Work Team" }
  ];

  const groups = [
    { name: "Family", members: 4, color: "bg-blue-500" },
    { name: "Book Club", members: 6, color: "bg-green-500" },
    { name: "Work Team", members: 5, color: "bg-purple-500" },
    { name: "Friends", members: 8, color: "bg-orange-500" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">IntelliSchedule</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={activeView === 'overview' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveView('overview')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Overview
                </Button>
                <Button
                  variant={activeView === 'chat' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveView('chat')}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Scheduling
                </Button>
                <Button
                  variant={activeView === 'groups' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveView('groups')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Groups
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Ask AI to Schedule
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeView === 'overview' && (
              <div className="space-y-6">
                {/* Welcome Message */}
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-2">Welcome back, John!</h2>
                    <p className="text-blue-100">
                      You have 3 upcoming events and 2 scheduling suggestions waiting for you.
                    </p>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Active Groups</p>
                          <p className="text-2xl font-bold">{groups.length}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">This Week</p>
                          <p className="text-2xl font-bold">12</p>
                        </div>
                        <Calendar className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Time Saved</p>
                          <p className="text-2xl font-bold">4.5h</p>
                        </div>
                        <Clock className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity & Upcoming Events */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Your latest scheduling activities</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-gray-600">{activity.time}</p>
                            <Badge variant="secondary" className="mt-1">
                              {activity.group}
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Events</CardTitle>
                      <CardDescription>Your next scheduled activities</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {upcomingEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-gray-600">{event.time}</p>
                            <Badge variant="outline" className="mt-1">
                              {event.group}
                            </Badge>
                          </div>
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Groups Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Groups</CardTitle>
                    <CardDescription>Manage your scheduling groups</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {groups.map((group, index) => (
                        <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${group.color}`}></div>
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-sm text-gray-600">{group.members} members</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === 'chat' && <AISchedulingChat />}
            {activeView === 'groups' && <GroupManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
