// scripts/commands.js

import { sendTextToOLED } from './bluetooth';

export const SMART_CUP_COMMANDS = {
  GET_TEMP: 'GET_TEMP',
  GET_CAPACITY: 'GET_CAPACITY',
  HEATER_ON: 'HEATER_ON',
  HEATER_OFF: 'HEATER_OFF',
};

async function sendSmartCupCommand({connectedDevice, command, setBluetoothStatus, successMessage}) {
    
  const success = await sendTextToOLED({connectedDevice, text: command, setBluetoothStatus,});

  if (success) {
    setBluetoothStatus?.(successMessage);
  }

  return success;
}

export async function checkTemperature({ connectedDevice, setBluetoothStatus }) {
  return await sendSmartCupCommand({
    connectedDevice,
    command: SMART_CUP_COMMANDS.GET_TEMP,
    setBluetoothStatus,
    successMessage: 'Temperature check command sent.',
  });
}

export async function checkCapacity({ connectedDevice, setBluetoothStatus }) {
  return await sendSmartCupCommand({
    connectedDevice,
    command: SMART_CUP_COMMANDS.GET_CAPACITY,
    setBluetoothStatus,
    successMessage: 'Capacity check command sent.',
  });
}

export async function turnHeatingPadOn({ connectedDevice, setBluetoothStatus }) {
  return await sendSmartCupCommand({
    connectedDevice,
    command: SMART_CUP_COMMANDS.HEATER_ON,
    setBluetoothStatus,
    successMessage: 'Heating pad ON command sent.',
  });
}

export async function turnHeatingPadOff({ connectedDevice, setBluetoothStatus }) {
  return await sendSmartCupCommand({
    connectedDevice,
    command: SMART_CUP_COMMANDS.HEATER_OFF,
    setBluetoothStatus,
    successMessage: 'Heating pad OFF command sent.',
  });
}