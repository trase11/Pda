import { Alert, Platform } from 'react-native';

// Cross-platform confirmation dialog.
// React Native's Alert.alert is a no-op on react-native-web, so on web we
// fall back to the browser's native window.confirm.
export function confirmAction(title, message, onConfirm, confirmLabel = 'OK') {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(text)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Άκυρο', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
