import * as React from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import type { ChartValue } from '@tanstack/charts'
import type { ChartProps } from '@tanstack/charts/react/core'

export type SpringChartProps<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = Omit<ChartProps<TDatum, TXValue, TYValue>, 'renderer'>

export function SpringChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(props: SpringChartProps<TDatum, TXValue, TYValue>) {
  const renderer = React.useMemo(
    () =>
      motion<TDatum, TXValue, TYValue>({
        transition: { type: 'spring' },
      }),
    [],
  )

  return <Chart {...props} renderer={renderer} />
}
