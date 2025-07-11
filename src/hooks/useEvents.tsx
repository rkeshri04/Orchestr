import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  group_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventData: {
      title: string;
      description?: string;
      start_time: string;
      end_time: string;
      group_id: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          group_id: eventData.group_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }

      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully!');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  });
}

export function useEvents(groupId?: string) {
  return useQuery({
    queryKey: ['events', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('group_id', groupId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return data as Event[];
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventData: {
      id: string;
      title: string;
      description?: string;
      start_time: string;
      end_time: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .update({
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
        })
        .eq('id', eventData.id)
        .eq('created_by', user.id) // Only allow updating own events
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('created_by', user.id); // Only allow deleting own events

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  });
}
