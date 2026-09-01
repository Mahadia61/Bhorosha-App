/// <reference types="nativewind/types" />

import 'react-native'

declare module 'react-native' {
  interface ScrollViewProps {
    contentContainerClassName?: string
  }
  interface FlatListProps<ItemT> {
    contentContainerClassName?: string
  }
}
