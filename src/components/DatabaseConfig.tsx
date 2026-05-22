import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from './PoppinsText';
import { Database, Link, Check, AlertCircle, Trash2, ArrowLeft } from 'lucide-react-native';
import { getDbUrl, saveDbUrl, clearDbUrl, testConnectionAndInit } from '../services/database';

interface DatabaseConfigProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function DatabaseConfig({ onBack, onSuccess }: DatabaseConfigProps) {
  const [url, setUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const activeUrl = await getDbUrl();
      setCurrentUrl(activeUrl);
      if (activeUrl) {
        setUrl(activeUrl);
      }
    }
    load();
  }, []);

  const handleConnect = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid connection string');
      return;
    }
    
    if (!url.trim().startsWith('postgresql://') && !url.trim().startsWith('postgres://')) {
      Alert.alert('Invalid URL', 'Neon connection URL must start with postgresql:// or postgres://');
      return;
    }

    setIsTesting(true);
    const success = await testConnectionAndInit(url);
    setIsTesting(false);

    if (success) {
      await saveDbUrl(url);
      Alert.alert(
        'Database Synced', 
        'Successfully connected to Neon Postgres database. Tables initialized and seeded with default credentials.',
        [{ text: 'Proceed', onPress: onSuccess }]
      );
    } else {
      Alert.alert(
        'Connection Failed',
        'Could not connect to the database. Please verify the URL is correct, your internet is active, and database allows incoming requests.'
      );
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Database?',
      'This will revert the app to offline AsyncStorage mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disconnect', 
          style: 'destructive',
          onPress: async () => {
            await clearDbUrl();
            setUrl('');
            setCurrentUrl(null);
            Alert.alert('Disconnected', 'Database disconnected. Switched to offline mode.');
            onSuccess();
          } 
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Neon Database Setup</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Database size={48} color="#6366f1" />
          </View>

          <Text style={styles.title}>Configure Serverless Postgres</Text>
          <Text style={styles.subtitle}>
            Enter your Neon database connection URL. The app will automatically initialize the tables and seed default users.
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Link size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              <Text style={styles.inputLabel}>Neon Connection String</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="postgresql://user:pass@ep-host.region.neon.tech/neondb?sslmode=require"
              placeholderTextColor="#475569"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
            />
          </View>

          {isTesting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Testing connection & initializing tables...</Text>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.connectButton} 
                onPress={handleConnect}
              >
                <Check size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.connectButtonText}>Connect & Setup DB</Text>
              </TouchableOpacity>

              {currentUrl && (
                <TouchableOpacity 
                  style={styles.disconnectButton} 
                  onPress={handleDisconnect}
                >
                  <Trash2 size={20} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text style={styles.disconnectButtonText}>Disconnect Neon</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentUrl ? (
            <View style={[styles.statusBox, styles.statusConnected]}>
              <Check size={18} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={styles.statusTextConnected}>Connected to Neon Database</Text>
            </View>
          ) : (
            <View style={[styles.statusBox, styles.statusDisconnected]}>
              <AlertCircle size={18} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={styles.statusTextDisconnected}>Running in local demo mode (AsyncStorage)</Text>
            </View>
          )}
        </View>

        {/* Neon instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to get a connection string:</Text>
          <Text style={styles.instructionStep}>1. Log in to your neon.tech console.</Text>
          <Text style={styles.instructionStep}>2. Select your project and copy the connection string from the Dashboard page.</Text>
          <Text style={styles.instructionStep}>3. Ensure SSL is enabled (sslmode=require parameter).</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712', // Indigo 950 deep dark
  },
  scrollContent: {
    padding: 24,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 99,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#312e81',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '700',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  connectButton: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  disconnectButton: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '900',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
  },
  statusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusTextConnected: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextDisconnected: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  instructionsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 20,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  instructionStep: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    lineHeight: 16,
  },
});
