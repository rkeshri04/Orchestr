import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  UserPlus, 
  Link2, 
  Copy, 
  Check, 
  X, 
  Mail, 
  Users,
  Crown,
  Calendar,
  Shield
} from 'lucide-react';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useGroupInvites } from '@/hooks/useGroupInvites';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    id: string;
    name: string;
    description?: string;
    color: string;
    owner_id: string;
  };
}

export const GroupSettingsDialog = ({ open, onOpenChange, group }: GroupSettingsDialogProps) => {
  const { user } = useAuth();
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(group.id);
  const { 
    searchProfiles, 
    inviteUser, 
    generateInviteLink, 
    removeUser,
    inviteLink,
    searchResults,
    isSearching,
    isInviting,
    isGeneratingLink,
    isRemovingUser
  } = useGroupInvites(group.id);

  const [searchEmail, setSearchEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);

  const isOwner = user?.id === group.owner_id;

  // Search for users when email changes
  useEffect(() => {
    if (searchEmail.length > 2) {
      const timeoutId = setTimeout(() => {
        searchProfiles(searchEmail);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchEmail, searchProfiles]);

  const handleInviteUser = async (profile: Profile) => {
    try {
      await inviteUser(profile.id);
      toast.success(`Invited ${profile.full_name || profile.email} to the group`);
      setSelectedUsers(prev => prev.filter(u => u.id !== profile.id));
      setSearchEmail('');
    } catch (error) {
      toast.error('Failed to invite user');
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!isOwner) {
      toast.error('Only the group owner can remove members');
      return;
    }

    try {
      await removeUser(userId);
      toast.success(`Removed ${userName} from the group`);
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  const handleGenerateLink = async () => {
    try {
      await generateInviteLink();
      toast.success('Invite link generated successfully');
    } catch (error) {
      toast.error('Failed to generate invite link');
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const filteredSearchResults = searchResults.filter(profile => 
    !members.some(member => member.user_id === profile.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${group.color}`} />
            {group.name} Settings
          </DialogTitle>
          <DialogDescription>
            Manage your group members and invite new people to join.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Invite Users Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <h3 className="font-semibold">Invite Users</h3>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search-email">Search by email</Label>
              <div className="relative m-5">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search-email"
                  type="email"
                  placeholder="Enter email to search for users"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {searchEmail.length > 2 && (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <Card className="max-h-48">
                  <CardContent className="p-4">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    ) : filteredSearchResults.length > 0 ? (
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {filteredSearchResults.map((profile) => (
                            <div 
                              key={profile.id} 
                              className="flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={profile.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {profile.full_name || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-gray-500">{profile.email}</p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleInviteUser(profile)}
                                disabled={isInviting}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Invite
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : searchEmail.length > 2 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No users found with that email
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <Separator />

          {/* Shareable Link Section */}
          {/* <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              <h3 className="font-semibold">Shareable Invite Link</h3>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Generate a link that automatically adds new users to your group when they sign up.
              </p>
              
              {inviteLink ? (
                <div className="flex gap-2">
                  <Input 
                    value={inviteLink} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleGenerateLink} 
                  disabled={isGeneratingLink}
                  variant="outline"
                >
                  {isGeneratingLink ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Generate Invite Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </div> */}

          {/* <Separator /> */}

          {/* Current Members Section */}
          <div className="space-y-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="font-semibold">Current Members</h3>
                <Badge variant="secondary">{members.length}</Badge>
              </div>
            </div>

            <Card className="flex-1 min-h-0">
              <CardContent className="p-4 h-full">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {member.profile?.full_name?.charAt(0) || 
                                 member.profile?.email?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {member.profile?.full_name || 'Unknown User'}
                                </p>
                                {member.user_id === group.owner_id && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {member.profile?.email}
                              </p>
                              {member.joined_at && (
                                <p className="text-xs text-gray-400">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {member.user_id === group.owner_id ? (
                              <Badge variant="default" className="text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                Owner
                              </Badge>
                            ) : member.role ? (
                              <Badge variant="secondary" className="text-xs">
                                Member
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Member
                              </Badge>
                            )}
                            
                            {isOwner && member.user_id !== group.owner_id && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveUser(
                                  member.user_id, 
                                  member.profile?.full_name || member.profile?.email || 'User'
                                )}
                                disabled={isRemovingUser}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
