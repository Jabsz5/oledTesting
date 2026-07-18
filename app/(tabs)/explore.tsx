import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

import {
  turnHeatingPadOn,
  turnHeatingPadOff,
} from '@/scripts/commands';

import {
  getTemperature,
  monitorTemperature,
  getCapacity,
  monitorCapacity,
} from '@/scripts/bluetooth';

import { useBluetooth } from '@/BLEcontext/bluetooth-context';

export default function TabTwoScreen() {
  const [statusMessage, setStatusMessage] = useState(
    'Ready to send commands.'
  );

  const [isSending, setIsSending] = useState(false);
  const [heaterEnabled, setHeaterEnabled] = useState(false);

  // Most recently received sensor values.
  const [temperature, setTemperature] = useState<number | null>(null);
  const [capacity, setCapacity] = useState<number | null>(null);

  const {
    connectedDevice,
    bluetoothStatus,
    setBluetoothStatus,
  } = useBluetooth();

  /*
   * Subscribe to both sensor characteristics when the ESP32
   * becomes connected.
   */
  useEffect(() => {
    if (!connectedDevice) {
      setTemperature(null);
      setCapacity(null);
      return;
    }

    const temperatureSubscription = monitorTemperature({
      connectedDevice,

      setTemperature: (receivedTemperature: number) => {
        setTemperature(receivedTemperature);

        setStatusMessage(
          `Temperature received: ${receivedTemperature.toFixed(1)} °F`
        );
      },

      setBluetoothStatus,
    });

    const capacitySubscription = monitorCapacity({
      connectedDevice,

      setCapacity: (receivedCapacity: number) => {
        setCapacity(receivedCapacity);

        setStatusMessage(
          `Capacity received: ${receivedCapacity.toFixed(2)}`
        );
      },

      setBluetoothStatus,
    });

    /*
     * Remove both BLE notification monitors when this screen
     * unmounts or the connected device changes.
     */
    return () => {
      console.log(
        'Removing temperature notification subscription...'
      );

      temperatureSubscription?.remove();

      console.log(
        'Removing capacity notification subscription...'
      );

      capacitySubscription?.remove();
    };
  }, [connectedDevice, setBluetoothStatus]);

  async function handleCheckTemperature() {
    try {
      setIsSending(true);
      setStatusMessage('Requesting temperature...');

      // Clear the old value while waiting for a new notification.
      setTemperature(null);

      const success = await getTemperature({
        connectedDevice,
        setBluetoothStatus,
      });

      if (!success) {
        setStatusMessage('Temperature request failed.');
      } else {
        setStatusMessage(
          'Temperature request sent. Waiting for response...'
        );
      }
    } catch (error) {
      console.log('Temperature button error:', error);

      setBluetoothStatus?.('Temperature request failed');
      setStatusMessage('Temperature request failed.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleCheckCapacity() {
    try {
      setIsSending(true);
      setStatusMessage('Requesting cup capacity...');

      // Clear the old value while waiting for a new notification.
      setCapacity(null);

      const success = await getCapacity({
        connectedDevice,
        setBluetoothStatus,
      });

      if (!success) {
        setStatusMessage('Capacity request failed.');
      } else {
        setStatusMessage(
          'Capacity request sent. Waiting for response...'
        );
      }
    } catch (error) {
      console.log('Capacity button error:', error);

      setBluetoothStatus?.('Capacity request failed');
      setStatusMessage('Capacity request failed.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleToggleHeatingPad() {
    try {
      setIsSending(true);

      if (heaterEnabled) {
        setBluetoothStatus('Turning heating pad OFF...');

        const success = await turnHeatingPadOff({
          connectedDevice,
          setBluetoothStatus,
        });

        if (success) {
          setHeaterEnabled(false);
          setStatusMessage('Heating pad turned OFF.');
        } else {
          setStatusMessage('Could not turn heating pad OFF.');
        }
      } else {
        setBluetoothStatus('Turning heating pad ON...');

        const success = await turnHeatingPadOn({
          connectedDevice,
          setBluetoothStatus,
        });

        if (success) {
          setHeaterEnabled(true);
          setStatusMessage('Heating pad turned ON.');
        } else {
          setStatusMessage('Could not turn heating pad ON.');
        }
      }
    } catch (error) {
      console.log('Heating pad button error:', error);

      setBluetoothStatus('Heating pad command failed.');
      setStatusMessage('Heating pad command failed.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{
        light: '#D0D0D0',
        dark: '#353636',
      }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="cup.and.saucer.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Smart Cup Controls
        </ThemedText>
      </ThemedView>

      <ThemedText style={styles.description}>
        Send commands to the ESP32 to check coffee temperature, check cup
        capacity, or control the heating pad.
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Coffee Sensors
        </ThemedText>

        <ThemedView style={styles.sensorRow}>
          {/* Temperature value received through BLE notify(). */}
          <ThemedView style={styles.sensorDisplay}>
            <ThemedText style={styles.sensorLabel}>
              Temperature
            </ThemedText>

            <ThemedText style={styles.sensorValue}>
              {temperature === null
                ? '--.- °F'
                : `${temperature.toFixed(1)} °F`}
            </ThemedText>
          </ThemedView>

          {/* Capacity value received through BLE notify(). */}
          <ThemedView style={styles.sensorDisplay}>
            <ThemedText style={styles.sensorLabel}>
              Capacity
            </ThemedText>

            <ThemedText style={styles.sensorValue}>
              {capacity === null
                ? '--.-'
                : capacity.toFixed(2)}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isSending && styles.buttonDisabled,
          ]}
          disabled={isSending}
          onPress={handleCheckTemperature}>
          <ThemedText style={styles.buttonText}>
            Check Temperature
          </ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isSending && styles.buttonDisabled,
          ]}
          disabled={isSending}
          onPress={handleCheckCapacity}>
          <ThemedText style={styles.buttonText}>
            Check Capacity
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          Heating Pad
        </ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            heaterEnabled
              ? styles.heaterOnButton
              : styles.heaterOffButton,
            pressed && styles.buttonPressed,
            isSending && styles.buttonDisabled,
          ]}
          disabled={isSending}
          onPress={handleToggleHeatingPad}>
          <ThemedText style={styles.buttonText}>
            {heaterEnabled
              ? 'Turn Heating Pad OFF'
              : 'Turn Heating Pad ON'}
          </ThemedText>
        </Pressable>

        <ThemedText style={styles.heaterStatus}>
          Heating pad status: {heaterEnabled ? 'ON' : 'OFF'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.statusBox}>
        <ThemedText type="defaultSemiBold">
          Bluetooth Status
        </ThemedText>

        <ThemedText>
          {bluetoothStatus || 'No Bluetooth status available.'}
        </ThemedText>

        <ThemedText
          type="defaultSemiBold"
          style={styles.commandStatusTitle}>
          Command Status
        </ThemedText>

        <ThemedText>{statusMessage}</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },

  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  description: {
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 22,
  },

  card: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 18,
    gap: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
  },

  cardTitle: {
    marginBottom: 4,
  },

  sensorRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
  },

  sensorDisplay: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
  },

  sensorLabel: {
    fontSize: 14,
    opacity: 0.75,
  },

  sensorValue: {
    fontSize: 24,
    fontWeight: '700',
  },

  button: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },

  heaterOnButton: {
    backgroundColor: '#dc2626',
  },

  heaterOffButton: {
    backgroundColor: '#16a34a',
  },

  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  heaterStatus: {
    textAlign: 'center',
    marginTop: 4,
  },

  statusBox: {
    padding: 16,
    borderRadius: 12,
    gap: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
    marginBottom: 30,
  },

  commandStatusTitle: {
    marginTop: 8,
  },
});