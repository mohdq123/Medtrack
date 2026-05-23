import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  SafeAreaView,
  Modal
} from 'react-native';
import { Text } from './PoppinsText';
import { Stethoscope, LogIn, Mail, Lock, AlertCircle, Database, Check } from 'lucide-react-native';
import { BackendService } from '../services/BackendService';
import { getDbUrl } from '../services/database';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  onOpenDatabaseConfig: () => void;
}

export default function Login({ onLogin, onOpenDatabaseConfig }: LoginProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Authentication mode
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  // Google Modal states
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);

  const mockGoogleAccounts = [
    { email: 'admin.google@medtrack.com', name: 'Dr. Administrator' },
    { email: 'resident.google@medtrack.com', name: 'Dr. Resident' },
    { email: 'consultant.google@medtrack.com', name: 'Dr. Consultant' },
  ];

  useEffect(() => {
    async function checkDb() {
      const url = await getDbUrl();
      setDbConnected(!!url);
    }
    checkDb();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const users = await BackendService.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);

      if (user) {
        if (user.confirmed === false) {
          setUnconfirmedEmail(user.email);
        } else {
          onLogin(user);
        }
      } else {
        setError("Invalid email or password. Please sign up or check credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Please fill in all fields (Full Name, Email, Password).");
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const users = await BackendService.getUsers();
      const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        setError("Email already registered. Please sign in instead.");
        setLoading(false);
        return;
      }

      await BackendService.createOrGetUser(email.trim().toLowerCase(), name.trim(), 'admin', password, false);
      setUnconfirmedEmail(email.trim().toLowerCase());
      setAuthMode('signin');
    } catch (err) {
      console.error(err);
      setError("An error occurred during sign up.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelect = async (gEmail: string, gName: string) => {
    setLoading(true);
    setGoogleModalVisible(false);
    setError(null);
    try {
      const users = await BackendService.getUsers();
      const existing = users.find(u => u.email.toLowerCase() === gEmail.toLowerCase());

      if (authMode === 'signup') {
        if (existing) {
          setError("Google account email is already registered. Please sign in.");
          setLoading(false);
          return;
        }
        await BackendService.createOrGetUser(gEmail, gName, 'admin', 'google-auth', false);
        setUnconfirmedEmail(gEmail);
      } else {
        // Sign In mode
        if (!existing) {
          setError("This Google account is not registered. Please switch to Sign Up first.");
          setLoading(false);
          return;
        }
        if (existing.confirmed === false) {
          setUnconfirmedEmail(existing.email);
        } else {
          onLogin(existing);
        }
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during Google authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = async () => {
    if (!customGoogleEmail.trim() || !customGoogleName.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (!customGoogleEmail.includes('@') || !customGoogleEmail.includes('.')) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    await handleGoogleSelect(
      customGoogleEmail.trim().toLowerCase(),
      customGoogleName.trim()
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Database Setup Button (Top Right, unobtrusive configuration) */}
      <TouchableOpacity 
        onPress={onOpenDatabaseConfig} 
        style={styles.configButton}
      >
        <Database size={20} color={dbConnected ? '#10b981' : '#f59e0b'} />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Stethoscope size={40} color="#fff" />
            </View>
            <Text style={styles.title}>MedTrack</Text>
            <Text style={styles.subtitle}>Medical Command & Control</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {/* Mode switch */}
            <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#1f2937', borderRadius: 14, padding: 4 }}>
              <TouchableOpacity 
                style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 }, authMode === 'signin' && { backgroundColor: '#4f46e5' }]}
                onPress={() => { setAuthMode('signin'); setError(null); }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 }, authMode === 'signup' && { backgroundColor: '#4f46e5' }]}
                onPress={() => { setAuthMode('signup'); setError(null); }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {authMode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Dr. John Doe"
                    placeholderTextColor="#475569"
                    value={name}
                    onChangeText={setName}
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            {/* Email field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@medtrack.com"
                  placeholderTextColor="#475569"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={authMode === 'signin' ? handleLogin : handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <LogIn size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginButtonText}>
                    {authMode === 'signin' ? 'Authorize Access' : 'Create Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={() => setGoogleModalVisible(true)}
              disabled={loading}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {authMode === 'signin' ? 'Continue with Google' : 'Sign Up with Google'}
              </Text>
            </TouchableOpacity>

            {/* Demo Credentials description */}
            <View style={styles.credentialsBox}>
              <Text style={styles.credentialsHeader}>Demo & Registration Information</Text>
              <Text style={styles.credentialText}>
                Sign up with any new email/password or mock Google accounts to create an account, verify via confirmation simulator, and sign in.
              </Text>
            </View>
          </View>

          <Text style={styles.footerText}>Authorized Hospital Personnel Only</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification Simulation Overlay Modal */}
      {unconfirmedEmail && (
        <Modal transparent animationType="fade" visible={!!unconfirmedEmail}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { alignItems: 'center', padding: 28 }]}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(99, 102, 241, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                <Mail size={32} color="#6366f1" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
                Confirm Your Email
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                We've sent a verification link to{"\n"}
                <Text style={{ color: '#fff', fontWeight: '800' }}>{unconfirmedEmail}</Text>.{"\n"}
                Please confirm it to activate your account.
              </Text>
              
              <TouchableOpacity 
                style={{ width: '100%', backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 }}
                onPress={async () => {
                  await BackendService.confirmUserEmail(unconfirmedEmail);
                  setUnconfirmedEmail(null);
                  Alert.alert("Verified", "Your email has been confirmed! You can now sign in.");
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Simulate Email Confirmation Link</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ width: '100%', paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setUnconfirmedEmail(null)}
              >
                <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>Cancel / Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Google Sign-In Mock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={googleModalVisible}
        onRequestClose={() => setGoogleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <ScrollView bounces={false} contentContainerStyle={{ justifyContent: 'center' }}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.googleIconHeaderContainer}>
                    <Text style={styles.googleIconHeader}>G</Text>
                  </View>
                  <Text style={styles.modalTitle}>
                    {authMode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
                  </Text>
                  <Text style={styles.modalSubtitle}>to continue to MedTrack</Text>
                </View>

                {!showCustomGoogleForm ? (
                  <>
                    <View style={styles.accountList}>
                      {mockGoogleAccounts.map((account) => (
                        <TouchableOpacity
                          key={account.email}
                          style={styles.accountButton}
                          onPress={() => handleGoogleSelect(account.email, account.name)}
                        >
                          <View style={styles.accountAvatar}>
                            <Text style={styles.accountAvatarText}>{account.name.charAt(0)}</Text>
                          </View>
                          <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>{account.name}</Text>
                            <Text style={styles.accountEmail}>{account.email}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity 
                      style={styles.useAnotherButton}
                      onPress={() => setShowCustomGoogleForm(true)}
                    >
                      <Text style={styles.useAnotherText}>Use another Google Account</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.customForm}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Google Email</Text>
                      <View style={styles.inputWrapper}>
                        <Mail size={16} color="#94a3b8" style={{ marginRight: 10 }} />
                        <TextInput
                          style={styles.modalInput}
                          placeholder="doctor@gmail.com"
                          placeholderTextColor="#475569"
                          value={customGoogleEmail}
                          onChangeText={setCustomGoogleEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Full Name</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="Dr. John Doe"
                          placeholderTextColor="#475569"
                          value={customGoogleName}
                          onChangeText={setCustomGoogleName}
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity 
                        style={styles.modalCancelBtn}
                        onPress={() => setShowCustomGoogleForm(false)}
                      >
                        <Text style={styles.modalCancelBtnText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.modalSubmitBtn}
                        onPress={handleCustomGoogleSubmit}
                      >
                        <Text style={styles.modalSubmitBtnText}>
                          {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.modalCancelBtn, { marginTop: 12, width: '100%' }]}
                  onPress={() => {
                    setGoogleModalVisible(false);
                    setShowCustomGoogleForm(false);
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    padding: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 36,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    borderRadius: 18,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1f2937',
  },
  dividerText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  googleIconContainer: {
    backgroundColor: '#ea4335',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  googleButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  credentialsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  credentialsHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  credentialText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '500',
  },
  credentialHighlight: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  footerText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  configButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.9)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  googleIconHeaderContainer: {
    backgroundColor: '#ea4335',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  googleIconHeader: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  accountList: {
    gap: 12,
    marginBottom: 16,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  accountEmail: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  accountRoleTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accountRoleText: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  useAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  useAnotherText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '700',
  },
  customForm: {
    gap: 14,
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  roleSelectorLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  roleOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  roleOptionBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366f1',
  },
  roleOptionText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  roleOptionTextActive: {
    color: '#818cf8',
    fontWeight: '900',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalCancelBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#4f46e5',
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
});
