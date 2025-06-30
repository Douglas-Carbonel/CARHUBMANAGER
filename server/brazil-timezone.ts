
// Utility functions for handling Brazil timezone consistently
export class BrazilTimezone {
  static readonly TIMEZONE = 'America/Sao_Paulo';
  
  // Get current date in Brazil timezone as YYYY-MM-DD string
  static getCurrentDate(): string {
    const now = new Date();
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    }).format(now);
  }
  
  // Get current time in Brazil timezone as HH:MM:SS string
  static getCurrentTime(): string {
    const now = new Date();
    return new Intl.DateTimeFormat('en-GB', { 
      timeZone: this.TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);
  }
  
  // Get current datetime in Brazil timezone as Date object
  static getCurrentDateTime(): Date {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: this.TIMEZONE }));
  }
  
  // Parse a date string as if it's in Brazil timezone
  static parseDateTime(dateStr: string, timeStr: string): Date {
    // Add Brazil timezone offset to force correct interpretation
    return new Date(`${dateStr}T${timeStr}-03:00`);
  }
  
  // Format a date to Brazil timezone string
  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    }).format(date);
  }
  
  // Get week start (Monday) for current week in Brazil timezone
  static getWeekStart(): string {
    const brazilToday = this.getCurrentDateTime();
    const currentDay = brazilToday.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date(brazilToday);
    weekStart.setDate(brazilToday.getDate() - daysFromMonday);
    
    return this.formatDate(weekStart);
  }
}
