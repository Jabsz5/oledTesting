import { createContext, ReactNode, useContext, useState } from 'react';
import type { Device } from 'react-native-ble-plx';

type BluetoothContextType = {
  esp32Status: string;
  setEsp32Status: React.Dispatch<React.SetStateAction<string>>;

  bluetoothStatus: string;
  setBluetoothStatus: React.Dispatch<React.SetStateAction<string>>;

  connectedDevice: Device | null;
  setConnectedDevice: React.Dispatch<React.SetStateAction<Device | null>>;
};

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const [esp32Status, setEsp32Status] = useState('Not connected');
  const [bluetoothStatus, setBluetoothStatus] = useState('Idle');
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  return (
    <BluetoothContext.Provider
      value={{
        esp32Status,
        setEsp32Status,
        bluetoothStatus,
        setBluetoothStatus,
        connectedDevice,
        setConnectedDevice,
      }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);

  if (!context) {
    throw new Error('useBluetooth must be used inside BluetoothProvider');
  }

  return context;
}