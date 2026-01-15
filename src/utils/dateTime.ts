/**
 * DateTime utility functions to handle server time to local time conversions
 */

/**
 * Convert server UTC time to local time
 */
export const toLocalTime = (serverTime: string | Date): Date => {
  if (!serverTime) return new Date();
  return new Date(serverTime);
};

/**
 * Format date to local date string
 */
export const formatLocalDate = (serverTime: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const localDate = toLocalTime(serverTime);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return localDate.toLocaleDateString(undefined, defaultOptions);
};

/**
 * Format date to local date and time string
 */
export const formatLocalDateTime = (serverTime: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const localDate = toLocalTime(serverTime);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return localDate.toLocaleString(undefined, defaultOptions);
};

/**
 * Format date to local time string only
 */
export const formatLocalTime = (serverTime: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const localDate = toLocalTime(serverTime);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options
  };

  return localDate.toLocaleTimeString(undefined, defaultOptions);
};

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 */
export const getRelativeTime = (serverTime: string | Date): string => {
  const localDate = toLocalTime(serverTime);
  const now = new Date();
  const diffMs = now.getTime() - localDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  }
};

/**
 * Format date range
 */
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  const start = formatLocalDate(startDate, { month: 'short', day: 'numeric' });
  const end = formatLocalDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
};

/**
 * Check if date is today
 */
export const isToday = (serverTime: string | Date): boolean => {
  const localDate = toLocalTime(serverTime);
  const today = new Date();
  return localDate.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (serverTime: string | Date): boolean => {
  const localDate = toLocalTime(serverTime);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return localDate.toDateString() === yesterday.toDateString();
};

/**
 * Format date with smart formatting (Today, Yesterday, or date)
 */
export const formatSmartDate = (serverTime: string | Date): string => {
  if (isToday(serverTime)) {
    return `Today at ${formatLocalTime(serverTime, { hour: '2-digit', minute: '2-digit' })}`;
  } else if (isYesterday(serverTime)) {
    return `Yesterday at ${formatLocalTime(serverTime, { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return formatLocalDateTime(serverTime);
  }
};

/**
 * Convert local time to UTC for server submission
 */
export const toServerTime = (localTime: Date): string => {
  return localTime.toISOString();
};

/**
 * Parse date safely
 */
export const parseDate = (dateString: string | Date | null | undefined): Date | null => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
};
