import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string | null;
  joined_at: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface Availability {
  id: string;
  group_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('id,group_id,user_id,role,joined_at, profiles:profiles(full_name,email,avatar_url)')
        .eq('group_id', groupId);
      if (error) throw error;
      return (data || []).map((m: any) => ({ ...m, profile: m.profiles })) as GroupMember[];
    },
  });
}

export function useMemberAvailability(groupId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['availability', groupId, date],
    enabled: !!groupId && !!date,
    queryFn: async () => {
      if (!groupId || !date) return [];
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('group_id', groupId)
        .eq('date', date);
      if (error) throw error;
      return (data || []) as Availability[];
    },
  });
}

export function useSetAvailability() {
  return useMutation({
    mutationFn: async (payload: Omit<Availability, 'id'> | Omit<Availability, 'id'>[]) => {
      const { data, error } = await supabase
        .from('availability')
        .upsert(payload, { onConflict: 'group_id,user_id,date,start_time,end_time' })
        .select();
      if (error) throw error;
      return data as Availability[];
    },
  });
}
