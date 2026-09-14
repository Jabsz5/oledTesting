import React, { useEffect, useState } from 'react';

import { Image } from 'expo-image';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';


import { ThemedText } from '@/components/themed-text';

import { ThemedView } from '@/components/themed-view';

import {
  connectToESP32,
  sendTextToOLED,
  stopBluetoothScan,
} from '@/scripts/bluetooth';

import { useBluetooth } from '@/BLEcontext/bluetooth-context';

import { LinearGradient } from 'expo-linear-gradient';


export default function HomeScreen() {
  const {
    esp32Status,
    setEsp32Status,
    bluetoothStatus,
    setBluetoothStatus,
    connectedDevice,
    setConnectedDevice,
  } = useBluetooth();

  const [oledText, setOledText] = useState('');

  // Stores the local URI of the photo selected from the gallery.
  // Later this can be used when sending the image to the OLED.
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopBluetoothScan();
    };
  }, []);

  const ConnectToBluetooth = () => {
    connectToESP32({
      setBluetoothStatus,
      setEsp32Status,
      setConnectedDevice,
    });
  };

  const SendTextToOLED = () => {
    sendTextToOLED({
      connectedDevice,
      text: oledText,
      setBluetoothStatus,
    });
  };

  // Opens the user's photo gallery and lets them select an image.
  const PickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],

      // Keeps the original image instead of forcing the user to crop it.
      allowsEditing: false,

      // Keeps maximum available quality.
      quality: 1,
    });

    // If the user actually selected an image,
    // save its local URI into state.
    if (!result.canceled && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
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

        {/* DEVICE STATUS */}
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

        {/* SEND TEXT */}
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

        {/* UPLOAD PHOTO */}
        <ThemedView style={styles.inputCard}>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Upload Photo to OLED
          </ThemedText>

          <ThemedText style={styles.photoDescription}>
            Select a photo from your gallery to prepare it for the OLED display.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={PickImage}
          >
            <ThemedText style={styles.buttonText}>
              Choose Photo
            </ThemedText>
          </Pressable>

          {/* IMAGE PREVIEW */}
          {selectedImage && (
            <ThemedView style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                contentFit="contain"
              />

              <ThemedText style={styles.imageSelectedText}>
                Photo selected successfully
              </ThemedText>
            </ThemedView>
          )}

          {/* Placeholder button only.
              No OLED image sending functionality is implemented yet. */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.sendPhotoButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              // Image-to-OLED functionality will be added later.
            }}
          >
            <ThemedText style={styles.buttonText}>
              Send Photo to OLED
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* BLUETOOTH CONNECTION */}
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

    backgroundColor: 'rgba(255, 255, 255, 0.30)',

    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.15)',
  },

  inputCard: {
    padding: 18,
    borderRadius: 12,
    gap: 12,

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

  photoDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8b5e3c',
  },

  imagePreviewContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },

  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: 'rgba(111, 78, 55, 0.08)',
  },

  imageSelectedText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6f4e37',
    fontWeight: '600',
  },

  sendPhotoButton: {
    marginTop: 4,
  },
});