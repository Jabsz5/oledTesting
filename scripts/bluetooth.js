// scripts/bluetooth.js

import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

// This object controls Bluetooth scanning/connecting
const bleManager = new BleManager();

// These must match the UUIDs in your ESP32 code
export const SMART_CUP_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
export const OLED_TEXT_CHAR_UUID = 'abcd1234-5678-90ab-cdef-1234567890ab';


function normalizeUUID(uuid) {
  return uuid?.toLowerCase();
}

export async function requestBluetoothPermissions() {
  // iOS handles BLE permissions differently
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = Number(Platform.Version);

  // Android 11 and below
  if (apiLevel < 31) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  // Android 12+
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);

  return (
    result['android.permission.BLUETOOTH_SCAN'] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    result['android.permission.BLUETOOTH_CONNECT'] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    result['android.permission.ACCESS_FINE_LOCATION'] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function connectToESP32({
  setBluetoothStatus,
  setEsp32Status,
  setConnectedDevice,
}) {
  const hasPermission = await requestBluetoothPermissions();

  if (!hasPermission) {
    Alert.alert('Permission needed', 'Bluetooth permission was not granted.');
    return;
  }

  const bluetoothState = await bleManager.state();

  if (bluetoothState !== 'PoweredOn') {
    setBluetoothStatus('Bluetooth is off');
    Alert.alert('Bluetooth is off', 'Please turn on Bluetooth and try again.');
    return;
  }

  setBluetoothStatus('Scanning for Smart Cup service...');
  setEsp32Status('Searching for ESP32 service...');

  let deviceFound = false;

  /*
    This scans specifically for devices advertising your custom service UUID.

    This only works if the ESP32 code has:
    advertising->addServiceUUID(SERVICE_UUID);
  */
  bleManager.startDeviceScan(
    [SMART_CUP_SERVICE_UUID],
    null,
    async (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        setBluetoothStatus('Scan error');
        Alert.alert('Scan error', error.message);
        return;
      }

      if (!device) {
        return;
      }

      const deviceName = device.name ?? device.localName ?? 'Unknown device';

      console.log('Found matching service device:', {
        name: deviceName,
        id: device.id,
        serviceUUIDs: device.serviceUUIDs,
      });

      if (deviceFound) {
        return;
      }

      deviceFound = true;

      setBluetoothStatus('Smart Cup service found. Connecting...');
      setEsp32Status(`Found: ${deviceName}`);

      bleManager.stopDeviceScan();

      try {
        const connectedDevice = await device.connect();

        const discoveredDevice =
          await connectedDevice.discoverAllServicesAndCharacteristics();

        console.log('Connected and discovered services.');

        const services = await discoveredDevice.services();

        console.log(
          'Discovered services:',
          services.map((service) => service.uuid)
        );

        const hasSmartCupService = services.some(
          (service) =>
            normalizeUUID(service.uuid) ===
            normalizeUUID(SMART_CUP_SERVICE_UUID)
        );

        if (!hasSmartCupService) {
          setBluetoothStatus('Connected, but service not found');
          setEsp32Status('Smart Cup service missing');

          Alert.alert(
            'Service not found',
            'Connected to ESP32, but the Smart Cup service was not found.'
          );

          return;
        }

        const characteristics =
          await discoveredDevice.characteristicsForService(
            SMART_CUP_SERVICE_UUID
          );

        console.log(
          'Smart Cup characteristics:',
          characteristics.map((characteristic) => ({
            uuid: characteristic.uuid,
            isReadable: characteristic.isReadable,
            isWritableWithResponse: characteristic.isWritableWithResponse,
            isWritableWithoutResponse:
              characteristic.isWritableWithoutResponse,
            isNotifiable: characteristic.isNotifiable,
          }))
        );

        const hasOledTextCharacteristic = characteristics.some(
          (characteristic) =>
            normalizeUUID(characteristic.uuid) ===
            normalizeUUID(OLED_TEXT_CHAR_UUID)
        );

        if (!hasOledTextCharacteristic) {
          setBluetoothStatus('Service found, OLED characteristic missing');
          setEsp32Status('OLED characteristic not found');

          Alert.alert(
            'Characteristic not found',
            'Smart Cup service was found, but the OLED text characteristic was not found.'
          );

          return;
        }

        setConnectedDevice(discoveredDevice);
        setBluetoothStatus('Connected. Service found.');
        setEsp32Status(`Connected to ${deviceName}`);

        Alert.alert(
          'Connected',
          `Connected to ${deviceName} and found the OLED text characteristic.`
        );
      } catch (connectError) {
        console.log('Connection error:', connectError);

        setBluetoothStatus('Connection failed');
        setEsp32Status('Not connected');

        Alert.alert('Connection failed', 'Could not connect to the ESP32.');
      }
    }
  );

  // Stop scanning after 10 seconds if no matching service is found
  setTimeout(() => {
    if (!deviceFound) {
      bleManager.stopDeviceScan();
      setBluetoothStatus('Scan stopped');
      setEsp32Status('Smart Cup service not found');
    }
  }, 10000);
}

// check ESP 32 is connected, check text is not empty, convert text to base64, write to OLED characteristic 
export async function sendTextToOLED({connectedDevice, text, setBluetoothStatus}) {
  if (!connectedDevice) {
    Alert.alert('Not connected', 'Connect to the ESP32 first.');
    return false;
  }

  if (!text || text.trim().length === 0) {
    Alert.alert('Empty message', 'Type something before sending.');
    return false;
  }

  try {
    setBluetoothStatus?.('Sending text to OLED...');

    const textBase64 = Buffer.from(text, 'utf8').toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(
      SMART_CUP_SERVICE_UUID,
      OLED_TEXT_CHAR_UUID,
      textBase64
    );

    console.log('Sent text to OLED:', text);

    setBluetoothStatus?.('Text sent to OLED');

    return true;
  } catch (error) {
    console.log('OLED write error:', error);

    setBluetoothStatus?.('OLED write failed');

    Alert.alert(
      'Write failed',
      'Could not send text to the ESP32 OLED characteristic.'
    );

    return false;
  }
}

export function stopBluetoothScan() {
  bleManager.stopDeviceScan();
}