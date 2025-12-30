import { For } from "solid-js"

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
        backgroundColor="#21262d"
        paddingLeft={1}
        paddingRight={1}
        height={1}
      >
        <For each={props.columns}>
          {(col) => (
            <text width={col.width} style={{ fg: "#8b949e" }}>
              <b>{col.label}</b>
            </text>
          )}
        </For>
      </box>

      <For each={props.data}>
        {(row, idx) => {
          const bgColor = props.alternatingColors
            ? idx() % 2 === 0
              ? "#0d1117"
              : "#161b22"
            : "transparent"
          const isSelected = props.selectedIndex === idx()

          return (
            <box
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={isSelected ? "#21262d" : bgColor}
              onClick={() => props.onSelect?.(idx())}
            >
              <For each={props.columns}>
                {(col) => {
                  const value = (row as any)[col.key]
                  const displayValue = col.render ? col.render(value, row) : value
                  const color = col.color ? col.color(value, row) : "#c9d1d9"

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
          backgroundColor="#21262d"
          paddingLeft={1}
          paddingRight={1}
          height={1}
          borderColor="#30363d"
          border={["top"]}
        >
          <For each={props.columns}>
            {(col) => {
              const value = props.totalRow![col.key]
              const displayValue = col.render ? col.render(value, props.totalRow!) : value
              const color = col.color ? col.color(value, props.totalRow!) : "#ff9900"

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
