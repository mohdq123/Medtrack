import { Patient, AdminMessage } from '../types';
import { BackendService } from './BackendService';
import { isAfter, subDays, startOfDay, setHours, setMinutes, isBefore, format } from 'date-fns';

export const NotificationService = {
  requestPermission: async () => {
    // In mobile, we can request native push permissions if needed.
    // For this implementation, we will log warnings and display local alerts
    // and sync alerts directly into the shared database messages panel.
    return true;
  },

  checkAndTriggerReminders: async (
    patients: Patient[], 
    onTrigger: (msg: AdminMessage) => void
  ) => {
    const now = new Date();
    const sentIds = await BackendService.getSentNotifications();
    const messagesToSave: AdminMessage[] = [];

    for (const patient of patients) {
      if (patient.isCompleted || patient.isCancelled || !patient.appointmentDate) continue;

      const appointmentDate = new Date(patient.appointmentDate);
      if (isNaN(appointmentDate.getTime())) continue;
      
      // --- 2 Days Before Reminder ---
      const targetDayRemind = subDays(startOfDay(appointmentDate), 2);
      const triggerTimeRemind = setMinutes(setHours(targetDayRemind, 12), 0); // 12:00 PM
      const remindId = `rem-2d-${patient.id}`;

      if (!sentIds.includes(remindId) && isAfter(now, triggerTimeRemind) && isBefore(now, appointmentDate)) {
        const surgeryDayName = format(appointmentDate, 'EEEE');
        const body = `Call the patients for ${surgeryDayName}'s list (${patient.name})`;

        const newMsg: AdminMessage = {
          id: `${remindId}-${Date.now()}`,
          type: 'text',
          content: body,
          timestamp: new Date(),
          sender: 'System Scheduler'
        };

        onTrigger(newMsg);
        messagesToSave.push(newMsg);
        await BackendService.markNotificationSent(remindId);
      }
    }

    if (messagesToSave.length > 0) {
      const currentMessages = await BackendService.getMessages();
      await BackendService.saveMessages([...messagesToSave, ...currentMessages]);
    }
  }
};
