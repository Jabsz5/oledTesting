import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import {
  turnHeatingPadOff,
  turnHeatingPadOn,
} from '@/scripts/commands';

import {
  getCapacity,
  getTemperature,
  monitorCapacity,
  monitorTemperature,
} from '@/scripts/bluetooth';

import { useBluetooth } from '@/BLEcontext/bluetooth-context';
const LOW_TEMPERATURE_ALERT_F = 60;

export default function TabTwoScreen() {
  const [statusMessage, setStatusMessage] = useState('Ready to send commands.');

  const [isSending, setIsSending] = useState(false);
  const [heaterEnabled, setHeaterEnabled] = useState(false);

  // Most recently received sensor values.
  const [temperature, setTemperature] = useState<number | null>(null);
  const [lowTemperatureDetected, setLowTemperatureDetected] = useState(false);
  const [capacity, setCapacity] = useState<number | null>(null);
  // Error handling
  const sensorErrorHandled = useRef(false);

  const {connectedDevice, bluetoothStatus, setBluetoothStatus} = useBluetooth();

   // Scheduled coffee brewing time
  const [brewHour, setBrewHour] = useState('8');
  const [brewMinute, setBrewMinute] = useState('00');
  const [brewPeriod, setBrewPeriod] = useState<'AM' | 'PM'>('AM');
  

  /*
   * Subscribe to both sensor characteristics when the ESP32
   * becomes connected.
   */
  useEffect(() => {
    if (!connectedDevice) {
      setTemperature(null);
      setCapacity(null);
      setLowTemperatureDetected(false);

      return;
    }

    const temperatureSubscription = monitorTemperature({
      connectedDevice,

      setTemperature: (receivedTemperature: number) => {
        const ERROR_VALUE = -100;
        const sensorError = receivedTemperature < ERROR_VALUE;

        if (sensorError) {
            // Ignore repeated disconnected-sensor notifications
            if (sensorErrorHandled.current) {
                return;
            }
            sensorErrorHandled.current = true;

            setTemperature(receivedTemperature);
            setLowTemperatureDetected(false);
            setStatusMessage("Alert! Temperature sensor is not connected or not responding!");
            return;
        }
        // A valid temperature was received, so allow a future
        // disconnected-sensor error to be handled again.
        sensorErrorHandled.current = false;

        setTemperature(receivedTemperature);

        const isLowTemperature = receivedTemperature < LOW_TEMPERATURE_ALERT_F;

        setLowTemperatureDetected(isLowTemperature);

        if (isLowTemperature) {
            setStatusMessage(`Alert! Temperature is below ${LOW_TEMPERATURE_ALERT_F} °F!`);
        } else {
            setStatusMessage(`Temperature received: ${receivedTemperature.toFixed(1)} °F`);
        }
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
    <LinearGradient
      colors={['#fff8f0', '#f1e0d6']}
      locations={[0, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}>
        <Image
          source={require('@/assets/images/coffee_pot.png')}
          style={styles.SmartCoffeeCupLogo}
          contentFit="contain"
        />

      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={styles.title}>
          Smart Cup Controls
        </ThemedText>
      </ThemedView>

      <ThemedText style={styles.description}>
        Send commands to the ESP32 to check coffee temperature, check cup
        capacity, or control the heating pad.
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Coffee Sensors
        </ThemedText>

        

        <ThemedView style={styles.sensorRow}>
          <ThemedView
            style={[
              styles.sensorDisplay,
              lowTemperatureDetected &&
                styles.lowTemperatureSensorDisplay,
            ]}>
            <ThemedText style={styles.sensorLabel}>
              Temperature
            </ThemedText>

            <ThemedText
              style={[
                styles.sensorValue,
                lowTemperatureDetected &&
                  styles.lowTemperatureSensorValue,
              ]}>
              {temperature === null
                ? '--.- °F'
                : `${temperature.toFixed(1)} °F`}
            </ThemedText>
          </ThemedView>

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

        {lowTemperatureDetected && (
          <ThemedView style={styles.temperatureAlert}>
            <ThemedText style={styles.temperatureAlertText}>
              Alert! Temperature is below 60 degrees!
            </ThemedText>
          </ThemedView>
        )}

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
        <ThemedText type="subtitle" style={styles.subtitle}>
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

      {/* SCHEDULE COFFEE */}
<ThemedView style={styles.card}>
  <ThemedText type="subtitle" style={styles.subtitle}>
    Schedule Coffee
  </ThemedText>

  <ThemedText style={styles.scheduleDescription}>
    Select the time you want the coffee machine to begin brewing.
  </ThemedText>

  <ThemedView style={styles.timePickerContainer}>
    {/* HOUR */}
    <TextInput
      style={styles.timeInput}
      value={brewHour}
      onChangeText={(value) => {
        const numbersOnly = value.replace(/[^0-9]/g, '');

        if (
          numbersOnly === '' ||
          (Number(numbersOnly) >= 1 && Number(numbersOnly) <= 12)
        ) {
          setBrewHour(numbersOnly);
        }
      }}
      keyboardType="number-pad"
      maxLength={2}
      placeholder="8"
      placeholderTextColor="#9d8070"
    />

    <ThemedText style={styles.timeColon}>:</ThemedText>

    {/* MINUTE */}
    <TextInput
      style={styles.timeInput}
      value={brewMinute}
      onChangeText={(value) => {
        const numbersOnly = value.replace(/[^0-9]/g, '');

        if (
          numbersOnly === '' ||
          (Number(numbersOnly) >= 0 && Number(numbersOnly) <= 59)
        ) {
          setBrewMinute(numbersOnly);
        }
      }}
      keyboardType="number-pad"
      maxLength={2}
      placeholder="00"
      placeholderTextColor="#9d8070"
    />

    {/* AM */}
    <Pressable
      style={[
        styles.periodButton,
        brewPeriod === 'AM' && styles.periodButtonSelected,
      ]}
      onPress={() => setBrewPeriod('AM')}
    >
      <ThemedText
        style={[
          styles.periodButtonText,
          brewPeriod === 'AM' && styles.periodButtonTextSelected,
        ]}
      >
        AM
      </ThemedText>
    </Pressable>

    {/* PM */}
    <Pressable
      style={[
        styles.periodButton,
        brewPeriod === 'PM' && styles.periodButtonSelected,
      ]}
      onPress={() => setBrewPeriod('PM')}
    >
      <ThemedText
        style={[
          styles.periodButtonText,
          brewPeriod === 'PM' && styles.periodButtonTextSelected,
        ]}
      >
        PM
      </ThemedText>
    </Pressable>
  </ThemedView>

    <ThemedView style={styles.selectedTimeContainer}>
      <ThemedText style={styles.selectedTimeLabel}>
        Scheduled Brew Time
      </ThemedText>

      <ThemedText style={styles.selectedTime}>
        {brewHour || '--'}:
        {brewMinute.length === 1 ? `0${brewMinute}` : brewMinute || '--'}{' '}
        {brewPeriod}
      </ThemedText>
    </ThemedView>

    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={() => {
        // The selected brew time will be sent to the ESP32 later.
      }}
    >
      <ThemedText style={styles.buttonText}>
        Set Brew Time
      </ThemedText>
    </Pressable>
  </ThemedView>

      <ThemedView style={styles.statusBox}>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Bluetooth Status
        </ThemedText>

        <ThemedText style={styles.statusText}>
          {bluetoothStatus || 'No Bluetooth status available.'}
        </ThemedText>

        <ThemedText
          type="subtitle"
          style={[styles.subtitle, styles.commandStatusTitle]}>
          Command Status
        </ThemedText>

        <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
      </ThemedView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#cfa68a',
  },

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

  description: {
    lineHeight: 22,
    color: '#4b2e1e',
  },

  statusText: {
    fontSize: 16,
    color: '#8b5e3c',
  },

  card: {
    padding: 18,
    borderRadius: 12,
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.15)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.15)',
  },

  sensorLabel: {
    fontSize: 14,
    opacity: 0.75,
    color: '#4b2e1e',
  },

  sensorValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8b5e3c',
  },

  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#a76a50',
  },

  heaterOnButton: {
    backgroundColor: '#8b5e3c',
  },

  heaterOffButton: {
    backgroundColor: '#a76a50',
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
    fontWeight: 'bold',
  },

  heaterStatus: {
    textAlign: 'center',
    marginTop: 4,
    color: '#4b2e1e',
  },

  statusBox: {
    padding: 16,
    borderRadius: 12,
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(111, 78, 55, 0.15)',
  },

  commandStatusTitle: {
    marginTop: 8,
  },

  SmartCoffeeCupLogo: {
    width: 200,
    height: 178,
    alignSelf: 'center',
  },

  lowTemperatureSensorDisplay: {
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },

  lowTemperatureSensorValue: {
    color: '#dc2626',
  },

  temperatureAlert: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#dc2626',
  },

  temperatureAlertText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  scheduleDescription: {
  fontSize: 14,
  lineHeight: 20,
  color: '#8b5e3c',
},

timePickerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: 'transparent',
},

timeInput: {
  width: 60,
  height: 55,
  borderWidth: 1,
  borderColor: 'rgba(111, 78, 55, 0.45)',
  borderRadius: 10,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: '600',
  color: '#4b2e1e',
  backgroundColor: 'rgba(255, 255, 255, 0.35)',
},

timeColon: {
  fontSize: 26,
  fontWeight: 'bold',
  color: '#6f4e37',
},

periodButton: {
  height: 55,
  paddingHorizontal: 14,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: 'rgba(111, 78, 55, 0.45)',
  backgroundColor: 'rgba(255, 255, 255, 0.35)',
},

periodButtonSelected: {
  backgroundColor: '#a76a50',
  borderColor: '#a76a50',
},

periodButtonText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#6f4e37',
},

periodButtonTextSelected: {
  color: '#ffffff',
},

selectedTimeContainer: {
  alignItems: 'center',
  paddingVertical: 14,
  borderRadius: 10,
  gap: 4,
  backgroundColor: 'rgba(255, 255, 255, 0.20)',
},

selectedTimeLabel: {
  fontSize: 14,
  color: '#8b5e3c',
},

selectedTime: {
  fontSize: 26,
  fontWeight: 'bold',
  color: '#6f4e37',
},
});
