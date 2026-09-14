import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, TextInput, ScrollView} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { connectToESP32, stopBluetoothScan, sendTextToOLED } from '@/scripts/bluetooth';
import { useBluetooth } from '@/BLEcontext/bluetooth-context';


import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  
  const {esp32Status, setEsp32Status, bluetoothStatus, setBluetoothStatus, connectedDevice, setConnectedDevice} = useBluetooth();
  const [oledText, setOledText] = useState('');

  useEffect(() => {
    return () => {
      stopBluetoothScan();
    };
  }, []);

  const ConnectToBluetooth = () => {connectToESP32({setBluetoothStatus, setEsp32Status, setConnectedDevice});};
  const SendTextToOLED = () => {sendTextToOLED({connectedDevice, text: oledText, setBluetoothStatus});
};

  return (
    <LinearGradient
  colors={['#fff8f0', '#f1e0d6']}
  locations={[0, 1]}
  start={{ x: 0, y: 0 }}
  end={{ x: 0, y: 1 }}
  style={styles.gradient}
>
  <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator={true}
    keyboardShouldPersistTaps="handled"
  >
    <Image
      source={require('@/assets/images/coffee_pot.png')}
      style={styles.SmartCoffeeCupLogo}
      contentFit="contain"
    />

    <ThemedView style={styles.titleContainer}>
      <ThemedText type="title" style={styles.title}>
        Smart Coffee Cup
      </ThemedText>
    </ThemedView>

    <ThemedText type="subtitle" style={styles.subtitle}>
      OLED-Bluetooth Connectivity Test
    </ThemedText>

    <ThemedView style={styles.card}>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Device Status
      </ThemedText>

      <ThemedText style={styles.statusText}>
        ESP32: {esp32Status}
      </ThemedText>

      <ThemedText style={styles.statusText}>
        OLED Display: Waiting for data
      </ThemedText>

      <ThemedText style={styles.statusText}>
        Bluetooth: {bluetoothStatus}
      </ThemedText>

      {connectedDevice && (
        <ThemedText style={styles.statusText}>
          Device connected successfully
        </ThemedText>
      )}
    </ThemedView>

    <ThemedView style={styles.inputCard}>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Send Text to OLED
      </ThemedText>

      <TextInput
        style={styles.textInput}
        placeholder="Type OLED message..."
        placeholderTextColor="#9d8070"
        value={oledText}
        onChangeText={setOledText}
      />

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={SendTextToOLED}
      >
        <ThemedText style={styles.buttonText}>
          Send to OLED
        </ThemedText>
      </Pressable>
    </ThemedView>

    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={ConnectToBluetooth}
    >
      <ThemedText style={styles.buttonText}>
        Connect to ESP32
      </ThemedText>
    </Pressable>

    <ThemedText style={styles.noteText}>
      This screen scans for a BLE device with ESP32 in its name and
      connects to it.
    </ThemedText>
  </ScrollView>
</LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Fills the entire screen with the gradient
  gradient: {
    flex: 1,
  },

  // The actual scrolling component
  scrollView: {
    flex: 1,
    backgroundColor: '#cfa68a',
  },

  // Controls the layout inside the ScrollView
  scrollContent: {
    flexGrow: 1,
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6f4e37',
    textAlign: 'center',
  },

  subtitle: {
    color: '#6f4e37',
  },

  card: {
    padding: 18,
    borderRadius: 12,
    gap: 10,

    // Allows the gradient to remain visible behind the card
    backgroundColor: 'rgba(255, 255, 255, 0.30)',

    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.15)',
  },

  inputCard: {
    padding: 18,
    borderRadius: 12,
    gap: 12,

    // Allows the gradient to remain visible behind the card
    backgroundColor: 'rgba(255, 255, 255, 0.30)',

    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.15)',
  },

  statusText: {
    fontSize: 16,
    color: '#8b5e3c',
  },

  button: {
    backgroundColor: '#a76a50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  noteText: {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 20,
    color: '#4b2e1e',
  },

  SmartCoffeeCupLogo: {
    width: 200,
    height: 178,
    alignSelf: 'center',
  },

  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.45)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#4b2e1e',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});