import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
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
  Shield,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useGroupInvites } from '@/hooks/useGroupInvites';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { deleteGroup, isDeleting } = useGroups();
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [searchEmail, setSearchEmail] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMobileDeleteConfirm, setShowMobileDeleteConfirm] = useState(false);

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

  const handleDeleteGroup = async () => {
    if (!isOwner) {
      toast.error('Only the group owner can delete the group');
      return;
    }

    try {
      await deleteGroup(group.id);
      onOpenChange(false);
      setShowDeleteConfirm(false);
      setShowMobileDeleteConfirm(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const filteredSearchResults = searchResults.filter(profile => 
    !members.some(member => member.user_id === profile.id)
  );

  const SettingsContent = () => (
    <div className="space-y-6">
      {/* Invite Users Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h3 className="font-semibold">Invite Users</h3>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search-email">Search by email</Label>
          <div className="relative ml-2">
            <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search-email"
              autoFocus={true}
              type="email"
              placeholder="Enter email to search for users"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchEmail.length > 2 && (
          <div className="space-y-2">
            <Label>Search Results</Label>
            <Card className="w-full">
              <CardContent className="p-3 sm:p-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredSearchResults.length > 0 ? (
                  <ScrollArea className="h-32 sm:h-40">
                    <div className="space-y-2">
                      {filteredSearchResults.map((profile) => (
                        <div 
                          key={profile.id} 
                          className="flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50 gap-2"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {profile.full_name || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleInviteUser(profile)}
                            disabled={isInviting}
                            className="shrink-0 text-xs px-2 py-1"
                          >
                            <UserPlus className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Invite</span>
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

      {/* Current Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Current Members</h3>
            <Badge variant="secondary">{members.length}</Badge>
          </div>
        </div>

        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div 
                className="overflow-hidden"
                style={{ 
                  height: members.length === 1 ? 'auto' : 
                         members.length <= 3 ? `${members.length * 80}px` : 
                         '240px'
                }}
              >
                <ScrollArea className="h-full">
                  <div className="space-y-2 sm:space-y-3 pr-3">
                    {members.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-gray-50 gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.profile?.full_name?.charAt(0) || 
                               member.profile?.email?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {member.profile?.full_name || 'Unknown User'}
                              </p>
                              {member.user_id === group.owner_id && (
                                <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {member.profile?.email}
                            </p>
                            {member.joined_at && (
                              <p className="text-xs text-gray-400 hidden sm:block">
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          {member.user_id === group.owner_id ? (
                            <Badge variant="default" className="text-xs px-1 sm:px-2">
                              <Crown className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Owner</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-1 sm:px-2">
                              <span className="hidden sm:inline">Member</span>
                              <span className="sm:hidden">M</span>
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
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone - Delete Group */}
      {isOwner && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-red-700">Danger Zone</h3>
            </div>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div>
                    <h4 className="font-medium text-red-800 text-sm sm:text-base">Delete this group</h4>
                    <p className="text-xs sm:text-sm text-red-600 mt-1">
                      Once you delete a group, there is no going back. All members, events, and availability data will be permanently deleted.
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={() => isMobile ? setShowMobileDeleteConfirm(true) : setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="w-full sm:w-auto self-start"
                    size="sm"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Group
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );

  const DeleteConfirmationContent = () => (
    <div className="space-y-6 p-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-800">
            Delete "{group.name}"?
          </h3>
          <p className="text-sm text-red-600">
            This action cannot be undone. This will permanently delete the group,
            remove all members, and delete all associated events and availability data.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button 
          variant="destructive" 
          onClick={handleDeleteGroup}
          disabled={isDeleting}
          className="w-full"
        >
          {isDeleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Yes, Delete Group
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setShowMobileDeleteConfirm(false)}
          className="w-full"
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  // Mobile drawer for phones, desktop dialog for larger screens
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent 
          className="h-[50vh] max-h-[50vh] flex flex-col"
          onInteractOutside={(e) => {
            // Prevent closing when interacting with virtual keyboard
            const target = e.target as Element;
            if (target?.closest('input') || target?.closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
        >
          <DrawerHeader className="text-left pb-2 shrink-0 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (showMobileDeleteConfirm) {
                  setShowMobileDeleteConfirm(false);
                } else {
                  onOpenChange(false);
                }
              }}
              className="absolute top-2 right-2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <DrawerTitle className="flex items-center gap-2 text-base pr-8">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${group.color}`} />
              {showMobileDeleteConfirm ? 'Delete Group' : `${group.name} Settings`}
            </DrawerTitle>
            <DrawerDescription className="text-sm">
              {showMobileDeleteConfirm 
                ? 'Confirm group deletion' 
                : 'Manage your group members and invite new people to join.'
              }
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0">
            {showMobileDeleteConfirm ? (
              <DeleteConfirmationContent />
            ) : (
              <div className="px-4 pb-4 h-full">
                <ScrollArea className="h-full">
                  <div className="pr-3">
                    <SettingsContent />
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop dialog
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${group.color}`} />
              {group.name} Settings
            </DialogTitle>
            <DialogDescription>
              Manage your group members and invite new people to join.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <SettingsContent />
          </div>
          <div className="shrink-0 flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="mx-4 max-w-sm sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete "{group.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the group,
              remove all members, and delete all associated events and availability data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete Group'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
