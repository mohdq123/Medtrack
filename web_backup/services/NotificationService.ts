
import { Patient, AdminMessage } from '../types';
import { BackendService } from './BackendService';
import { isAfter, subDays, startOfDay, setHours, setMinutes, isBefore, format, isSameDay } from 'date-fns';

export const NotificationService = {
  requestPermission: async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  checkAndTriggerReminders: async (
    patients: Patient[], 
    onTrigger: (msg: AdminMessage) => void
  ) => {
    const now = new Date();
    const sentIds = await BackendService.getSentNotifications();

    for (const patient of patients) {
      if (patient.isCompleted || patient.isCancelled) continue;

      const appointmentDate = new Date(patient.appointmentDate);
      
      // --- 2 Days Before Reminder ---
      const targetDayRemind = subDays(startOfDay(appointmentDate), 2);
      const triggerTimeRemind = setMinutes(setHours(targetDayRemind, 12), 0);
      const remindId = `rem-2d-${patient.id}`;

      if (!sentIds.includes(remindId) && isAfter(now, triggerTimeRemind) && isBefore(now, appointmentDate)) {
        const surgeryDayName = format(appointmentDate, 'EEEE');
        const body = `Call the patients for ${surgeryDayName}'s list (${patient.name})`;

        if (Notification.permission === 'granted') {
          new Notification('Theater Coordination', { body, icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png' });
        }

        onTrigger({
          id: `${remindId}-${Date.now()}`,
          type: 'text',
          content: body,
          timestamp: new Date(),
          sender: 'System Scheduler'
        });
        await BackendService.markNotificationSent(remindId);
      }

      // --- Day of Operation 8 PM Completion Check ---
      const checkTime = setMinutes(setHours(startOfDay(appointmentDate), 20), 0); // 8:00 PM
      const checkId = `check-8pm-${patient.id}`;

      if (!sentIds.includes(checkId) && isAfter(now, checkTime)) {
        const body = `Who did the operation and who didn't? Check patient: ${patient.name}`;

        if (Notification.permission === 'granted') {
          new Notification('Post-Op Update Required', { body, icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063176.png' });
        }

        onTrigger({
          id: `${checkId}-${Date.now()}`,
          type: 'text',
          content: body,
          timestamp: new Date(),
          sender: 'System Status Monitor'
        });
        await BackendService.markNotificationSent(checkId);
      }
    }
  }
};
