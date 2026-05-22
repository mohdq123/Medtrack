import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

/**
 * Universal Text wrapper that maps fontWeight values to the
 * loaded DM Sans font family variants. DM Sans is a modern,
 * geometric sans-serif that gives the UI a premium, clinical feel.
 */
export function Text(props: TextProps) {
  const { style, ...rest } = props;
  const flatStyle = StyleSheet.flatten(style);

  let fontFamily = 'DMSans-Regular';

  if (flatStyle?.fontWeight) {
    const weight = String(flatStyle.fontWeight);
    if (weight === '900' || weight === '800' || weight === '700' || weight === 'bold') {
      fontFamily = 'DMSans-Bold';
    } else if (weight === '600') {
      fontFamily = 'DMSans-SemiBold';
    } else if (weight === '500') {
      fontFamily = 'DMSans-Medium';
    }
  }

  const cleanStyle = flatStyle ? { ...flatStyle } : {};
  if (!cleanStyle.fontFamily) {
    cleanStyle.fontFamily = fontFamily;
  }

  return <RNText {...rest} style={cleanStyle} />;
}
