import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useApp } from "@/providers/AppProvider";

export default function AdminSecurity() {
  const { profile } = useApp();
  if (!profile || profile.role !== "admin") return null;
  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F6F8] dark:bg-slate-950"
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 mt-3 flex-row items-start gap-3">
          <Pressable
            onPress={() => router.back()}
            className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <Feather name="arrow-left" size={22} color="#172038" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[26px] font-extrabold tracking-tight text-[#10182F] dark:text-white">
              Security
            </Text>
            <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">
              Protect your administrator account.
            </Text>
          </View>
        </View>
        <Text className="mb-2 text-base font-extrabold text-[#172038] dark:text-white">
          Account security
        </Text>
        <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <SecurityRow
            icon="lock"
            title="Password"
            body="Change your administrator password from Settings."
            onPress={() => router.push("/admin-settings" as never)}
          />
          <SecurityRow
            icon="shield"
            title="Two-factor authentication"
            body="Configure multi-factor authentication in your Firebase Authentication project."
          />
          <SecurityRow
            icon="clock"
            title="Login history"
            body="This app does not currently store login-history records."
          />
        </View>
        <Text className="mb-2 mt-6 text-base font-extrabold text-[#172038] dark:text-white">
          Access
        </Text>
        <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <SecurityRow
            icon="user-check"
            title="Administrator access"
            body="Your current account has administrator permissions."
          />
        </View>
      </ScrollView>
      <AdminBottomNav />
    </SafeAreaView>
  );
}
function SecurityRow({
  icon,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center border-b border-[#EDF0F5] py-4 last:border-b-0 dark:border-slate-800"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE]">
        <Feather name={icon} size={20} color="#0B6BFF" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-bold text-[#172038] dark:text-white">
          {title}
        </Text>
        <Text className="mt-1 text-xs leading-4 text-[#64718B] dark:text-slate-400">
          {body}
        </Text>
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={19} color="#77849A" />
      ) : null}
    </Pressable>
  );
}
function AdminBottomNav() {
  const tabs = [
    { label: "Overview", icon: "grid", href: "/(admin-tabs)/overview" },
    { label: "Courses", icon: "book-open", href: "/(admin-tabs)/courses" },
    { label: "Members", icon: "users", href: "/(admin-tabs)/members" },
    { label: "Moderation", icon: "shield", href: "/(admin-tabs)/moderation" },
    {
      label: "Analytics",
      icon: "bar-chart-2",
      href: "/(admin-tabs)/analytics",
    },
  ];
  return (
    <View className="flex-row border-t border-[#E7EAF0] bg-white px-2 pb-5 pt-3">
      {tabs.map((tab) => (
        <Pressable
          key={tab.label}
          onPress={() => router.replace(tab.href as never)}
          className="flex-1 items-center"
        >
          <Feather
            name={tab.icon as keyof typeof Feather.glyphMap}
            size={21}
            color="#6C7890"
          />
          <Text className="mt-1 text-[10px] font-semibold text-[#6C7890]">
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
