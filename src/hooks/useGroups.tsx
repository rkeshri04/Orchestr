
import { useState, useEffect } from 'react';
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
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(count),
          events(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(group => ({
        ...group,
        member_count: group.group_members?.[0]?.count || 0,
        upcoming_events: group.events?.filter(event => 
          new Date(event.start_time) > new Date()
        ).length || 0
      }));
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

  return {
    groups,
    isLoading,
    error,
    createGroup: createGroupMutation.mutate,
    isCreating: createGroupMutation.isPending
  };
};
