import { View, Text } from "react-native";
export function BrandWordmark() {
  return (
    <View style={{ position:'absolute', left:0, right:0, top:64, flexDirection:'row', justifyContent:'center', alignItems:'center' }} pointerEvents="none">
      <Text style={{ color:'#4CAF50', fontSize:48, fontWeight:'600', letterSpacing:-0.5 }}>Smart</Text>
      <Text style={{ color:'#2196F3', fontSize:48, fontWeight:'600', letterSpacing:-0.5 }}>Irrig</Text>
    </View>
  );
}
