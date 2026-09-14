import React, { useMemo, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';

type DrawingPath = {
  d: string;
  color: string;
  strokeWidth: number;
};

const COLORS = [
  '#000000',
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
];

const CANVAS_BACKGROUND = '#FFFFFF';

export default function DrawingScreen() {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [isErasing, setIsErasing] = useState(false);

  const brushSize = 6;
  const eraserSize = 24;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;

          const newPath: DrawingPath = {
            d: `M ${locationX} ${locationY}`,
            color: isErasing ? CANVAS_BACKGROUND : selectedColor,
            strokeWidth: isErasing ? eraserSize : brushSize,
          };

          setPaths((previousPaths) => [...previousPaths, newPath]);
        },

        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;

          setPaths((previousPaths) => {
            if (previousPaths.length === 0) {
              return previousPaths;
            }

            const updatedPaths = [...previousPaths];
            const lastPathIndex = updatedPaths.length - 1;
            const lastPath = updatedPaths[lastPathIndex];

            updatedPaths[lastPathIndex] = {
              ...lastPath,
              d: `${lastPath.d} L ${locationX} ${locationY}`,
            };

            return updatedPaths;
          });
        },

        onPanResponderRelease: () => {},
      }),
    [selectedColor, isErasing]
  );

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setIsErasing(false);
  };

  const toggleEraser = () => {
    setIsErasing((previous) => !previous);
  };

  const clearDrawing = () => {
    Alert.alert(
      'Clear Drawing',
      'Are you sure you want to erase the entire drawing?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setPaths([]),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>LED Drawing</Text>

        <Text style={styles.subtitle}>
          Draw something to display on your LED screen.
        </Text>

        {/* Drawing Canvas */}
        <View style={styles.canvas} {...panResponder.panHandlers}>
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
          >
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path.d}
                stroke={path.color}
                strokeWidth={path.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        </View>

        {/* Color Picker */}
        <Text style={styles.sectionTitle}>Colors</Text>

        <View style={styles.colorContainer}>
          {COLORS.map((color) => {
            const selected =
              selectedColor === color && !isErasing;

            return (
              <Pressable
                key={color}
                onPress={() => selectColor(color)}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selected && styles.selectedColor,
                ]}
              />
            );
          })}
        </View>

        {/* Tools */}
        <View style={styles.toolRow}>
          <Pressable
            onPress={toggleEraser}
            style={[
              styles.toolButton,
              isErasing && styles.activeToolButton,
            ]}
          >
            <Text
              style={[
                styles.toolButtonText,
                isErasing && styles.activeToolText,
              ]}
            >
              Eraser
            </Text>
          </Pressable>

          <Pressable
            onPress={clearDrawing}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>
              Clear All
            </Text>
          </Pressable>
        </View>

        {/* Future microcontroller functionality */}
        <Pressable
          onPress={() => {}}
          style={styles.sendButton}
        >
          <Text style={styles.sendButtonText}>
            Send to LED Display
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },

  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginTop: 4,
    marginBottom: 18,
  },

  canvas: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: CANVAS_BACKGROUND,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    overflow: 'hidden',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#222222',
  },

  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },

  selectedColor: {
    borderWidth: 4,
    borderColor: '#333333',
    transform: [{ scale: 1.15 }],
  },

  toolRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  toolButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  activeToolButton: {
    backgroundColor: '#007AFF',
  },

  toolButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },

  activeToolText: {
    color: '#FFFFFF',
  },

  clearButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },

  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  sendButton: {
    marginTop: 16,
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});