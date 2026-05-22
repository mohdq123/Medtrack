import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Text } from './PoppinsText';
import { X, Key, ShieldAlert } from 'lucide-react-native';
import { BackendService } from '../services/BackendService';
import { User } from '../types';

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
  onPasswordChanged: () => void;
}

export default function ChangePasswordModal({ user, onClose, onPasswordChanged }: ChangePasswordModalProps) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPass || !newPass || !confirmPass) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const users = await BackendService.getUsers();
      const dbUser = users.find(u => u.email === user.email);

      if (dbUser?.password !== currentPass) {
        setError("Current password is incorrect.");
        setLoading(false);
        return;
      }

      if (newPass.length < 4) {
        setError("New password must be at least 4 characters.");
        setLoading(false);
        return;
      }

      if (newPass !== confirmPass) {
        setError("New passwords do not match.");
        setLoading(false);
        return;
      }

      await BackendService.updateUserPassword(user.email, newPass);
      setLoading(false);
      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: onPasswordChanged }
      ]);
    } catch (e) {
      console.error(e);
      setError("An error occurred. Try again.");
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="fade" transparent>
      <SafeAreaView style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.iconBox}>
                <Key size={18} color="#6366f1" />
              </View>
              <Text style={styles.headerTitle}>Change Password</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Enter current password"
                placeholderTextColor="#475569"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPass}
                onChangeText={setNewPass}
                placeholder="At least 4 characters"
                placeholderTextColor="#475569"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Retype new password"
                placeholderTextColor="#475569"
                autoCapitalize="none"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <ShieldAlert size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1e293b',
    borderRadius: 99,
  },
  body: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
