import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface InviteLink {
  id: string;
  group_id: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function useGroupInvites(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get existing invite link for the group
  const { data: inviteLink } = useQuery({
    queryKey: ['invite-link', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_invite_links')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        // Return the full URL for the invite link
        return `${window.location.origin}/join/${data.invite_code}`;
      }
      
      return null;
    },
  });

  // Search profiles by email
  const searchProfiles = useCallback(async (email: string) => {
    if (!email || email.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .ilike('email', `%${email}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching profiles:', error);
      setSearchResults([]);
      toast.error('Failed to search for users');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Invite user to group
  const inviteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this group');
      }

      // Add user to group
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });

  // Generate invite link
  const generateInviteLinkMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Generate a unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);

      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Deactivate any existing invite links for this group
      await supabase
        .from('group_invite_links')
        .update({ is_active: false })
        .eq('group_id', groupId);

      // Create new invite link
      const { data, error } = await supabase
        .from('group_invite_links')
        .insert({
          group_id: groupId,
          invite_code: inviteCode,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return `${window.location.origin}/join/${inviteCode}`;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-link', groupId] });
    },
  });

  // Remove user from group
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Check if current user is the group owner
      const { data: group } = await supabase
        .from('groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (!group || group.owner_id !== user.id) {
        throw new Error('Only group owners can remove members');
      }

      // Remove user from group
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });

  return {
    searchProfiles,
    inviteUser: inviteUserMutation.mutate,
    generateInviteLink: generateInviteLinkMutation.mutate,
    removeUser: removeUserMutation.mutate,
    inviteLink,
    searchResults,
    isSearching,
    isInviting: inviteUserMutation.isPending,
    isGeneratingLink: generateInviteLinkMutation.isPending,
    isRemovingUser: removeUserMutation.isPending,
  };
}
