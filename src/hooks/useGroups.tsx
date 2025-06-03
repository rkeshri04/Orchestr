import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
  upcoming_events?: number;
}

export const useGroups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get groups with member counts
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members(count)
        `)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Then get event counts for each group
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count: eventCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .gte('start_time', new Date().toISOString());

          return {
            ...group,
            member_count: group.group_members?.[0]?.count || 0,
            upcoming_events: eventCount || 0
          };
        })
      );

      return groupsWithCounts;
    },
    enabled: !!user
  });

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description?: string; color?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          color: groupData.color || 'bg-blue-500',
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created successfully!');
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('User not authenticated');

      // First check if user is the owner
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      if (group.owner_id !== user.id) {
        throw new Error('Only the group owner can delete the group');
      }

      // Delete related data first (cascade should handle this, but being explicit)
      await supabase.from('group_members').delete().eq('group_id', groupId);
      await supabase.from('busy').delete().eq('group_id', groupId);
      await supabase.from('events').delete().eq('group_id', groupId);
      await supabase.from('group_invite_links').delete().eq('group_id', groupId);

      // Finally delete the group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('owner_id', user.id);

      if (error) throw error;
      return groupId;
    },
    onSuccess: (deletedGroupId) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      // Clean up any cached data for this group
      queryClient.removeQueries({ queryKey: ['group-members', deletedGroupId] });
      queryClient.removeQueries({ queryKey: ['events', deletedGroupId] });
      queryClient.removeQueries({ queryKey: ['unavailability', deletedGroupId] });
      queryClient.removeQueries({ queryKey: ['invite-link', deletedGroupId] });
      toast.success('Group deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  });

  return {
    groups,
    isLoading,
    error,
    createGroup: createGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
    isCreating: createGroupMutation.isPending,
    isDeleting: deleteGroupMutation.isPending
  };
};
