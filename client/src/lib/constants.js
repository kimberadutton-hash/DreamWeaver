import { format, parseISO } from 'date-fns';

export const MOODS = [
  'Peaceful', 'Anxious', 'Joyful', 'Melancholic',
  'Fearful', 'Mysterious', 'Confused', 'Ecstatic',
  'Unsettled', 'Hopeful',
];

export const API_KEY_NAME = 'anthropic_api_key';

// Format a YYYY-MM-DD date string as "Month D, YYYY" (e.g. "March 25, 2026")
export const formatDate = (dateString) =>
  format(parseISO(dateString), 'MMMM d, yyyy');

// Format a YYYY-MM-DD date string as "Weekday, Month D, YYYY" (e.g. "Wednesday, March 25, 2026")
export const formatDateLong = (dateString) =>
  format(parseISO(dateString), 'EEEE, MMMM d, yyyy');

// Return today's date as a YYYY-MM-DD string
export const todayString = () => new Date().toISOString().slice(0, 10);
