
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Settings } from "lucide-react";

export const GroupManagement = () => {
  const [groups] = useState([
    { id: 1, name: "Family", members: 4, color: "bg-blue-500" },
    { id: 2, name: "Book Club", members: 8, color: "bg-purple-500" },
    { id: 3, name: "Work Team", members: 6, color: "bg-green-500" }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Groups</h2>
          <p className="text-gray-600">Manage your scheduling groups</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`w-4 h-4 rounded-full ${group.color}`} />
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <CardDescription className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {group.members} members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary">Active</Badge>
                <Badge variant="outline">2 upcoming</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
