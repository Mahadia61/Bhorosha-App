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

export default function AdminSettings() {
  const { profile, isDark, setThemePreference, changePassword } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  if (!profile || profile.role !== "admin") return null;
  const savePassword = async () => {
    if (!currentPassword || !nextPassword || nextPassword !== confirmPassword) {
      Alert.alert(
        "Check your passwords",
        "Enter your current password and matching new passwords.",
      );
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (error) {
      Alert.alert(
        "Could not update password",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const selectTheme = async (darkMode: boolean) => {
    if (darkMode === isDark || savingTheme) return;
    setSavingTheme(true);
    try {
      await setThemePreference(darkMode);
    } finally {
      setSavingTheme(false);
    }
  };
  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F6F8] dark:bg-slate-950"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Settings"
          subtitle="Manage your preferences and account."
          onBack={() => router.back()}
          initial={profile.name?.charAt(0)}
        />
        <Section title="Appearance">
          <Text className="pt-4 text-[15px] font-bold text-[#172038] dark:text-white">
            Theme
          </Text>
          <Text className="mt-1 text-xs text-[#64718B] dark:text-slate-400">
            Choose how Bhorosha Admin looks.
          </Text>
          <View className="flex-row gap-3 py-4">
            <ThemeOption
              icon="sun"
              label="Light Mode"
              selected={!isDark}
              disabled={savingTheme}
              onPress={() => {
                void selectTheme(false);
              }}
            />
            <ThemeOption
              icon="moon"
              label="Dark Mode"
              selected={isDark}
              disabled={savingTheme}
              onPress={() => {
                void selectTheme(true);
              }}
            />
          </View>
        </Section>
        <Section title="Security">
          <SettingsRow
            icon="lock"
            title="Change password"
            subtitle="Update your account password."
            onPress={() => setShowPassword((value) => !value)}
          />
          {showPassword ? (
            <View className="border-t border-[#EDF0F5] pt-4">
              <PasswordInput
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <PasswordInput
                label="New password"
                value={nextPassword}
                onChangeText={setNextPassword}
              />
              <PasswordInput
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                disabled={saving}
                onPress={() => {
                  void savePassword();
                }}
                className={`mb-4 items-center rounded-xl py-3 ${saving ? "bg-[#AFCBFF]" : "bg-[#0B6BFF]"}`}
              >
                <Text className="font-bold text-white">
                  {saving ? "Updating…" : "Update password"}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <SettingsRow
            icon="shield"
            title="Login history"
            subtitle="This app does not currently store login-history records."
          />
        </Section>
        <Section title="Legal & Support">
          <SettingsRow
            icon="file-text"
            title="Terms & Conditions"
            subtitle="Use of this platform requires respectful, lawful, and academic use of all services."
          />
          <SettingsRow
            icon="file"
            title="Privacy Policy"
            subtitle="Your account information is used to provide platform features and is not sold to third parties."
          />
          <SettingsRow
            icon="help-circle"
            title="Help & Support"
            subtitle="For help with your account, courses, or moderation, contact your platform administrator."
          />
        </Section>
      </ScrollView>
      <AdminBottomNav />
    </SafeAreaView>
  );
}
function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  initial?: string;
}) {
  return (
    <View className="mb-7 mt-3 flex-row items-start gap-3">
      <Pressable
        onPress={onBack}
        className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <Feather name="arrow-left" size={22} color="#172038" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-[26px] font-extrabold tracking-tight text-[#10182F] dark:text-white">
          {title}
        </Text>
        <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-base font-extrabold text-[#172038] dark:text-white">
        {title}
      </Text>
      <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </View>
    </View>
  );
}
function Icon({
  name,
  bg,
  color,
}: {
  name: string;
  bg: string;
  color: string;
}) {
  return (
    <View
      style={{ backgroundColor: bg }}
      className="h-10 w-10 items-center justify-center rounded-xl"
    >
      <Feather name={name as never} size={20} color={color} />
    </View>
  );
}
function ThemeOption({
  icon,
  label,
  selected,
  disabled,
  onPress,
}: {
  icon: "sun" | "moon";
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 items-center rounded-2xl border p-4 ${selected ? "border-[#0B6BFF] bg-[#EAF2FF] dark:bg-[#102958]" : "border-[#E7EAF0] bg-[#FAFBFD] dark:border-slate-700 dark:bg-slate-800"}`}
    >
      <Feather name={icon} size={21} color={selected ? "#0B6BFF" : "#77849A"} />
      <Text
        className={`mt-2 text-sm font-bold ${selected ? "text-[#0B6BFF]" : "text-[#172038] dark:text-white"}`}
      >
        {label}
      </Text>
      {selected ? (
        <Text className="mt-1 text-[10px] font-semibold text-[#0B6BFF]">
          Selected
        </Text>
      ) : null}
    </Pressable>
  );
}
function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center border-b border-[#EDF0F5] py-4 last:border-b-0 dark:border-slate-800"
    >
      <Icon
        name={icon}
        bg={danger ? "#FFE8EA" : "#E8F0FE"}
        color={danger ? "#F04455" : "#0B6BFF"}
      />
      <View className="ml-3 flex-1">
        <Text
          className={`text-[15px] font-bold ${danger ? "text-[#EF3340]" : "text-[#172038] dark:text-white"}`}
        >
          {title}
        </Text>
        <Text className="mt-1 text-xs leading-4 text-[#64718B] dark:text-slate-400">
          {subtitle}
        </Text>
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={19} color="#77849A" />
      ) : null}
    </Pressable>
  );
}
function PasswordInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-[#172038] dark:text-white">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        placeholder={label}
        placeholderTextColor="#94A0B5"
        className="rounded-xl border border-[#DCE2EB] bg-[#FAFBFD] px-3 py-3 text-sm text-[#172038] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </View>
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
          <Feather name={tab.icon as never} size={22} color="#6C7890" />
          <Text className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
