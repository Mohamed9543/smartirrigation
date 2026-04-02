import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOptionalDrawer } from "@components/AppDrawer";
import logoImage from "@assets/images/logo.png";

const COLORS = {
  green: "#22c55e",
  greenDark: "#16a34a",
  greenSoft: "#e8f8ed",
  blue: "#3b82f6",
  text: "#0f172a",
  border: "#e2e8f0",
  surface: "#ffffff",
};

export function BrandHeader({
  title,
  right,
  variant = "surface",
  showMenu = false,
  onMenuPress,
}) {
  const drawer = useOptionalDrawer();
  const shouldShowMenu =
    (showMenu || Boolean(drawer)) && !drawer?.persistent;
  const handleMenuPress = onMenuPress || drawer?.toggleDrawer;

  return (
    <View
      style={[
        styles.container,
        variant === "transparent" && styles.containerTransparent,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {shouldShowMenu ? (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              activeOpacity={0.85}
            >
              <Ionicons name="menu" size={20} color={COLORS.greenDark} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.brandWrap}>
            <Image source={logoImage} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brandText} numberOfLines={1}>
              <Text style={styles.brandSmart}>Smart</Text>
              <Text style={styles.brandIrrig}>Irrig</Text>
            </Text>
          </View>
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
  },
  containerTransparent: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  brandLogo: {
    width: 30,
    height: 18,
  },
  right: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    flexShrink: 0,
  },
  menuButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandText: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },
  brandSmart: {
    color: COLORS.green,
  },
  brandIrrig: {
    color: COLORS.blue,
  },
  title: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.text,
  },
});