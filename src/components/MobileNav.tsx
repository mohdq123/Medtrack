import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LayoutDashboard, Scissors, Stethoscope, Calendar, Settings, User } from 'lucide-react-native';
import { Text } from './PoppinsText';

interface MobileNavProps {
  view: string;
  setView: (view: any) => void;
  currentUserRole?: string;
}

export default function MobileNav({ view, setView, currentUserRole }: MobileNavProps) {
  const isAdmin = currentUserRole === 'admin';
  const isResident = currentUserRole === 'resident';

  if (isAdmin) {
    return (
      <View style={styles.navBar}>
        <NavItem active={view === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setView('dashboard')} />
        <NavItem active={view === 'calendar'} icon={<Calendar size={20} />} label="Theater" onClick={() => setView('calendar')} />
        <NavItem active={view === 'surgical'} icon={<Scissors size={20} />} label="Surgery" onClick={() => setView('surgical')} />
        <NavItem active={view === 'eswl'} icon={<Stethoscope size={20} />} label="ESWL" onClick={() => setView('eswl')} />
        <NavItem active={view === 'settings'} icon={<User size={20} />} label="Me" onClick={() => setView('settings')} />
      </View>
    );
  }

  return (
    <View style={styles.navBar}>
      <NavItem active={view === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Today" onClick={() => setView('dashboard')} />
      <NavItem active={view === 'surgical'} icon={<Scissors size={20} />} label="Surgery" onClick={() => setView('surgical')} />
      <NavItem active={view === 'eswl'} icon={<Stethoscope size={20} />} label="ESWL" onClick={() => setView('eswl')} />
      {!isResident && (
        <NavItem active={view === 'calendar'} icon={<Calendar size={20} />} label="Theater" onClick={() => setView('calendar')} />
      )}
      <NavItem active={view === 'settings'} icon={<User size={20} />} label="Me" onClick={() => setView('settings')} />
    </View>
  );
}

interface NavItemProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function NavItem({ active, icon, label, onClick }: NavItemProps) {
  // Cloning icon to pass color prop dynamically
  const styledIcon = React.cloneElement(icon as React.ReactElement<any>, {
    color: active ? '#818cf8' : '#64748b'
  });

  return (
    <TouchableOpacity 
      onPress={onClick} 
      style={styles.navItem}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
        {styledIcon}
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 10,
    paddingBottom: 24, // extra padding for bottom notches on iOS/Android
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: '#818cf8',
    fontWeight: '900',
  },
});
