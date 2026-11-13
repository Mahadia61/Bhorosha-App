import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useApp } from "@/providers/AppProvider";
import { Card, PageHeader } from "@/components/ui/ui";
import { ProfileActionRow, ProfileIdentityCard } from "@/components/common/ProfileComponents";

export default function AdminProfile() {
  const { profile, updateProfile, signOut } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [saving, setSaving] = useState(false);
  if (!profile || profile.role !== "admin") return null;
  const save = async () => {
    if (!name.trim())
      return Alert.alert(
        "Enter your name",
        "Your profile name cannot be empty.",
      );
    setSaving(true);
    try {
      await updateProfile({ ...profile, name: name.trim() });
      setEditing(false);
    } catch (reason) {
      Alert.alert(
        "Could not save profile",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F5F6F8] dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 112 }}>
        <View className="mt-4">
          <PageHeader
            title={editing ? "Edit Profile" : "Profile"}
            subtitle="Manage your account and preferences."
            onBack={editing ? () => setEditing(false) : undefined}
          />
        </View>
        {editing ? (
          <>
            <Text className="mt-8 text-sm font-semibold text-slate-950 dark:text-white">
              Full name <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <Text className="mt-6 text-sm font-semibold text-slate-950 dark:text-white">
              Email
            </Text>
            <View className="mt-3 rounded-xl bg-slate-100 px-4 py-4 dark:bg-slate-800">
              <Text className="text-base text-slate-400">{profile.email}</Text>
            </View>
            <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Email cannot be changed.
            </Text>
            <Pressable
              disabled={saving}
              onPress={() => {
                void save();
              }}
              className={`mt-10 rounded-xl bg-[#1670F8] py-4 ${saving ? "opacity-60" : ""}`}
            >
              <Text className="text-center text-base font-bold text-white">
                {saving ? "Saving…" : "Save Changes"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ProfileIdentityCard
              name={profile.name}
              email={profile.email}
              role="Administrator"
              photoUrl={profile.photoUrl}
            />
            <Card className="mt-3 p-0">
              <ProfileActionRow
                icon="user"
                title="Edit Profile"
                onPress={() => setEditing(true)}
              />
              <ProfileActionRow
                icon="clock"
                title="Activity Log"
                onPress={() => router.push("/admin-activity")}
              />
              <ProfileActionRow
                icon="settings"
                title="Settings"
                onPress={() => router.push("/admin-settings")}
              />
            </Card>
            <Card className="mt-3 p-0">
              <ProfileActionRow
                icon="log-out"
                title="Sign out"
                danger
                onPress={() => {
                  void signOut().then(() => router.replace("/welcome"));
                }}
              />
            </Card>
          </>
        )}
      </ScrollView>
      <AdminBottomNav />
    </SafeAreaView>
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
    <View className="h-[76px] flex-row items-start border-t border-slate-200 bg-white px-1 pb-4 pt-3 dark:border-slate-800 dark:bg-slate-900">
      {tabs.map((tab) => (
        <Pressable
          key={tab.label}
          onPress={() => router.replace(tab.href as never)}
          className="flex-1 items-center"
        >
          <Feather
            name={tab.icon as keyof typeof Feather.glyphMap}
            size={22}
            color="#6C7890"
          />
          <Text className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
