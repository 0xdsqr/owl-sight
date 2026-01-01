import { For } from "solid-js"
import { THEME_COLORS, PROVIDER_COLORS } from "../../constants/colors"

interface Column<T = any> {
  key: string
  label: string
  width?: number
  align?: "left" | "right" | "center"
  render?: (value: any, row: T) => string | number
  color?: (value: any, row: T) => string
}

interface TableProps<T = any> {
  columns: Column<T>[]
  data: T[]
  selectedIndex?: number
  onSelect?: (index: number) => void
  showTotal?: boolean
  totalRow?: Record<string, any>
  alternatingColors?: boolean
}

export function Table<T>(props: TableProps<T>) {
  return (
    <>
      <box
        flexDirection="row"
        backgroundColor={THEME_COLORS.background.tertiary}
        paddingLeft={1}
        paddingRight={1}
        height={1}
      >
        <For each={props.columns}>
          {(col) => (
            <text width={col.width} style={{ fg: THEME_COLORS.text.secondary }}>
              <b>{col.label}</b>
            </text>
          )}
        </For>
      </box>

      <For each={props.data}>
        {(row, idx) => {
          const bgColor = props.alternatingColors
            ? idx() % 2 === 0
              ? THEME_COLORS.background.primary
              : THEME_COLORS.background.secondary
            : "transparent"
          const isSelected = props.selectedIndex === idx()

          return (
            <box
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={isSelected ? THEME_COLORS.background.tertiary : bgColor}
              onClick={() => props.onSelect?.(idx())}
            >
              <For each={props.columns}>
                {(col) => {
                  const value = (row as any)[col.key]
                  const displayValue = col.render ? col.render(value, row) : value
                  const color = col.color ? col.color(value, row) : THEME_COLORS.text.primary

                  return (
                    <text width={col.width} style={{ fg: color }}>
                      {displayValue}
                    </text>
                  )
                }}
              </For>
            </box>
          )
        }}
      </For>

      {props.showTotal && props.totalRow && (
        <box
          flexDirection="row"
          backgroundColor={THEME_COLORS.background.tertiary}
          paddingLeft={1}
          paddingRight={1}
          height={1}
          borderColor={THEME_COLORS.border.default}
          border={["top"]}
        >
          <For each={props.columns}>
            {(col) => {
              const value = props.totalRow![col.key]
              const displayValue = col.render ? col.render(value, props.totalRow!) : value
              const color = col.color ? col.color(value, props.totalRow!) : PROVIDER_COLORS.aws.primary

              return (
                <text width={col.width} style={{ fg: color }}>
                  <b>{displayValue}</b>
                </text>
              )
            }}
          </For>
        </box>
      )}
    </>
  )
}
