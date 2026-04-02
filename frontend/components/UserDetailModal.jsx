import { Modal, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDetailModal({
  user,
  visible,
  onClose,
  onDelete,
  onToggle,
  allCultures = [],
  toggling,
}) {
  if (!user) return null;

  const id = String(user?._id || user?.id || "");

  const userCultures = (allCultures || []).filter(
    (c) => String(c.userId?._id || c.userId) === id
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={{
          width: "80%",
          backgroundColor: "#fff",
          padding: 20,
          borderRadius: 10,
        }}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>
            {user.name}
          </Text>

          <Text>{user.email}</Text>
          <Text>Cultures: {userCultures.length}</Text>

          <TouchableOpacity onPress={() => onToggle(user)}>
            <Text>
              {toggling ? "Loading..." : user.active ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onDelete(user)}>
            <Text style={{ color: "red" }}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}