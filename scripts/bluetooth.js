// scripts/bluetooth.js

import { Buffer } from 'buffer';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

// This object controls Bluetooth scanning/connecting
const bleManager = new BleManager();

// These must match the UUIDs in your ESP32 code
export const SMART_CUP_SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';

export const OLED_TEXT_CHAR_UUID = 'abcd1234-5678-90ab-cdef-1234567890ab';
export const TEMPERATURE_CHAR_UUID = 'abcd1234-5678-90ab-cdef-1234567890ad';
export const CAPACITY_CHAR_UUID = 'abcd1234-5678-90ab-cdef-1234567890ae';
export const PHOTO_CHAR_UUID = "abcd1234-5678-90ab-cdef-1234567890af";

const TEMPERATURE_COMMMAND = 5;
const CAPACITY_COMMAND = 6;
const UPLOAD_PHOTO_COMMAND = 21;
const READY_FOR_PHOTO_ACK = 22;
const LOW_TEMPERATURE_ALERT_F = 60;

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

export async function connectToESP32({setBluetoothStatus, setEsp32Status, setConnectedDevice}) {
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


  const handleDeviceScan = async (error, device) => {
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
        const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
        console.log('Connected and discovered services.');

        // Check MTU for protocol transmission
        console.log('Current BLE MTU:', connectedDevice.mtu);
        console.log('Maximum characteristic value:', connectedDevice.mtu - 3, 'bytes');
        // End
        const services = await discoveredDevice.services();
        console.log('Discovered services:', services.map((service) => service.uuid));

        const hasSmartCupService = services.some((service) => normalizeUUID(service.uuid) === normalizeUUID(SMART_CUP_SERVICE_UUID));

        if (!hasSmartCupService) {
          setBluetoothStatus('Connected, but service not found');
          setEsp32Status('Smart Cup service missing');

          Alert.alert('Service not found', 'Connected to ESP32, but the Smart Cup service was not found.');
          return;
        }

        const characteristics = await discoveredDevice.characteristicsForService(SMART_CUP_SERVICE_UUID);

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

        const hasOledTextCharacteristic = characteristics.some((characteristic) => normalizeUUID(characteristic.uuid) === normalizeUUID(OLED_TEXT_CHAR_UUID));
        const hasTemperatureCharacteristic = characteristics.some((characteristic) => normalizeUUID(characteristic.uuid) === normalizeUUID(TEMPERATURE_CHAR_UUID));
        const hasCapacityCharacteristic = characteristics.some((characteristic) => normalizeUUID(characteristic.uuid) === normalizeUUID(CAPACITY_CHAR_UUID));
        const hasPhotoCharacteristic = characteristics.some((characteristic) => normalizeUUID(characteristic.uuid) === normalizeUUID(PHOTO_CHAR_UUID));

        if (!hasOledTextCharacteristic || !hasTemperatureCharacteristic || !hasCapacityCharacteristic || !hasPhotoCharacteristic) {
          const missingCharacteristics = [];

          if (!hasOledTextCharacteristic) {
            missingCharacteristics.push('OLED text');
          }

          if (!hasTemperatureCharacteristic) {
            missingCharacteristics.push('temperature');
          }

          if (!hasCapacityCharacteristic) {
            missingCharacteristics.push('capacity');
          }

          if (!hasPhotoCharacteristic) {
            missingCharacteristics.push('photo');
          }

          const missingText = missingCharacteristics.join(' and ');
          setBluetoothStatus(`Service found, ${missingText} characteristic missing`);
          setEsp32Status(`${missingText} characteristic not found`);
          Alert.alert('Characteristic not found', `The Smart Cup service was found, but the ${missingText} characteristic was not found.`);
          await discoveredDevice.cancelConnection();
          return;
        }

        setConnectedDevice(discoveredDevice);
        setBluetoothStatus('Connected. Service found.');
        setEsp32Status(`Connected to ${deviceName}`);

        Alert.alert('Connected', `Connected to ${deviceName} and found all characteristic.`);
      } catch (connectError) {
        console.log('Connection error:', connectError);

        setBluetoothStatus('Connection failed');
        setEsp32Status('Not connected');

        Alert.alert('Connection failed', 'Could not connect to the ESP32.');
      }
    }

  bleManager.startDeviceScan([SMART_CUP_SERVICE_UUID], null, handleDeviceScan);

  // Stop scanning after 10 seconds if no matching service is found
  setTimeout(() => {
    if (!deviceFound) {
      bleManager.stopDeviceScan();
      setBluetoothStatus('Scan stopped');
      setEsp32Status('Smart Cup service not found after 10 seconds');
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
    Alert.alert('Write failed', 'Could not send text to the ESP32 OLED characteristic.');

    return false;
  }
}


/**
 * Subscribe to temperature notifications from the ESP32.
 *
 * The ESP32 sends a 32-bit float using:
 *
 * temperatureCharacteristic->setValue(temperatureF);
 * temperatureCharacteristic->notify();
 *
 * Returns a BLE subscription. Call subscription.remove() when finished.
 */
export function monitorTemperature({connectedDevice, setTemperature, setBluetoothStatus,}) {
  if (!connectedDevice) {
    console.log(
      'Cannot monitor temperature: ESP32 is not connected.'
    );

    return null;
  }

  console.log('Starting temperature notification monitor...');

  // These variables remain alive for the lifetime of this BLE subscription.
  let sensorErrorAlertShown = false;
  let lowTemperatureAlertShown = false;

  const handleTemperatureNotification = (error, characteristic) => {
      if (error) {
        console.log('Temperature notification error:', error);
        setBluetoothStatus?.('Failed to receive temperature notification');
        return;
      }

      if (!characteristic?.value) {
        console.log('Temperature notification contained no value.');
        return;
      }

      try {
        const temperatureBuffer = Buffer.from(
          characteristic.value,
          'base64'
        );

        if (temperatureBuffer.length !== 4) {
          console.log(
            'Invalid temperature packet length:',
            temperatureBuffer.length
          );

          return;
        }

        const temperatureF =
          temperatureBuffer.readFloatLE(0);

        if (!Number.isFinite(temperatureF)) {
          console.log(
            'Invalid decoded temperature:',
            temperatureF
          );

          return;
        }

        console.log(
          'Received temperature Base64:',
          characteristic.value
        );

        console.log(
          'Received temperature bytes:',
          Array.from(temperatureBuffer)
        );

        console.log(
          'Decoded temperature:',
          temperatureF
        );

        // Pass the decoded value to the React component.
        setTemperature?.(temperatureF);

        const ERROR_VALUE = -100;

        /*
         * Handle a disconnected or failed sensor first.
         * This prevents -196.6°F from being treated as an
         * ordinary temperature below 60°F.
         */
        if (temperatureF < ERROR_VALUE) {
          setBluetoothStatus?.(
            'Temperature sensor is not connected or responding'
          );

          if (!sensorErrorAlertShown) {
            sensorErrorAlertShown = true;
            Alert.alert('Temperature Sensor Error','The temperature sensor is not connected or not responding!');
          }
          // Do not execute the low-temperature alert below.
          return;
        }

        /*
         * A valid reading was received, so a future sensor
         * disconnection may produce another error alert.
         */
        sensorErrorAlertShown = false;

        setBluetoothStatus?.(
          `Temperature: ${temperatureF.toFixed(1)} °F`
        );

        if (temperatureF < LOW_TEMPERATURE_ALERT_F) {
          if (!lowTemperatureAlertShown) {
            lowTemperatureAlertShown = true;

            console.log(
              'Low-temperature alert received from ESP32.'
            );

            Alert.alert(
              'Temperature Alert',
              `Alert! Temperature is below ${LOW_TEMPERATURE_ALERT_F} degrees!`
            );
          }

          return;
        }

        /*
         * Re-arm the low-temperature alert after the
         * temperature returns to a safe value.
         */
        if (temperatureF >= 65) {
          lowTemperatureAlertShown = false;
        }
      } catch (decodeError) {
        console.log(
          'Temperature decoding error:',
          decodeError
        );

        setBluetoothStatus?.(
          'Could not decode temperature value'
        );
      }
    }

  const subscription = connectedDevice.monitorCharacteristicForService(
                                    SMART_CUP_SERVICE_UUID,
                                    TEMPERATURE_CHAR_UUID,
                                    handleTemperatureNotification
                                    );

  return subscription;
}


const handleCapacityNotification = (error, characteristic) => {
        if (error) {
          console.log('Capacity notification error:',error);
          setBluetoothStatus?.('Failed to receive capacity notification');
          return;
        }

        if (!characteristic?.value) {
          console.log('Capacity notification contained no value.');
          return;
        }

        try {
          /*
           * BLE characteristic values are supplied as Base64.
           * Decode the Base64 value into the original four bytes.
           */
          const capacityBuffer = Buffer.from(characteristic.value, 'base64');

          if (capacityBuffer.length !== 4) {
            console.log('Invalid capacity packet length:', capacityBuffer.length);
            setBluetoothStatus?.('Invalid capacity packet received');
            return;
          }

          /*
           * This assumes the ESP32 created the uint8_t array from
           * the raw bytes of a float, normally using memcpy().
           *
           * ESP32 processors use little-endian byte order.
           */
          const capacityValue = capacityBuffer.readFloatLE(0);

          if (!Number.isFinite(capacityValue)) {
            console.log('Invalid decoded capacity value:', capacityValue);
            setBluetoothStatus?.('Invalid capacity value received');
            return;
          }

          console.log('Received capacity Base64:', characteristic.value);

          console.log('Received capacity bytes:', Array.from(capacityBuffer));

          console.log('Decoded capacity:', capacityValue);

          setCapacity?.(capacityValue);

          setBluetoothStatus?.(`Capacity: ${capacityValue.toFixed(2)}`);
        } catch (decodeError) {
          console.log('Capacity decoding error:', decodeError);
          setBluetoothStatus?.('Could not decode capacity value');
        }
      }
/**
 * Subscribe to capacity notifications from the ESP32.
 *
 * The ESP32 sends the raw four bytes of a 32-bit float through:
 *
 * capacityCharacteristic->setValue(capacityBytes, 4);
 * capacityCharacteristic->notify();
 *
 * Returns a BLE subscription. Call subscription.remove()
 * when the component unmounts.
 */
export function monitorCapacity({connectedDevice, setCapacity, setBluetoothStatus}) {
  if (!connectedDevice) {
    console.log('Cannot monitor capacity: ESP32 is not connected.');
    return null;
  }

  console.log('Starting capacity notification monitor...');

  const subscription =
    connectedDevice.monitorCharacteristicForService(
      SMART_CUP_SERVICE_UUID,
      CAPACITY_CHAR_UUID,
      handleCapacityNotification
    );

  return subscription;
}

export function waitForPhotoReady({
  connectedDevice,
  setBluetoothStatus,
}) {
  return new Promise((resolve, reject) => {

    const subscription =
      connectedDevice.monitorCharacteristicForService(
        SMART_CUP_SERVICE_UUID,
        PHOTO_CHAR_UUID,
        (error, characteristic) => {

          if (error) {
            subscription.remove();
            reject(error);
            return;
          }

          if (!characteristic?.value) {
            return;
          }

          const buffer =
            Buffer.from(
              characteristic.value,
              'base64'
            );

          if (buffer.length !== 1) {
            return;
          }

          const response =
            buffer[0];

          console.log(
            'Photo response received:',
            response
          );

          if (response === READY_FOR_PHOTO_ACK) {
            setBluetoothStatus?.('ESP32 ready for photo upload');
            subscription.remove();
            resolve(true);
          }
        }
      );
  });
}


export async function getTemperature({connectedDevice, setBluetoothStatus}) {
  if (!connectedDevice) {
    Alert.alert('Not connected', 'Connect to the ESP32 first.');
    return false;
  }

  try {
    setBluetoothStatus?.('Requesting temperature...');

    // Create a single unsigned 8-bit value containing 5.
    const controlValue = TEMPERATURE_COMMMAND;
    const controlMessageBase64 = Buffer.from([controlValue]).toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(
      SMART_CUP_SERVICE_UUID,
      TEMPERATURE_CHAR_UUID,
      controlMessageBase64
    );

    console.log('Sent temperature control message:', controlValue);
    console.log('Base64 value:', controlMessageBase64);

    setBluetoothStatus?.('Temperature requested');

    return true;
  } catch (error) {
    console.log('Temperature request error:', error);

    setBluetoothStatus?.('Temperature request failed');

    Alert.alert(
      'Request failed',
      'Could not send the temperature request to the ESP32.'
    );

    return false;
  }
}

export async function getCapacity({connectedDevice, setBluetoothStatus,}) {
  if (!connectedDevice) {
    Alert.alert('Not connected', 'Connect to the ESP32 first.');
    return false;
  }

  try {
    setBluetoothStatus?.('Requesting capacity...');

    /*
     * UPDATE 6 to proper name such as CAPACITY_CHECK_COMMAND
     * no magic numbers!!!!!
    */
    const controlValue = CAPACITY_COMMAND;

    const controlMessageBase64 = Buffer.from([controlValue,]).toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(
      SMART_CUP_SERVICE_UUID,
      CAPACITY_CHAR_UUID,
      controlMessageBase64
    );

    console.log('Sent capacity control message:', controlValue);
    console.log('Capacity command Base64:', controlMessageBase64);
    setBluetoothStatus?.('Capacity requested; waiting for response...');

    return true;
    } catch (error) {
        console.log('Capacity request error:', error);
        setBluetoothStatus?.('Capacity request failed');
        Alert.alert('Request failed', 'Could not send the capacity request to the ESP32.');
        return false;
      }
}

export async function startPhotoUpload({connectedDevice, setBluetoothStatus,}) {
  if (!connectedDevice) {
    Alert.alert('Not connected', 'Connect to the ESP32 first.');
    return false;
  }

  try {
    setBluetoothStatus?.('Starting photo upload...');

    const controlValue = UPLOAD_PHOTO_COMMAND;

    const controlMessageBase64 = Buffer.from([controlValue]).toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(SMART_CUP_SERVICE_UUID, PHOTO_CHAR_UUID, controlMessageBase64);

    console.log('Sent photo upload command:', controlValue);

    console.log('Photo command Base64:', controlMessageBase64);

    return true;

  } catch (error) {
    console.log('Photo command error:', error);

    setBluetoothStatus?.('Failed to start photo upload');

    return false;
  }
}

export function stopBluetoothScan() {
  bleManager.stopDeviceScan();
}