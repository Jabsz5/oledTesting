import { AlphaType, ColorType, FilterMode, MipmapMode, SkData, Skia, type SkImage, } from '@shopify/react-native-skia';
import { Buffer } from 'buffer';
import { Dispatch, SetStateAction } from 'react';
import type { Device } from 'react-native-ble-plx';
import { PHOTO_CHAR_UUID, SMART_CUP_SERVICE_UUID } from './bluetooth';

const TARGET_WIDTH = 240;
const TARGET_HEIGHT = 320;

/* Packet protocol design:
  | Packet | Format                                                              |
  | ------ | ------------------------------------------------------------------- |
  | Start  | `[0x01, widthHigh, widthLow, heightHigh, heightLow, totalBytes(4)]` |
  | Data   | `[0x02, sequenceHigh, sequenceLow, pixelData...]`                   |
  | End    | `[0x03, totalChunksHigh, totalChunksLow]`                           |
  | Abort  | `[0x04]`                                                            |

  Need to also determine the maximum chunk size that can be sent over BLE. 
  This will depend on the MTU size negotiated between the devices.
  Current MTU is 23 bytes 
*/
const PACKET_START = 0x01;
const PACKET_DATA = 0x02;
const PACKET_END = 0x03;
const PACKET_ABORT = 0x04;

type SendRGB565Params = {
  device: Device;
  serviceUUID: string;
  characteristicUUID: string;
  rgb565: Uint8Array;
};

async function writePacket(device: Device, serviceUUID: string, characteristicUUID: string, packet: Uint8Array): Promise<void> {
  const base64Packet = Buffer.from(packet).toString('base64');

  await device.writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, base64Packet);
}

async function sendRGB565Image({device, serviceUUID, characteristicUUID, rgb565,}: SendRGB565Params): Promise<void> {
  // Requesting 247 gives an ATT payload of up to 244 bytes on Android.
  const updatedDevice = await device.requestMTU(247);

  const characteristicCapacity = updatedDevice.mtu - 3;

  // Data packet contains a three-byte protocol header:
  // packet type + two-byte sequence number.
  let pixelBytesPerPacket = characteristicCapacity - 3;

  // Keep the payload even so that packets contain complete RGB565 pixels.
  pixelBytesPerPacket -= pixelBytesPerPacket % 2;

  if (pixelBytesPerPacket < 2) {
    throw new Error('Negotiated MTU is too small');
  }

  const totalBytes = rgb565.length;
  const totalChunks = Math.ceil(totalBytes / pixelBytesPerPacket);

  if (totalChunks > 0xffff) {
    throw new Error('Too many packets for a 16-bit sequence number');
  }

  // START:
  // type, width, height, total byte count 
  // total byte count needs to use 4 bytes since the image is 240x320 
  // and each pixel is 2 bytes, 
  // so totalBytes = 240 * 320 * 2 = 153600, 
  // which is larger than 65535 (0xffff) - largest 16-bit number.
  const startPacket = new Uint8Array(9);

  startPacket[0] = PACKET_START;

  // 240 (10) = 0x00F0 (16)
  startPacket[1] = (TARGET_WIDTH >> 8) & 0xff;
  startPacket[2] = TARGET_WIDTH & 0xff;

  startPacket[3] = (TARGET_HEIGHT >> 8) & 0xff;
  startPacket[4] = TARGET_HEIGHT & 0xff;

  startPacket[5] = (totalBytes >>> 24) & 0xff;
  startPacket[6] = (totalBytes >>> 16) & 0xff;
  startPacket[7] = (totalBytes >>> 8) & 0xff;
  startPacket[8] = totalBytes & 0xff;

  await writePacket(updatedDevice, serviceUUID, characteristicUUID, startPacket);

  for (let sequence = 0; sequence < totalChunks; sequence++) {
    const start = sequence * pixelBytesPerPacket;
    const end = Math.min(start + pixelBytesPerPacket, totalBytes);
    const pixelChunk = rgb565.subarray(start, end);

    const dataPacket = new Uint8Array(3 + pixelChunk.length);

    dataPacket[0] = PACKET_DATA;
    dataPacket[1] = (sequence >> 8) & 0xff;
    dataPacket[2] = sequence & 0xff;
    dataPacket.set(pixelChunk, 3);

    // Awaiting prevents packets from being submitted simultaneously.
    await writePacket(updatedDevice, serviceUUID, characteristicUUID, dataPacket);

    const progress = ((end / totalBytes) * 100).toFixed(1);
    console.log(`Image transfer: ${progress}%`);
  }

  const endPacket = new Uint8Array([PACKET_END, (totalChunks >> 8) & 0xff, totalChunks & 0xff,]);

  await writePacket(updatedDevice, serviceUUID, characteristicUUID, endPacket);

  console.log('Image transfer complete');
}

type SendPhotoToOLEDParams = {
  selectedImage: string;
  connectedDevice: Device;
  setBluetoothStatus: Dispatch<SetStateAction<string>>;
};

export const sendPhotoToOLED = async ({selectedImage, connectedDevice, setBluetoothStatus,}: SendPhotoToOLEDParams) : Promise<void> => {

  const isConnected = await connectedDevice.isConnected();

    if (!isConnected) {
      setBluetoothStatus('ESP32 disconnected');
      return;
    }

    console.log('Connected device:', connectedDevice.name);
    console.log('Current negotiated MTU:', connectedDevice.mtu);
    console.log('Maximum characteristic value:', connectedDevice.mtu - 3, 'bytes');

    setBluetoothStatus('Processing photo...');

  console.log('Processing image:', selectedImage);

  /*
    PNG / JPEG / etc.
    v
    Decode image
    v
    Raw pixels (RGB888 or RGBA8888)
    v
    Convert each pixel
    v
    RGB565
    v
    BLE
    v
    ESP32
    v
    ST7789V

    1) Decode image with Skia */
    let originalHeight = 0;
    let originalWidth = 0;
    let skiaData: SkData | null = null;
    let image: SkImage;
    try {
    console.log('Processing image:', selectedImage);

    // Fetch the encoded image file from the local URI
    const response = await fetch(selectedImage);
    if (!response.ok) {
      throw new Error(`Could not load image: ${response.status}`);
    }

    // Convert the file into raw encoded bytes
    const arrayBuffer = await response.arrayBuffer();

    // Give the encoded bytes to Skia
    skiaData = Skia.Data.fromBytes(new Uint8Array(arrayBuffer));

    // Decode PNG/JPEG/etc. into an SkImage
    image = Skia.Image.MakeImageFromEncoded(skiaData);

    if (!image) {
      console.log('Failed to decode image');
      return;
    }

    console.log('Image decoded successfully');
    console.log('Width:', image.width());
    console.log('Height:', image.height());
    originalWidth = image.width();
    originalHeight = image.height();

  } catch (error) {
    console.log('Error decoding image:', error);
    setBluetoothStatus('Failed to decode photo');
    return;
  }

  /*
  2. Resize image to ST7789V resolution. 
  Scale proportionally until 240x320 is covered exact
  Center crop excess. Retrieve 76,800 pixels
  */
  // Create our final 240x320 drawing surface
    const surface = Skia.Surface.MakeOffscreen(TARGET_WIDTH, TARGET_HEIGHT);

    if (!surface) {
      console.log('Failed to create Skia surface');
      setBluetoothStatus('Failed to resize photo');
      return;
    }

    const canvas = surface.getCanvas();

    // Determine how much of the ORIGINAL image we should keep.
    const sourceAspect = originalWidth / originalHeight;
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT; // 0.75

    let cropWidth = originalWidth;
    let cropHeight = originalHeight;

    if (sourceAspect > targetAspect) {
      // Original is too wide -> crop left/right
      cropWidth = originalHeight * targetAspect;
    } else if (sourceAspect < targetAspect) {
      // Original is too tall -> crop top/bottom
      cropHeight = originalWidth / targetAspect;
    }

    // Center the crop
    const cropX = (originalWidth - cropWidth) / 2;
    const cropY = (originalHeight - cropHeight) / 2;

    const sourceRect = Skia.XYWHRect(
      cropX,
      cropY,
      cropWidth,
      cropHeight
    );

    const destinationRect = Skia.XYWHRect(
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT
    );

    // Draw cropped portion and scale it to exactly 240x320
    canvas.drawImageRectOptions(image, sourceRect, destinationRect, FilterMode.Linear, MipmapMode.None);

    // Turn the surface into a new SkImage
    const resizedImage = surface.makeImageSnapshot();

    console.log('Center crop successful');
    console.log('Final dimensions:', resizedImage.width(), 'x', resizedImage.height());

    /*
    3) Extract raw pixels and verify */
    const imageInfo = {
      width: 240,
      height: 320,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };

    const pixels = resizedImage.readPixels(0, 0, imageInfo);

    if (!pixels) {
      console.log('Failed to read pixels');
      setBluetoothStatus('Failed to read photo pixels');
      return;
    }

    console.log('Successfully read pixels');
    console.log('Pixel array type:',pixels.constructor.name);
    console.log('Pixel byte count:', pixels.length);

    /*
    4. Now convert to RGB565 */

    // RGB565 uses 2 bytes per pixel. Allocate enough memory for it
    const rgb565 = new Uint8Array(240 * 320 * 2);

    // conversion
    let outputIndex = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // 16-bit value. Remember that this is 2 BYTES LONG!!!!
      // BLE CAN ONLY SEND 1 BYTE AT A TIME
      // Confirm ESP32 protocol before sending this stuff.
      const rgb565Pixel =
        ((r & 0xF8) << 8) |
        ((g & 0xFC) << 3) |
        (b >> 3);

      // store most significant byte first. Will be using big endian
      // Store most significant byte at start of memory space.
      // The proceeding byte gets stored up the memory space.
      rgb565[outputIndex] = (rgb565Pixel >> 8) & 0xFF;
      rgb565[outputIndex + 1] = rgb565Pixel & 0xFF;

      outputIndex += 2;
    }
    setBluetoothStatus('Photo ready to send');

    console.log('RGB565 conversion complete');
    console.log('RGB565 byte count:', rgb565.length);
    /*
    5. Send to BLE characteristic. This is where the ESP32 will pick it up and send it to the ST7789V */
    setBluetoothStatus('Sending photo...');
    await sendRGB565Image({device: connectedDevice, serviceUUID: SMART_CUP_SERVICE_UUID, characteristicUUID: PHOTO_CHAR_UUID, rgb565,});
    setBluetoothStatus('Photo sent successfully');
};