import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useSegments, type Href } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from "react-native-safe-area-context";
import { colors, roleTabs, tabBarStyle, type TabItem } from "./theme";
import { useRoleChrome } from "./useRoleChrome";
import type { Role } from "@/lib/types/types";
import { useApp } from "@/providers/AppProvider";

export { colors, roleTabs, tabBarStyle } from "./theme";

export function Screen({
  children,
  edges,
}: PropsWithChildren<{ edges?: Edge[] }>) {
  const { profile } = useApp()
  const segments = useSegments()
  const hasPersistentHeader = !!profile && !segments.some(segment => String(segment) === '(auth)')
  return (
    <SafeAreaView edges={edges ?? (hasPersistentHeader ? ["left", "right", "bottom"] : ["top"])} className="flex-1 bg-surface dark:bg-slate-950">
      {children}
    </SafeAreaView>
  );
}

export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View
      style={cardShadowStyle}
      className={`rounded-2xl border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </View>
  );
}

export const cardShadowStyle = {
  shadowColor: "#1670F8",
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
} as const;

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
  loading,
  className = "",
}: PropsWithChildren<{
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}>) {
  const tone =
    variant === "primary"
      ? "bg-brand"
      : variant === "danger"
        ? "bg-rose-600"
        : "border border-line bg-white dark:border-slate-700 dark:bg-slate-900";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`items-center rounded-xl px-4 py-3.5 ${tone} ${disabled || loading ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? colors.brand : "white"}
        />
      ) : (
        <Text
          className={`font-semibold ${variant === "outline" ? "text-ink dark:text-white" : "text-white"}`}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        className="rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        {...props}
      />
      {error ? (
        <Text className="mt-1 text-xs text-rose-600">{error}</Text>
      ) : null}
    </View>
  );
}

export function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((number) => {
        const full = number <= Math.floor(value);
        const partial =
          !full && number === Math.ceil(value) && value % 1 >= 0.25;
        return (
          <Pressable
            key={number}
            disabled={!onChange}
            onPress={() => onChange?.(number)}
            style={partial ? { opacity: 0.5 } : undefined}
          >
            <Feather
              name="star"
              size={20}
              color={full || partial ? "#F59E0B" : "#CBD5E1"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center px-6 py-14">
      <Feather name="inbox" size={30} color="#94A3B8" />
      <Text className="mt-3 font-semibold text-ink dark:text-white">
        {title}
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">{body}</Text>
    </View>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.brand} />
        <Text className="mt-3 text-sm text-muted">{label}</Text>
      </View>
    </Screen>
  );
}

export function RoundIconButton({
  icon,
  onPress,
  unread = 0,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  unread?: number;
  label: string;
}) {
  const { isDark } = useRoleChrome();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="relative h-11 w-11 items-center justify-center rounded-full border border-line bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <Feather name={icon} size={20} color={isDark ? "#E2E8F0" : colors.ink} />
      {unread ? (
        <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-rose-500 px-1.5 py-0.5">
          <Text className="text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AvatarButton({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) {
  const { isDark } = useApp()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <Feather name="user" size={20} color={isDark ? "#E2E8F0" : colors.ink} />
    </Pressable>
  );
}

export function AppRoleActions({ visible }: { visible: boolean }) {
  const chrome = useRoleChrome()
  const insets = useSafeAreaInsets()
  if (!visible || !chrome.profile) return null

  return (
    <View
      style={{ height: 56 + insets.top, paddingTop: insets.top }}
      className="flex-row items-center justify-end gap-3 border-b border-line bg-surface px-5 dark:border-slate-800 dark:bg-slate-950"
    >
      <RoundIconButton
        icon="bell"
        label="Open notifications"
        unread={chrome.unread}
        onPress={() => router.push(chrome.notificationHref)}
      />
      <RoundIconButton
        icon="user"
        label="Open profile"
        onPress={() => router.push(chrome.profileHref)}
      />
    </View>
  )
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  showBell = false,
  showAvatar = false,
  compact = false,
  trailing,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  showBell?: boolean;
  showAvatar?: boolean;
  compact?: boolean;
  trailing?: ReactNode;
}) {
  const chrome = useRoleChrome();
  return (
    <View
      className={`flex-row justify-between gap-3 ${compact ? "items-center" : "items-start"}`}
    >
      <View
        className={`min-w-0 flex-1 flex-row ${compact ? "items-center" : "items-start"}`}
      >
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            className="mr-2 h-11 w-11 items-center justify-center"
          >
            <Feather
              name="arrow-left"
              size={22}
              color={chrome.isDark ? "#E2E8F0" : colors.ink}
            />
          </Pressable>
        ) : null}
        <View className="min-w-0 flex-1">
          {eyebrow ? (
            <Text className="text-sm text-muted">{eyebrow}</Text>
          ) : null}
          <Text
            className={`${eyebrow ? "mt-1 " : ""}${compact ? "text-[17px] font-bold" : "text-[27px] font-extrabold tracking-tight"} text-ink dark:text-white`}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-sm text-muted dark:text-slate-400">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {trailing ?? (
        <View className="flex-row items-center gap-3">
          {showBell ? (
            <RoundIconButton
              icon="bell"
              label="Open notifications"
              unread={chrome.unread}
              onPress={() => router.push(chrome.notificationHref)}
            />
          ) : null}
          {showAvatar ? (
            <AvatarButton
              label="Open profile"
              onPress={() => router.push(chrome.profileHref)}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  trailing,
  pill = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  trailing?: React.ReactNode;
  pill?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`flex-1 flex-row items-center border border-line bg-white px-3 dark:border-slate-800 dark:bg-slate-900 ${pill ? "rounded-full" : "rounded-xl"}`}
      >
        <Feather name="search" size={18} color={colors.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          className="flex-1 px-3 py-3 text-[15px] text-ink dark:text-white"
        />
      </View>
      {trailing}
    </View>
  );
}

export function FilterButton({
  count = 0,
  onPress,
}: {
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
    >
      <Feather name="sliders" size={15} color={colors.brand} />
      <Text className="text-sm font-bold text-ink dark:text-white">
        Filter{count ? ` (${count})` : ""}
      </Text>
    </Pressable>
  );
}

export function IconFilterButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open filters"
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-xl border border-line bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <Feather name="sliders" size={19} color={colors.brand} />
    </Pressable>
  );
}

export function FilterChips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerStyle={{ gap: 8 }}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className={`rounded-xl px-4 py-2.5 ${active ? "bg-brand" : "border border-line bg-white dark:border-slate-800 dark:bg-slate-900"}`}
          >
            <Text
              className={`text-xs font-bold ${active ? "text-white" : "text-ink dark:text-white"}`}
            >
              {item.label}
              {item.count != null ? ` (${item.count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className={`rounded-xl px-3 py-2 ${active ? "bg-brand" : "border border-line bg-white dark:border-slate-800 dark:bg-slate-900"}`}
          >
            <Text
              className={`text-xs font-semibold ${active ? "text-white" : "text-muted"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ResultMeta({
  count,
  label,
  onSort,
  sortLabel,
}: {
  count: number;
  label: string;
  onSort?: () => void;
  sortLabel?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted">
        {count} {label}
        {count === 1 ? "" : "s"} found
      </Text>
      {onSort ? (
        <Pressable
          onPress={onSort}
          className="flex-row items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <Text className="text-xs font-semibold text-ink dark:text-white">
            {sortLabel ?? "Sort"}
          </Text>
          <Feather name="chevron-down" size={15} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  action = "See all",
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="mt-6 flex-row items-center justify-between">
      <Text className="text-base font-extrabold text-ink dark:text-white">
        {title}
      </Text>
      {onPress ? (
        <Text onPress={onPress} className="text-sm font-bold text-brand">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export function QuickAction({
  icon,
  label,
  detail,
  href,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  href: Href;
}) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={cardShadowStyle}
      className="min-h-[112px] w-[47%] rounded-2xl border border-line bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-brandSoft">
        <Feather name={icon} size={20} color={colors.brand} />
      </View>
      <Text className="mt-3 text-sm font-bold text-ink dark:text-white">
        {label}
      </Text>
      <Text className="mt-1 text-xs leading-4 text-muted">{detail}</Text>
    </Pressable>
  );
}

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="min-w-[30%] flex-1">
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="mt-2 text-xl font-bold text-ink dark:text-white">
        {value}
      </Text>
    </Card>
  );
}

export function FilterSheet({
  open,
  title,
  subtitle,
  onClose,
  onClear,
  onApply,
  children,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onClear?: () => void;
  onApply?: () => void;
}>) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/25">
        <Pressable
          onPress={() => {}}
          className="max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-slate-900"
        >
          <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-slate-200 dark:bg-slate-700" />
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-extrabold text-ink dark:text-white">
                {title}
              </Text>
              {subtitle ? (
                <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
              ) : null}
            </View>
            {onClear ? (
              <Pressable onPress={onClear}>
                <Text className="text-sm font-bold text-brand">Clear all</Text>
              </Pressable>
            ) : null}
          </View>
          {children}
          {onApply ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={onClose}
                className="flex-1 items-center rounded-xl border border-line py-3.5 dark:border-slate-700"
              >
                <Text className="font-bold text-ink dark:text-white">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={onApply}
                className="flex-1 items-center rounded-xl bg-brand py-3.5"
              >
                <Text className="font-bold text-white">Apply filters</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function FilterOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${active ? "border-brand bg-blue-50 dark:bg-blue-950" : "border-line dark:border-slate-700"}`}
    >
      <View
        className={`h-4 w-4 rounded-full border-2 ${active ? "border-brand bg-brand" : "border-slate-300 dark:border-slate-600"}`}
      />
      <Text className="text-sm text-ink dark:text-white">{label}</Text>
    </Pressable>
  );
}

export function AppBottomNav({
  role,
  active,
}: {
  role: Role;
  active?: string;
}) {
  const { isDark } = useRoleChrome(role);
  const insets = useSafeAreaInsets();
  const tabs = roleTabs[role];
  return (
    <View
      style={tabBarStyle(isDark, insets.bottom)}
      className="flex-row items-start border-t border-line bg-white px-1 dark:border-slate-800 dark:bg-slate-900"
    >
      {tabs.map((tab) => {
        const selected = active
          ? tab.name === active || tab.label === active
          : false;
        const color = selected
          ? colors.brand
          : isDark
            ? "#94A3B8"
            : colors.iconMuted;
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.replace(tab.href)}
            className="flex-1 items-center justify-center"
          >
            <Feather name={tab.icon} size={21} color={color} />
            <Text
              className={`mt-1 text-[11px] font-semibold ${selected ? "text-brand" : "text-muted"}`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({
  title,
  body,
  icon = "message-circle",
}: {
  title: string;
  body: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  return (
    <View
      style={cardShadowStyle}
      className="mt-6 min-h-[126px] overflow-hidden rounded-3xl border border-brand bg-brandSoft px-5 py-5 pr-24 dark:border-slate-800 dark:bg-slate-900"
    >
      <Text className="text-lg font-bold leading-6 text-ink dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
        {body}
      </Text>
      <View className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-2xl bg-brand">
        <Feather name={icon} size={26} color="white" />
      </View>
    </View>
  );
}

export function CourseCode({
  code,
  className = "text-xs",
  color = colors.brand,
}: {
  code: string;
  className?: string;
  color?: string;
}) {
  const [department, number] = code.replace(/[-\s]+/, " ").split(" ");
  return (
    <Text style={{ color }} className={`${className} font-extrabold`}>
      <Text>{department}</Text>
      {number ? `\n${number}` : ""}
    </Text>
  );
}

export { type TabItem };
