import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay, isAfter, isBefore, addHours, parseISO } from 'date-fns';
import type { GroupMember, Busy } from '@/hooks/useGroupMembers';
import type { Group } from '@/hooks/useGroups';

// Add Event type definition
export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  group_id: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface SchedulingSuggestion {
  id: string;
  title: string;
  dateTime: string;
  duration: string;
  participants: string[];
  conflicts: string[];
  confidence: number;
  groupId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface AvailabilityInfo {
  groupName: string;
  groupId: string;
  availableSlots: {
    date: string;
    timeSlots: string[];
    availableMembers: string[];
  }[];
  totalMembers: number;
}

export interface AIResponse {
  type: 'scheduling' | 'availability';
  message: string;
  suggestions?: SchedulingSuggestion[];
  availabilityInfo?: AvailabilityInfo[];
}

export interface SchedulingContext {
  groups: Group[];
  userGroups: Group[];
  currentUser: any;
  events?: Event[]; // Add events to context
}

// Time slot utility functions
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Parse natural language input to extract scheduling intent
export class SchedulingAI {
  private context: SchedulingContext;

  constructor(context: SchedulingContext) {
    this.context = context;
  }

  // Detect if user is asking for availability info vs wanting to schedule
  detectIntent(input: string): 'availability' | 'scheduling' {
    const lowerInput = input.toLowerCase();
    
    // Availability query patterns
    const availabilityKeywords = [
      'when is everyone free',
      'when are people free',
      'show availability',
      'check availability',
      'who is free',
      'what times work',
      'when can we meet',
      'free time',
      'available times',
      'when is',
      'who\'s free',
      'check when'
    ];

    // Scheduling action patterns
    const schedulingKeywords = [
      'schedule',
      'plan',
      'book',
      'set up',
      'arrange',
      'organize',
      'create event',
      'make appointment',
      'let\'s meet'
    ];

    // Check for availability queries first (more specific)
    for (const keyword of availabilityKeywords) {
      if (lowerInput.includes(keyword)) {
        return 'availability';
      }
    }

    // Check for scheduling actions
    for (const keyword of schedulingKeywords) {
      if (lowerInput.includes(keyword)) {
        return 'scheduling';
      }
    }

    // Default: if unclear, treat as availability query to be safer
    return 'availability';
  }

  // Parse user input to extract event details
  parseSchedulingRequest(input: string): {
    eventType: string;
    duration: number; // in minutes
    timePreference?: string;
    datePreference?: string;
    groupHints: string[];
  } {
    const lowerInput = input.toLowerCase();
    
    // Event type detection
    let eventType = 'Meeting';
    if (lowerInput.includes('dinner') || lowerInput.includes('meal') || lowerInput.includes('lunch') || lowerInput.includes('breakfast')) {
      eventType = 'Meal';
    } else if (lowerInput.includes('meeting') || lowerInput.includes('call') || lowerInput.includes('standup')) {
      eventType = 'Meeting';
    } else if (lowerInput.includes('coffee') || lowerInput.includes('drinks') || lowerInput.includes('hangout')) {
      eventType = 'Social';
    } else if (lowerInput.includes('workout') || lowerInput.includes('gym') || lowerInput.includes('exercise')) {
      eventType = 'Workout';
    } else if (lowerInput.includes('book club') || lowerInput.includes('reading')) {
      eventType = 'Book Club';
    }

    // Duration extraction
    let duration = 60; // default 1 hour
    if (lowerInput.includes('30 min') || lowerInput.includes('half hour')) {
      duration = 30;
    } else if (lowerInput.includes('2 hour') || lowerInput.includes('two hour')) {
      duration = 120;
    } else if (lowerInput.includes('3 hour') || lowerInput.includes('three hour')) {
      duration = 180;
    } else if (lowerInput.includes('quick') || lowerInput.includes('brief')) {
      duration = 30;
    } else if (lowerInput.includes('long') || lowerInput.includes('extended')) {
      duration = 120;
    }

    // Time preference detection - explicit user preference first
    let timePreference: string | undefined;
    if (lowerInput.includes('morning')) {
      timePreference = 'morning';
    } else if (lowerInput.includes('afternoon')) {
      timePreference = 'afternoon';
    } else if (lowerInput.includes('evening')) {
      timePreference = 'evening';
    } else if (lowerInput.includes('night')) {
      timePreference = 'night';
    } else {
      // Smart time preference based on event type if no explicit time mentioned
      if (lowerInput.includes('dinner')) {
        timePreference = 'evening';
      } else if (lowerInput.includes('breakfast')) {
        timePreference = 'morning';
      } else if (lowerInput.includes('lunch')) {
        timePreference = 'afternoon';
      } else if (lowerInput.includes('coffee') && !lowerInput.includes('afternoon') && !lowerInput.includes('evening')) {
        timePreference = 'morning';
      } else if (lowerInput.includes('drinks') || lowerInput.includes('bar') || lowerInput.includes('happy hour')) {
        timePreference = 'evening';
      } else if (lowerInput.includes('workout') || lowerInput.includes('gym')) {
        timePreference = 'morning';
      } else if (lowerInput.includes('book club') || lowerInput.includes('reading')) {
        timePreference = 'evening';
      }
    }

    // Date preference detection
    let datePreference: string | undefined;
    if (lowerInput.includes('today')) {
      datePreference = 'today';
    } else if (lowerInput.includes('tomorrow')) {
      datePreference = 'tomorrow';
    } else if (lowerInput.includes('this week')) {
      datePreference = 'this_week';
    } else if (lowerInput.includes('next week')) {
      datePreference = 'next_week';
    } else if (lowerInput.includes('weekend')) {
      datePreference = 'weekend';
    } else if (lowerInput.includes('monday')) {
      datePreference = 'monday';
    } else if (lowerInput.includes('tuesday')) {
      datePreference = 'tuesday';
    } else if (lowerInput.includes('wednesday')) {
      datePreference = 'wednesday';
    } else if (lowerInput.includes('thursday')) {
      datePreference = 'thursday';
    } else if (lowerInput.includes('friday')) {
      datePreference = 'friday';
    }

    // Extract group hints using intelligent matching
    const groupHints = this.extractGroupHintsFromInput(input);

    return {
      eventType,
      duration,
      timePreference,
      datePreference,
      groupHints
    };
  }

  // Find relevant groups based on the request
  async findRelevantGroups(groupHints: string[]): Promise<Group[]> {
    if (groupHints.length === 0) {
      // Return all user's groups if no specific hints
      return this.context.userGroups;
    }

    // Filter groups based on hints (name or description contains the hint)
    const relevantGroups = this.context.userGroups.filter(group => {
      const groupName = group.name.toLowerCase();
      const groupDesc = (group.description || '').toLowerCase();
      
      return groupHints.some(hint => 
        groupName.includes(hint) || groupDesc.includes(hint)
      );
    });

    // If groups match hints, return only those groups (be more specific)
    // Only fall back to all groups if no specific group keywords were mentioned
    if (relevantGroups.length > 0) {
      return relevantGroups;
    }
    
    // If no exact matches but specific group hints were provided, try partial matching
    // This handles cases where group name might be slightly different
    const partialMatches = this.context.userGroups.filter(group => {
      const groupName = group.name.toLowerCase();
      return groupHints.some(hint => {
        // Split hint into words for better matching
        const hintWords = hint.split(' ');
        return hintWords.some(word => groupName.includes(word));
      });
    });
    
    // Only return all groups if no specific group was mentioned and no partial matches
    return partialMatches.length > 0 ? partialMatches : this.context.userGroups.slice(0, 1); // Limit to first group as fallback
  }

  // Get group members for a group
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, role, joined_at')
      .eq('group_id', groupId);
      
    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return [];
    }

    if (!membersData || membersData.length === 0) {
      return [];
    }

    // Get user profiles
    const userIds = membersData.map(member => member.user_id);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create profile map
    const profileMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Combine members with profiles
    return membersData.map(member => ({
      ...member,
      profile: profileMap.get(member.user_id) || null
    })) as GroupMember[];
  }

  // Get unavailability for a specific date range
  async getGroupUnavailability(groupId: string, startDate: Date, endDate: Date): Promise<Busy[]> {
    const { data: availabilityData, error } = await supabase
      .from('busy')
      .select('*')
      .eq('group_id', groupId)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));
      
    if (error) {
      console.error('Error fetching unavailability:', error);
      return [];
    }

    return availabilityData || [];
  }

  // Get events for a specific date range
  async getGroupEvents(groupId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // If events are provided in context, filter them
    if (this.context.events) {
      return this.context.events.filter(event => {
        const eventStartTime = new Date(event.start_time);
        const eventDate = new Date(eventStartTime.getFullYear(), eventStartTime.getMonth(), eventStartTime.getDate());
        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        return event.group_id === groupId && eventDate >= start && eventDate <= end;
      });
    }

    // Fallback to database query
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', groupId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());
      
    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return eventsData || [];
  }

  // Find common availability slots (free time when users are NOT busy)
  findCommonUnavailability(busySlots: Busy[], members: GroupMember[], duration: number, startDate: Date, endDate: Date): {
    date: string;
    startTime: string;
    endTime: string;
    availableMembers: string[];
    conflictingMembers: string[];
  }[] {
    // Group busy slots by date
    const busyByDate = new Map<string, Busy[]>();
    
    busySlots.forEach(busy => {
      const date = busy.date;
      if (!busyByDate.has(date)) {
        busyByDate.set(date, []);
      }
      busyByDate.get(date)!.push(busy);
    });

    const commonSlots: {
      date: string;
      startTime: string;
      endTime: string;
      availableMembers: string[];
      conflictingMembers: string[];
    }[] = [];

    // Generate dates based on provided range instead of hardcoded 14 days
    const allDates: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
      allDates.push(format(d, 'yyyy-MM-dd'));
    }

    // For each date, find free time slots
    for (const date of allDates) {
      const dayBusySlots = busyByDate.get(date) || [];
      
      // Create time slots for the day (every 30 minutes from 6 AM to 11 PM)
      const timeSlots: { time: number; busyUsers: Set<string> }[] = [];
      
      for (let minutes = 6 * 60; minutes <= 23 * 60; minutes += 30) {
        timeSlots.push({
          time: minutes,
          busyUsers: new Set()
        });
      }

      // Mark busy times for each user
      dayBusySlots.forEach(busy => {
        const startMinutes = timeToMinutes(busy.start_time);
        const endMinutes = timeToMinutes(busy.end_time);
        
        timeSlots.forEach(slot => {
          if (slot.time >= startMinutes && slot.time < endMinutes) {
            slot.busyUsers.add(busy.user_id);
          }
        });
      });

      // Find continuous slots where most members are FREE (not busy)
      for (let i = 0; i < timeSlots.length - (duration / 30) + 1; i++) {
        const slotsNeeded = duration / 30;
        let busyUsersInSlot: Set<string> = new Set();
        
        // Check if the required duration fits and collect all busy users
        let canFit = true;
        for (let j = 0; j < slotsNeeded; j++) {
          const slot = timeSlots[i + j];
          if (!slot) {
            canFit = false;
            break;
          }
          
          // Union of busy users across all slots in this duration
          slot.busyUsers.forEach(userId => busyUsersInSlot.add(userId));
        }

        if (canFit) {
          // Calculate how many members are available (not busy)
          const availableCount = members.length - busyUsersInSlot.size;
          
          // Require at least 50% of members to be available
          if (availableCount >= Math.ceil(members.length * 0.5)) {
            const startTime = minutesToTime(timeSlots[i].time);
            const endTime = minutesToTime(timeSlots[i].time + duration);
            
            const availableMembers: string[] = [];
            const conflictingMembers: string[] = [];
            
            members.forEach(member => {
              if (!busyUsersInSlot.has(member.user_id)) {
                // User is NOT busy, so they're available
                availableMembers.push(member.profile?.full_name || member.profile?.email || 'Unknown');
              } else {
                // User is busy, so they have a conflict
                conflictingMembers.push(member.profile?.full_name || member.profile?.email || 'Unknown');
              }
            });

            commonSlots.push({
              date,
              startTime,
              endTime,
              availableMembers,
              conflictingMembers
            });
          }
        }
      }
    }

    return commonSlots;
  }

  // Enhanced conflict detection that includes both busy slots and events
  async findCommonAvailabilityWithEvents(
    busySlots: Busy[], 
    events: any[],
    members: GroupMember[], 
    duration: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    date: string;
    startTime: string;
    endTime: string;
    availableMembers: string[];
    conflictingMembers: string[];
  }[]> {
    // Group busy slots by date
    const busyByDate = new Map<string, Busy[]>();
    
    busySlots.forEach(busy => {
      const date = busy.date;
      if (!busyByDate.has(date)) {
        busyByDate.set(date, []);
      }
      busyByDate.get(date)!.push(busy);
    });

    // Group events by date
    const eventsByDate = new Map<string, any[]>();
    
    events.forEach(event => {
      const eventStartTime = new Date(event.start_time);
      const date = format(eventStartTime, 'yyyy-MM-dd');
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date)!.push(event);
    });

    const commonSlots: {
      date: string;
      startTime: string;
      endTime: string;
      availableMembers: string[];
      conflictingMembers: string[];
    }[] = [];

    // Generate dates based on provided range
    const allDates: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
      allDates.push(format(d, 'yyyy-MM-dd'));
    }

    // For each date, find free time slots considering both busy slots and events
    for (const date of allDates) {
      const dayBusySlots = busyByDate.get(date) || [];
      const dayEvents = eventsByDate.get(date) || [];
      
      // Create time slots for the day (every 30 minutes from 6 AM to 11 PM)
      const timeSlots: { time: number; busyUsers: Set<string> }[] = [];
      
      for (let minutes = 6 * 60; minutes <= 23 * 60; minutes += 30) {
        timeSlots.push({
          time: minutes,
          busyUsers: new Set()
        });
      }

      // Mark busy times for each user from unavailability with 30-minute buffer after busy periods
      dayBusySlots.forEach(busy => {
        const startMinutes = timeToMinutes(busy.start_time);
        const endMinutes = timeToMinutes(busy.end_time);
        
        // Add 30-minute buffer after the busy period ends
        const bufferedEndMinutes = endMinutes + 30;
        
        timeSlots.forEach(slot => {
          if (slot.time >= startMinutes && slot.time < bufferedEndMinutes) {
            slot.busyUsers.add(busy.user_id);
          }
        });
      });

      // Mark busy times for all group members during events (events affect everyone)
      dayEvents.forEach(event => {
        const eventStartTime = new Date(event.start_time);
        const eventEndTime = new Date(event.end_time);
        
        const startMinutes = eventStartTime.getHours() * 60 + eventStartTime.getMinutes();
        const endMinutes = eventEndTime.getHours() * 60 + eventEndTime.getMinutes();
        
        // Add buffer time around events (30 minutes before and after instead of 60)
        const bufferMinutes = 30;
        const bufferedStartMinutes = Math.max(6 * 60, startMinutes - bufferMinutes);
        const bufferedEndMinutes = Math.min(23 * 60, endMinutes + bufferMinutes);
        
        timeSlots.forEach(slot => {
          if (slot.time >= bufferedStartMinutes && slot.time < bufferedEndMinutes) {
            // Mark all group members as busy during event + buffer time
            members.forEach(member => {
              slot.busyUsers.add(member.user_id);
            });
          }
        });
      });

      // Find continuous slots where most members are FREE (not busy)
      for (let i = 0; i < timeSlots.length - (duration / 30) + 1; i++) {
        const slotsNeeded = duration / 30;
        let busyUsersInSlot: Set<string> = new Set();
        
        // Check if the required duration fits and collect all busy users
        let canFit = true;
        for (let j = 0; j < slotsNeeded; j++) {
          const slot = timeSlots[i + j];
          if (!slot) {
            canFit = false;
            break;
          }
          
          // Union of busy users across all slots in this duration
          slot.busyUsers.forEach(userId => busyUsersInSlot.add(userId));
        }

        if (canFit) {
          // Calculate how many members are available (not busy)
          const availableCount = members.length - busyUsersInSlot.size;
          
          // Require at least 50% of members to be available
          if (availableCount >= Math.ceil(members.length * 0.5)) {
            const startTime = minutesToTime(timeSlots[i].time);
            const endTime = minutesToTime(timeSlots[i].time + duration);
            
            const availableMembers: string[] = [];
            const conflictingMembers: string[] = [];
            
            members.forEach(member => {
              if (!busyUsersInSlot.has(member.user_id)) {
                // User is NOT busy, so they're available
                availableMembers.push(member.profile?.full_name || member.profile?.email || 'Unknown');
              } else {
                // User is busy, so they have a conflict
                conflictingMembers.push(member.profile?.full_name || member.profile?.email || 'Unknown');
              }
            });

            commonSlots.push({
              date,
              startTime,
              endTime,
              availableMembers,
              conflictingMembers
            });
          }
        }
      }
    }

    return commonSlots;
  }

  // Generate date range based on preference
  generateDateRange(datePreference?: string): { startDate: Date; endDate: Date } {
    const today = startOfDay(new Date());
    
    switch (datePreference) {
      case 'today':
        return { startDate: today, endDate: today };
      case 'tomorrow':
        const tomorrow = addDays(today, 1);
        return { startDate: tomorrow, endDate: tomorrow };
      case 'this_week':
        // This week means from today until the end of this week (Sunday)
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
        const endOfWeek = addDays(today, daysUntilSunday);
        return { startDate: today, endDate: endOfWeek };
      case 'next_week':
        const currentDayNext = today.getDay();
        const daysUntilNextMonday = currentDayNext === 0 ? 1 : 8 - currentDayNext;
        const nextMonday = addDays(today, daysUntilNextMonday);
        const nextSunday = addDays(nextMonday, 6);
        return { startDate: nextMonday, endDate: nextSunday };
      case 'weekend':
        // Find next weekend (Saturday and Sunday)
        const currentDayWeekend = today.getDay();
        const daysToSaturday = currentDayWeekend === 6 ? 0 : currentDayWeekend === 0 ? 6 : 6 - currentDayWeekend;
        const nextSaturday = addDays(today, daysToSaturday);
        return { startDate: nextSaturday, endDate: addDays(nextSaturday, 1) };
      case 'monday':
      case 'tuesday':
      case 'wednesday':
      case 'thursday':
      case 'friday':
      case 'saturday':
      case 'sunday':
        // Find next occurrence of this day
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(datePreference.toLowerCase());
        const currentDaySpecific = today.getDay();
        const daysToTarget = targetDay <= currentDaySpecific ? 7 - (currentDaySpecific - targetDay) : targetDay - currentDaySpecific;
        const targetDate = addDays(today, daysToTarget);
        return { startDate: targetDate, endDate: targetDate };
      default:
        // Default to next 7 days for availability queries
        return { startDate: today, endDate: addDays(today, 6) };
    }
  }

  // Filter slots by time preference
  filterByTimePreference(slots: any[], timePreference?: string) {
    if (!timePreference) return slots;

    return slots.filter(slot => {
      const startHour = timeToMinutes(slot.startTime) / 60;
      
      switch (timePreference) {
        case 'morning':
          return startHour >= 6 && startHour < 12;
        case 'afternoon':
          return startHour >= 12 && startHour < 17;
        case 'evening':
          return startHour >= 17 && startHour < 21;
        case 'night':
          return startHour >= 21 || startHour < 6;
        default:
          return true;
      }
    });
  }

  // Extract group hints by intelligently matching user input with actual group names
  extractGroupHintsFromInput(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const hints: string[] = [];
    
    // Get actual group names for intelligent matching
    const groupNames = this.context.userGroups.map(group => group.name.toLowerCase());
    
    // Direct group name matching (exact or partial)
    for (const groupName of groupNames) {
      if (lowerInput.includes(groupName)) {
        hints.push(groupName);
      } else {
        // Check if any words in the group name appear in the input
        const groupWords = groupName.split(' ').filter(word => word.length > 2); // Skip short words
        for (const word of groupWords) {
          if (lowerInput.includes(word)) {
            hints.push(groupName);
            break; // Avoid duplicates
          }
        }
      }
    }
    
    // If no direct matches, try common synonyms and keywords
    if (hints.length === 0) {
      const synonymMapping: {[key: string]: string[]} = {
        'family': ['family', 'relatives', 'parents', 'siblings', 'home'],
        'work': ['work', 'team', 'office', 'colleagues', 'business', 'company'],
        'friends': ['friends', 'buddies', 'pals', 'social'],
        'book': ['book', 'reading', 'literature', 'novel'],
        'club': ['club', 'group', 'society', 'meetup'],
        'study': ['study', 'homework', 'learning', 'school', 'education'],
        'fitness': ['fitness', 'gym', 'workout', 'exercise', 'training'],
        'hobby': ['hobby', 'interest', 'passion']
      };
      
      for (const groupName of groupNames) {
        for (const [category, keywords] of Object.entries(synonymMapping)) {
          if (keywords.some(keyword => lowerInput.includes(keyword))) {
            // Check if the group name contains the category word
            if (groupName.includes(category)) {
              hints.push(groupName);
            }
          }
        }
      }
    }
    
    return [...new Set(hints)]; // Remove duplicates
  }

  // Get availability information for groups (without creating event suggestions)
  async getAvailabilityInfo(userInput: string): Promise<AvailabilityInfo[]> {
    try {
      // Parse the user input to extract context
      const request = this.parseSchedulingRequest(userInput);
      console.log('Parsed availability request:', request);

      // Find relevant groups
      const relevantGroups = await this.findRelevantGroups(request.groupHints);
      console.log('Relevant groups for availability:', relevantGroups);

      if (relevantGroups.length === 0) {
        return [];
      }

      const availabilityInfos: AvailabilityInfo[] = [];

      // Generate availability info for each relevant group
      for (const group of relevantGroups.slice(0, 3)) { // Limit to top 3 groups
        const members = await this.getGroupMembers(group.id);
        
        if (members.length === 0) continue;

        // Generate date range
        const { startDate, endDate } = this.generateDateRange(request.datePreference);

        // Get busy slots (unavailability) for the group
        const busySlots = await this.getGroupUnavailability(group.id, startDate, endDate);

        // Get events for the group
        const events = await this.getGroupEvents(group.id, startDate, endDate);

        // Find common free time slots including events consideration
        let commonSlots = await this.findCommonAvailabilityWithEvents(busySlots, events, members, 60, startDate, endDate); // Use 60 minutes as default for availability check

        // Filter by time preference if specified
        if (request.timePreference) {
          commonSlots = this.filterByTimePreference(commonSlots, request.timePreference);
        }

        // Group slots by date
        const slotsByDate = new Map<string, typeof commonSlots>();
        commonSlots.forEach(slot => {
          if (!slotsByDate.has(slot.date)) {
            slotsByDate.set(slot.date, []);
          }
          slotsByDate.get(slot.date)!.push(slot);
        });

        // Convert to availability info format
        const availableSlots = Array.from(slotsByDate.entries()).map(([date, slots]) => {
          // Sort slots by time
          const sortedSlots = slots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          
          let displaySlots: string[];
          
          if (sortedSlots.length === 0) {
            displaySlots = ['No free time available'];
          } else {
            // Simply show individual time slots - no grouping, just the facts
            displaySlots = sortedSlots.map(slot => `${slot.startTime}-${slot.endTime}`);
          }
          
          // Get all members who are available on this date (union of all slots)
          const allAvailableMembers = new Set<string>();
          slots.forEach(slot => {
            slot.availableMembers.forEach(member => allAvailableMembers.add(member));
          });

          return {
            date,
            timeSlots: displaySlots,
            availableMembers: Array.from(allAvailableMembers)
          };
        });

        availabilityInfos.push({
          groupName: group.name,
          groupId: group.id,
          availableSlots: availableSlots.sort((a, b) => a.date.localeCompare(b.date)),
          totalMembers: members.length
        });
      }

      return availabilityInfos;
    } catch (error) {
      console.error('Error getting availability info:', error);
      return [];
    }
  }

  // Main AI response function - handles both scheduling and availability intents
  async processUserRequest(userInput: string): Promise<AIResponse> {
    try {
      const intent = this.detectIntent(userInput);
      console.log('Detected intent:', intent);

      if (intent === 'availability') {
        const availabilityInfo = await this.getAvailabilityInfo(userInput);
        
        if (availabilityInfo.length === 0) {
          return {
            type: 'availability',
            message: "I couldn't find any availability information for your groups. This might be because:\n\n• No groups have been created yet\n• Group members haven't set their availability\n• No groups match your query\n\nTry creating a group and having members set their availability first.",
            availabilityInfo: []
          };
        }

        // Create a helpful summary message for availability
        const totalGroups = availabilityInfo.length;
        const groupsWithAvailability = availabilityInfo.filter(info => info.availableSlots.length > 0).length;
        
        let message = '';
        if (groupsWithAvailability === 0) {
          message = "I found your groups but no common availability for the requested time period. Try a different time frame or check if members have set their availability.";
        } else {
          message = `Here's when everyone is available in ${groupsWithAvailability} group${groupsWithAvailability > 1 ? 's' : ''} (showing only free time slots):`;
        }

        return {
          type: 'availability',
          message,
          availabilityInfo
        };
      } else {
        // Scheduling intent
        const suggestions = await this.findSchedulingSuggestions(userInput);
        
        if (suggestions.length === 0) {
          return {
            type: 'scheduling',
            message: "I couldn't find any suitable times that work for everyone in your groups. This might be because:\n\n• No groups have been created yet\n• Group members haven't set their availability\n• No common time slots are available\n\nTry creating a group and having members set their availability first, or try a different time frame.",
            suggestions: []
          };
        }

        const message = `I found ${suggestions.length} great scheduling option${suggestions.length > 1 ? 's' : ''} for you! Here ${suggestions.length > 1 ? 'are' : 'is'} ${suggestions.length > 1 ? 'my top suggestions' : 'the best time'} based on everyone's availability:`;
        
        return {
          type: 'scheduling',
          message,
          suggestions
        };
      }
    } catch (error) {
      console.error('Error processing user request:', error);
      return {
        type: 'scheduling',
        message: "I'm sorry, I encountered an error while processing your request. Please try again or make sure you have groups set up with availability data.",
        suggestions: []
      };
    }
  }

  // Main scheduling function (kept for backward compatibility)
  async findSchedulingSuggestions(userInput: string): Promise<SchedulingSuggestion[]> {
    try {
      // Declare suggestions array to collect results
      const suggestions: SchedulingSuggestion[] = [];

      // Parse the user input
      const request = this.parseSchedulingRequest(userInput);
      console.log('Parsed request:', request);

      // Find relevant groups
      const relevantGroups = await this.findRelevantGroups(request.groupHints);
      console.log('Relevant groups:', relevantGroups);

      if (relevantGroups.length === 0) {
        return [];
      }

      // Generate suggestions for each relevant group
      for (const group of relevantGroups.slice(0, 3)) { // Limit to top 3 groups
        const members = await this.getGroupMembers(group.id);
        
        if (members.length === 0) continue;

        // Generate date range
        const { startDate, endDate } = this.generateDateRange(request.datePreference);

        // Get busy slots (unavailability) for the group
        const busySlots = await this.getGroupUnavailability(group.id, startDate, endDate);

        // Get events for the group
        const events = await this.getGroupEvents(group.id, startDate, endDate);

        // Find common free time slots considering both busy slots and events
        let commonSlots = await this.findCommonAvailabilityWithEvents(busySlots, events, members, request.duration, startDate, endDate);

        // Filter by time preference
        commonSlots = this.filterByTimePreference(commonSlots, request.timePreference);

        // Filter out slots that are in the past
        const now = new Date();
        commonSlots = commonSlots.filter(slot => {
          const slotStart = new Date(`${slot.date}T${slot.startTime}`);
          return slotStart >= now;
        });

        // Sort by confidence (more available members = higher confidence)
        commonSlots.sort((a, b) => {
          const confidenceA = (a.availableMembers.length / members.length) * 100;
          const confidenceB = (b.availableMembers.length / members.length) * 100;
          return confidenceB - confidenceA;
        });

        // Helper function to check if two time slots have at least 60 minutes gap
        const hasMinimumGap = (slot1: typeof commonSlots[0], slot2: typeof commonSlots[0]): boolean => {
          const slot1Start = new Date(`${slot1.date}T${slot1.startTime}`);
          const slot1End = new Date(`${slot1.date}T${slot1.endTime}`);
          const slot2Start = new Date(`${slot2.date}T${slot2.startTime}`);
          const slot2End = new Date(`${slot2.date}T${slot2.endTime}`);
          
          // Calculate the gap between the end of the earlier slot and start of the later slot
          let earlierEnd: Date, laterStart: Date;
          
          if (slot1Start <= slot2Start) {
            earlierEnd = slot1End;
            laterStart = slot2Start;
          } else {
            earlierEnd = slot2End;
            laterStart = slot1Start;
          }
          
          const gapInMilliseconds = laterStart.getTime() - earlierEnd.getTime();
          const gapInMinutes = gapInMilliseconds / (1000 * 60);
          
          console.log(`Gap check: ${format(earlierEnd, 'HH:mm')} to ${format(laterStart, 'HH:mm')} = ${gapInMinutes} minutes`);
          
          return gapInMinutes >= 60; // Require at least 60 minutes gap
        };

        // Create suggestions from top slots with 60-minute spacing
        const selectedSlots: typeof commonSlots = [];
        
        for (const slot of commonSlots) {
          // Check if this slot has at least 60 minutes gap from all previously selected slots
          const hasConflict = selectedSlots.some(selectedSlot => !hasMinimumGap(slot, selectedSlot));
          
          if (!hasConflict) {
            selectedSlots.push(slot);
            console.log(`Selected slot: ${slot.date} ${slot.startTime}-${slot.endTime}`);
            if (selectedSlots.length >= 2) break; // Limit to 2 suggestions per group
          } else {
            console.log(`Rejected slot due to insufficient gap: ${slot.date} ${slot.startTime}-${slot.endTime}`);
          }
        }

        // Create suggestions from selected slots
        selectedSlots.forEach((slot, index) => {
          const confidence = Math.round((slot.availableMembers.length / members.length) * 100);
          const startDateTime = new Date(`${slot.date}T${slot.startTime}`);
          const endDateTime = new Date(`${slot.date}T${slot.endTime}`);

          suggestions.push({
            id: `${group.id}-${slot.date}-${slot.startTime}-${index}`,
            title: `${request.eventType} - ${group.name}`,
            dateTime: format(startDateTime, 'EEEE, MMMM d, h:mm a'),
            duration: `${request.duration} minutes`,
            participants: slot.availableMembers,
            conflicts: slot.conflictingMembers.length > 0 ? 
              [`${slot.conflictingMembers.length} member(s) unavailable: ${slot.conflictingMembers.slice(0, 2).join(', ')}`] : 
              [],
            confidence,
            groupId: group.id,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString()
          });
        });
      }

      // Sort all suggestions by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);

      return suggestions.slice(0, 5); // Return top 5 suggestions
    } catch (error) {
      console.error('Error finding scheduling suggestions:', error);
      return [];
    }
  }
}
