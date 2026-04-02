// constants/routes.js
export const AUTH_ROUTES = {
  login: "/(auth)/login",
  forgotPassword: "/(auth)/forgot-password",
  confirmCode: "/(auth)/confirm-code",
  newPassword: "/(auth)/new-password",
  passwordSuccess: "/(auth)/password-success",
  home: "/(auth)/home",
};

export const APP_ROUTES = {
  home: "/(tabs)",
  cultures: "/(tabs)/cultures",
  calendar: "/(tabs)/calendar",
  irrigation: "/(tabs)/irrigation",
  fertilisation: "/(tabs)/fertilisation",
  historique: "/(tabs)/historique",
  adminDashboard: "/(admin)/dashboard",
  adminAddCulture: "/(admin)/addculture",
  adminIrrigations: "/(admin)/irrigations",
  adminUsers: "/(admin)/utilisateurs",
  adminMessages: "/(admin)/messages",
};