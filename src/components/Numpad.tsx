import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface NumpadProps {
  onPress: (value: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
}

export default function Numpad({ onPress, onDelete, onSubmit, submitLabel = 'Done' }: NumpadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'DEL'],
  ];

  return (
    <View className="bg-white dark:bg-zinc-950 px-4 py-6">
      <View className="flex-row flex-wrap justify-between">
        {keys.flat().map((keyPad) => (
          <TouchableOpacity
            key={keyPad}
            onPress={() => (keyPad === 'DEL' ? onDelete() : onPress(keyPad))}
            className="w-[30%] aspect-square items-center justify-center mb-4 rounded-full bg-zinc-50 dark:bg-zinc-900 active:bg-zinc-200 dark:active:bg-zinc-800"
          >
            {keyPad === 'DEL' ? (
              <Text className="text-xl font-medium text-red-500">⌫</Text>
            ) : (
              <Text className="text-3xl font-medium text-zinc-900 dark:text-zinc-100">
                {keyPad}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      {onSubmit && (
        <TouchableOpacity
          onPress={onSubmit}
          className="w-full bg-brand-500 py-4 mt-2 rounded-2xl items-center shadow-sm"
        >
          <Text className="text-white font-semibold text-xl">{submitLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
