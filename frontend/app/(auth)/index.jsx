import { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Logo } from "@components/Logo";
import { APP_ROUTES, AUTH_ROUTES } from "@constants/routes";
import { useSession } from "@hooks/useSession";

export default function SplashScreen() {
  const { isLoading, isAuthenticated } = useSession();

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    const timer = setTimeout(() => {
      router.replace(isAuthenticated ? APP_ROUTES.home : AUTH_ROUTES.login);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/home.png")}
        style={styles.bg}
        resizeMode="contain"
      />

      <View style={styles.centeredLogo} pointerEvents="none">
        <Logo size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  centeredLogo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 60,
  },
});
