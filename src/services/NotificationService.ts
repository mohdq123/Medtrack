import { Patient, AdminMessage } from '../types';
import { BackendService } from './BackendService';
import { isAfter, subDays, startOfDay, setHours, setMinutes, isBefore, format } from 'date-fns';
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  requestPermission: async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (error) {
      console.error("Error requesting notifications permission:", error);
      return false;
    }
  },

  triggerLocalNotification: async (msg: AdminMessage) => {
    try {
      const isVoice = msg.type === 'voice';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isVoice ? "New Voice Broadcast 🎙️" : `Announcement from ${msg.sender} 📣`,
          body: msg.content,
          sound: true,
          data: { id: msg.id, type: msg.type },
        },
        trigger: null, // trigger immediately
      });
    } catch (error) {
      console.error("Failed to trigger local notification:", error);
    }
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
