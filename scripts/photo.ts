import { AlphaType, ColorType, FilterMode, MipmapMode, SkData, Skia } from '@shopify/react-native-skia';

const TARGET_WIDTH = 240;
const TARGET_HEIGHT = 320;

type SendPhotoToOLEDParams = {
  selectedImage: string;
};

export const sendPhotoToOLED = async ({selectedImage,}: SendPhotoToOLEDParams) => {

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
    let image: SkData;
    try {
    console.log('Processing image:', selectedImage);

    // Fetch the encoded image file from the local URI
    const response = await fetch(selectedImage);

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

      rgb565[outputIndex] = (rgb565Pixel >> 8) & 0xFF;
      rgb565[outputIndex + 1] = rgb565Pixel & 0xFF;

      outputIndex += 2;
    }
};