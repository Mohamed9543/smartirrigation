import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Wraps screen content with safe-area insets (status bar, notches, home indicator).
 * Pass `edges` to limit which sides apply (e.g. omit bottom when a tab bar handles it).
 */
export function SafeScreen({
  children,
  edges = ["top", "left", "right", "bottom"],
  style,
  ...rest
}) {
  return (
    <SafeAreaView style={[{ flex: 1 }, style]} edges={edges} {...rest}>
      {children}
    </SafeAreaView>
  );
}
