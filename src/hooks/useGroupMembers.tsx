import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface Busy {
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
      
      console.log('Fetching group members for group:', groupId);
      
      // First get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, role, joined_at')
        .eq('group_id', groupId);
        
      if (membersError) {
        console.error('Error fetching group members:', membersError);
        throw membersError;
      }
      
      console.log('Raw group members data:', membersData);
      
      if (!membersData || membersData.length === 0) {
        console.log('No group members found');
        return [];
      }
      
      // Get user IDs to fetch profiles
      const userIds = membersData.map(member => member.user_id);
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles for members:', profilesError);
        // Don't throw error, continue without profile data
      }
      
      console.log('Profiles data:', profilesData);
      
      // Create a map of user_id to profile
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
      }
      
      // Combine members with their profiles
      const membersWithProfiles = membersData.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id) || null
      }));
      
      console.log('Final members with profiles:', membersWithProfiles);
      
      return membersWithProfiles as GroupMember[];
    },
  });
}

export function useMemberUnavailability(groupId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['unavailability', groupId, date],
    enabled: !!groupId && !!date,
    queryFn: async () => {
      if (!groupId || !date) return [];
      console.log('Fetching unavailability for group:', groupId, 'date:', date);
      
      // First, get unavailability data without the problematic join
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('busy')
        .select('*')
        .eq('group_id', groupId)
        .eq('date', date);
        
      if (availabilityError) {
        console.error('Error fetching unavailability:', availabilityError);
        throw availabilityError;
      }
      
      console.log('Fetched unavailability data:', availabilityData);
      
      if (!availabilityData || availabilityData.length === 0) {
        return [];
      }
      
      // Get unique user IDs from unavailability data
      const userIds = [...new Set(availabilityData.map(item => item.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Don't throw error here, just continue without profile data
      }
      
      // Create a map of user_id to profile
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
      }
      
      // Convert time format and add profile data
      const convertedData = availabilityData.map(item => ({
        ...item,
        start_time: convertTimeToHHMM(item.start_time),
        end_time: convertTimeToHHMM(item.end_time),
        profiles: profileMap.get(item.user_id) || null
      }));
      
      return convertedData as Busy[];
    },
  });
}

// Helper function to convert time format
function convertTimeToHHMM(timeStr: string): string {
  if (!timeStr) return '00:00';
  
  // Handle both formats: "HH:mm:ss AM/PM" and "HH:mm"
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [timePart, period] = timeStr.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    
    let convertedHours = hours;
    if (period === 'PM' && hours !== 12) {
      convertedHours = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      convertedHours = 0;
    }
    
    return `${convertedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Already in HH:mm or HH:mm:ss format
  const [hours, minutes] = timeStr.split(':');
  return `${hours}:${minutes || '00'}`;
}

export function useSetUnavailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: Omit<Busy, 'id'> | Omit<Busy, 'id'>[]) => {
      console.log('Setting unavailability:', payload);
      
      const newUnavailability = Array.isArray(payload) ? payload[0] : payload;
      const { group_id, user_id, date, start_time, end_time } = newUnavailability;
      
      // First, get existing unavailability for the same user on the same date
      const { data: existingData, error: fetchError } = await supabase
        .from('busy')
        .select('*')
        .eq('group_id', group_id)
        .eq('user_id', user_id)
        .eq('date', date);
        
      if (fetchError) {
        console.error('Error fetching existing unavailability:', fetchError);
        throw fetchError;
      }
      
      console.log('Existing unavailability:', existingData);
      
      // Helper function to convert time to minutes for easier comparison
      const timeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      // Helper function to convert minutes back to time string
      const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };
      
      const newStart = timeToMinutes(start_time);
      const newEnd = timeToMinutes(end_time);
      
      // Process existing unavailability to handle overlaps
      const updatedSlots: Array<{id?: string, start: number, end: number}> = [];
      const slotsToDelete: string[] = [];
      
      if (existingData && existingData.length > 0) {
        for (const existing of existingData) {
          const existingStart = timeToMinutes(convertTimeToHHMM(existing.start_time));
          const existingEnd = timeToMinutes(convertTimeToHHMM(existing.end_time));
          
          // Check for overlap
          if (newEnd <= existingStart || newStart >= existingEnd) {
            // No overlap, keep the existing slot as is
            updatedSlots.push({ id: existing.id, start: existingStart, end: existingEnd });
          } else {
            // There is overlap, mark for deletion and create new non-overlapping parts
            slotsToDelete.push(existing.id);
            
            // Keep the part before the new slot (if any)
            if (existingStart < newStart) {
              updatedSlots.push({ start: existingStart, end: newStart });
            }
            
            // Keep the part after the new slot (if any)
            if (existingEnd > newEnd) {
              updatedSlots.push({ start: newEnd, end: existingEnd });
            }
          }
        }
      }
      
      // Delete overlapping slots
      if (slotsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('busy')
          .delete()
          .in('id', slotsToDelete);
          
        if (deleteError) {
          console.error('Error deleting overlapping unavailability:', deleteError);
          throw deleteError;
        }
      }
      
      // Insert modified existing slots (without IDs, so they get new IDs)
      const slotsToInsert = updatedSlots
        .filter(slot => !slot.id) // Only slots without IDs (new ones from splitting)
        .map(slot => ({
          group_id,
          user_id,
          date,
          start_time: minutesToTime(slot.start),
          end_time: minutesToTime(slot.end)
        }));
      
      // Add the new unavailability slot
      slotsToInsert.push({
        group_id,
        user_id,
        date,
        start_time,
        end_time
      });
      
      console.log('Inserting unavailability slots:', slotsToInsert);
      
      // Insert all new slots
      const { data, error } = await supabase
        .from('busy')
        .insert(slotsToInsert)
        .select();
        
      if (error) {
        console.error('Error setting unavailability:', error);
        throw error;
      }
      
      return data as Busy[];
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch unavailability data
      const groupId = Array.isArray(variables) ? variables[0]?.group_id : variables.group_id;
      const date = Array.isArray(variables) ? variables[0]?.date : variables.date;
      
      queryClient.invalidateQueries({ 
        queryKey: ['unavailability', groupId, date] 
      });
      
      toast.success('Unavailability updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating unavailability:', error);
      toast.error('Failed to update unavailability');
    }
  });
}

export function useDeleteUnavailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await supabase
        .from('busy')
        .delete()
        .eq('id', availabilityId);
        
      if (error) {
        console.error('Error deleting unavailability:', error);
        throw error;
      }
      
      return availabilityId;
    },
    onSuccess: () => {
      // Invalidate all unavailability queries
      queryClient.invalidateQueries({ 
        queryKey: ['unavailability'] 
      });
      
      toast.success('Unavailability deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting unavailability:', error);
      toast.error('Failed to delete unavailability');
    }
  });
}
