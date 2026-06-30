import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, TextInput} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { connectToESP32, stopBluetoothScan, sendTextToOLED } from '@/scripts/bluetooth';

export default function HomeScreen() {
  const [esp32Status, setEsp32Status] = useState('Not connected');
  const [bluetoothStatus, setBluetoothStatus] = useState('Idle');
  const [connectedDevice, setConnectedDevice] = useState(null);
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Smart Coffee Cup</ThemedText>
        </ThemedView>

        <ThemedText type="subtitle">
          OLED-Bluetooth Connectivity Test
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Device Status</ThemedText>

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
          <ThemedText type="subtitle">Send Text to OLED</ThemedText>

          <TextInput
            style={styles.textInput}
            placeholder="Type OLED message..."
            placeholderTextColor="#888"
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
          This screen scans for a BLE device with ESP32 in its name and connects
          to it.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingBottom: 32,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  card: {
    padding: 18,
    borderRadius: 12,
    gap: 10,
    backgroundColor: 'rgba(120, 120, 120, 0.15)',
  },

  statusText: {
    fontSize: 16,
  },

  button: {
    backgroundColor: '#007AFF',
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
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  noteText: {
    fontSize: 14,
    opacity: 0.75,
    lineHeight: 20,
  },

  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },

  inputCard: {
  padding: 18,
  borderRadius: 12,
  gap: 12,
  backgroundColor: 'rgba(120, 120, 120, 0.15)',
},

textInput: {
  borderWidth: 1,
  borderColor: '#999',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  fontSize: 16,
  color: 'white',
},
});